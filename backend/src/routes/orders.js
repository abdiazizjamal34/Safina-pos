const router = require('express').Router();
const { PrismaClient, Prisma } = require('@prisma/client');
const { verifyToken, requireWaiter } = require('../middleware/auth');
const { applyPromotions } = require('../utils/promotionEngine');
const { validateUUIDParam } = require('../middleware/validate');
const prisma = new PrismaClient();
const { sendReceiptEmail } = require('../utils/emailService');

router.param('id', validateUUIDParam());

const validateLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return 'At least one order line is required';
  if (lines.some(line => !line || typeof line.productId !== 'string' || !/^[0-9a-f-]{36}$/i.test(line.productId) || !Number.isInteger(line.quantity) || line.quantity <= 0)) {
    return 'Each order line requires a valid productId and positive integer quantity';
  }
  return null;
};

// ==========================================
// CALCULATE ORDER (With KDS Checkmark Preservation)
// ==========================================
const calcOrder = async (lines, couponCode, organizationId, existingLines = []) => {
  let subtotal = 0;
  let preDiscountTaxAmount = 0;
  const processedLines = [];
  
  for (const line of lines) {
    const product = await prisma.product.findFirst({
      where: { id: line.productId, organizationId }
    });
    if (!product) continue;
    
    const lineTotal = parseFloat(product.price) * line.quantity;
    subtotal += lineTotal;
    const productTaxRate = parseFloat(product.tax || 0);
    preDiscountTaxAmount += lineTotal * (productTaxRate / 100);

    // 👇 Preserve KDS status if the product exists and quantity hasn't changed
    const oldLine = existingLines.find(l => l.productId === line.productId);
    let kdsStatus = 'PENDING'; 

    if (oldLine) {
      if (oldLine.quantity === line.quantity) {
        kdsStatus = oldLine.kdsStatus; // Keep the chef's checkmark!
      } else {
        kdsStatus = 'PENDING'; // Quantity changed, chef must make the new amount
      }
    }

    processedLines.push({ 
      productId: line.productId, 
      quantity: line.quantity, 
      unitPrice: parseFloat(product.price), 
      lineTotal, 
      discount: 0, 
      kdsStation: product.kdsStation,
      kdsStatus 
    });
  }

  const { totalDiscount: promoDiscount } = await applyPromotions(lines, subtotal, organizationId);
  let couponDiscount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: couponCode.trim().toUpperCase(), isActive: true, organizationId }
    });
    if (coupon) {
      couponDiscount = coupon.discountType === 'PERCENTAGE' ? (subtotal * parseFloat(coupon.discountValue)) / 100 : parseFloat(coupon.discountValue);
    }
  }
  const discountAmount = promoDiscount + couponDiscount;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  
  let taxAmount = 0;
  if (subtotal > 0) {
    taxAmount = preDiscountTaxAmount * (afterDiscount / subtotal);
  }
  const total = afterDiscount + taxAmount;
  
  return { processedLines, subtotal, taxAmount, discountAmount, total };
};


router.get('/', verifyToken, requireWaiter, async (req, res) => {
  try {
    const { sessionId, status } = req.query;
    const where = { organizationId: req.user.organizationId };
    
    if (sessionId) {
      const sess = await prisma.posSession.findFirst({
        where: { id: sessionId, organizationId: req.user.organizationId }
      });
      if (!sess) return res.status(404).json({ error: 'Session not found' });
      where.sessionId = sessionId;
    }
    if (status) where.status = status;
    
    const orders = await prisma.order.findMany({
      where,
      include: {
        lines: { include: { product: true } },
        customers: true,
        table: true,
        kdsTickets: true,
      payments: {
          include: {
            paymentMethod: true // 👈 THIS IS THE FIX
          }
        },        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});


router.post('/', verifyToken, requireWaiter, async (req, res) => {
  try {
    const {
      tableId, customerId, customerIds, lines, couponCode, sessionId,
      orderType, deliveryLocation, customerNotes,
    } = req.body;

    const lineError = validateLines(lines);
    if (lineError) return res.status(400).json({ error: lineError });

    const allowedOrderTypes = ['TABLE', 'ROOM', 'DELIVERY', 'PICKUP'];
    const finalOrderType = orderType || (tableId ? 'TABLE' : 'PICKUP');

    if (!allowedOrderTypes.includes(finalOrderType)) {
      return res.status(400).json({ error: 'Invalid order type' });
    }

    if (finalOrderType === 'TABLE' && !tableId) {
      return res.status(400).json({ error: 'Table is required for TABLE orders' });
    }

    if ((finalOrderType === 'ROOM' || finalOrderType === 'DELIVERY') && (!deliveryLocation || !deliveryLocation.trim())) {
      return res.status(400).json({ error: 'Delivery location is required for ROOM or DELIVERY orders' });
    }

    if (finalOrderType !== 'TABLE' && tableId) {
      return res.status(400).json({ error: 'Table cannot be assigned to this order type' });
    }

    const session = await prisma.posSession.findFirst({
      where: { id: sessionId, organizationId: req.user.organizationId, status: 'OPEN' }
    });
    if (!session) return res.status(404).json({ error: 'Session not found or access denied' });

    if (tableId) {
      const table = await prisma.table.findFirst({
        where: { id: tableId, organizationId: req.user.organizationId }
      });
      if (!table) return res.status(404).json({ error: 'Table not found or access denied' });

      if (table.currentOrderId) {
        const existingOrder = await prisma.order.findFirst({
          where: { id: table.currentOrderId, organizationId: req.user.organizationId, status: { in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY'] } }
        });
        if (existingOrder) return res.status(409).json({ error: 'This table already has an active order' });
      }
    }

    let customerConnect = [];
    if (Array.isArray(customerIds)) customerConnect = customerIds.map(id => ({ id }));
    else if (Array.isArray(customerId)) customerConnect = customerId.map(id => ({ id }));
    else if (customerId) customerConnect = [{ id: customerId }];

    let selectedCustomers = [];
    if (customerConnect.length > 0) {
      selectedCustomers = await prisma.customer.findMany({
        where: { id: { in: customerConnect.map(c => c.id) }, organizationId: req.user.organizationId },
        select: { id: true, name: true, phone: true }
      });
      if (selectedCustomers.length !== customerConnect.length) {
        return res.status(404).json({ error: 'One or more customers not found' });
      }
    }

    const selectedCustomer = selectedCustomers[0] || null;
    const customerNameSnapshot = selectedCustomer?.name || null;
    const customerPhoneSnapshot = selectedCustomer?.phone || null;

    const organizationId = req.user.organizationId;
    const sequence = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({
        where: { id: organizationId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { nextOrderNumber: true }
      });
      return organization.nextOrderNumber - 1;
    });

    const orderNumber = sequence.toString().padStart(7, '0');
    
    // POST route doesn't have existingLines, so it defaults to []
    const { processedLines, subtotal, taxAmount, discountAmount, total } = await calcOrder(lines, couponCode, req.user.organizationId);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        sessionId,
        tableId: finalOrderType === 'TABLE' ? tableId : null,
        orderType: finalOrderType,
        deliveryLocation: deliveryLocation?.trim() || null,
        customerNameSnapshot,
        customerPhoneSnapshot,
        customerNotes: customerNotes?.trim() || null,
        couponCode: couponCode?.trim() || null,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        createdById: req.user.id,
        waiterId: req.user.id, 
        organizationId: req.user.organizationId,
        lines: { create: processedLines },
        customers: { connect: customerConnect }
      },
      include: {
        lines: { include: { product: true } },
        customers: true,
        table: true,
        payments: true
      }
    });

    if (finalOrderType === 'TABLE' && tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { currentOrderId: order.id }
      });
    }

    res.status(201).json(order);

  } catch (e) {
    console.error('Create order error:', e);
    res.status(500).json({ error: e.message || 'Something went wrong' });
  }
});


router.get('/:id', verifyToken, requireWaiter, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: {
        lines: { include: { product: { include: { category: true } } } },
        customers: true,
        table: true,
        kdsTickets: true,
        payments: true
      }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) {
    console.error('Get order error:', e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


router.put('/:id/send-kitchen', verifyToken, requireWaiter, async (req, res) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft orders can be sent to the kitchen' });
    
    const stations = [...new Set(existing.lines?.map(line => line.kdsStation).filter(Boolean) || [])];
    if (stations.length === 0) {
      const orderLines = await prisma.orderLine.findMany({ where: { orderId: existing.id } });
      stations.push(...new Set(orderLines.map(line => line.kdsStation).filter(Boolean)));
    }
    if (stations.length === 0) return res.status(400).json({ error: 'Order has no kitchen or bar items' });

    const { order, tickets, isNew } = await prisma.$transaction(async tx => {
      const updatedOrder = await tx.order.update({
        where: { id: existing.id },
        data: { status: 'SENT_TO_KITCHEN' },
        include: { lines: { include: { product: true } }, table: true }
      });
      const createdTickets = [];
      let createdAny = false;
      for (const station of stations) {
        const existingTicket = await tx.kdsTicket.findUnique({
          where: { orderId_station: { orderId: updatedOrder.id, station } }
        });
        const ticket = existingTicket || await tx.kdsTicket.create({
          data: { orderId: updatedOrder.id, station, stage: 'TO_COOK' }
        });
        createdTickets.push(ticket);
        createdAny = createdAny || !existingTicket;
      }
      return { order: updatedOrder, tickets: createdTickets, isNew: createdAny };
    });

    const fullTickets = await prisma.kdsTicket.findMany({
      where: { id: { in: tickets.map(ticket => ticket.id) } },
      include: {
        order: { include: { lines: { include: { product: true } }, table: true, customers: true } }
      }
    });

    const io = req.app.get('io');
    const roomName = `kds-room-${req.user.organizationId}`;
    if (isNew) io.to(roomName).emit('new-order', fullTickets);
    else io.to(roomName).emit('ticket-updated', fullTickets);
    
    res.json(order);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Something went wrong' }); }
});


router.put('/:id/cancel', verifyToken, requireWaiter, async (req, res) => {
  try {
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: { kdsTickets: true }
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.status === 'READY') return res.status(400).json({ error: 'Cannot cancel a ready order. Please pay.' });
    
    const order = await prisma.$transaction(async tx => {
      await tx.kdsTicket.deleteMany({ where: { orderId: existing.id } });
      const cancelled = await tx.order.updateMany({
        where: { id: existing.id, organizationId: req.user.organizationId, status: { in: ['DRAFT', 'SENT_TO_KITCHEN'] } },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count !== 1) {
        const error = new Error('Order is no longer available for cancellation');
        error.status = 409;
        throw error;
      }
      const updated = await tx.order.findUnique({ where: { id: existing.id } });
      if (updated.tableId) await tx.table.update({ where: { id: updated.tableId }, data: { currentOrderId: null } });
      return updated;
    });

    const io = req.app.get('io');
    io.to(`kds-room-${req.user.organizationId}`).emit('order-cancelled', { orderId: order.id });
    res.json(order);
  } catch (e) { res.status(e.status || 500).json({ error: e.message || 'Something went wrong' }); }
});


router.put('/:id/pay', verifyToken, requireWaiter, async (req, res) => {
  try {
    const { paymentMethod, paymentReference, payments, onCredit = false, customerIds, customerId } = req.body;
    const organizationId = req.user.organizationId;
    const orderId = req.params.id;

    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: { customers: true, payments: true, loan: true },
    });

    if (!existingOrder) return res.status(404).json({ message: 'Order not found' });
    if (existingOrder.status !== 'READY') return res.status(400).json({ message: `Only READY orders can be paid. Current status: ${existingOrder.status}` });

    let customerConnect = [];
    if (Array.isArray(customerIds)) customerConnect = customerIds.map((id) => ({ id }));
    else if (Array.isArray(customerId)) customerConnect = customerId.map((id) => ({ id }));
    else if (customerId) customerConnect = [{ id: customerId }];

    if (customerConnect.length > 0) {
      const validCustomers = await prisma.customer.findMany({
        where: { id: { in: customerConnect.map((c) => c.id) }, organizationId },
        select: { id: true },
      });
      if (validCustomers.length !== customerConnect.length) return res.status(404).json({ message: 'One or more customers not found' });

      const updatedOrderWithCustomer = await prisma.order.update({
        where: { id: orderId },
        data: { customers: { set: customerConnect } },
        include: { customers: true, payments: true, loan: true },
      });
      existingOrder.customers = updatedOrderWithCustomer.customers;
    }

    const orderTotal = Number(existingOrder.total);
    const alreadyPaid = existingOrder.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingBeforePayment = Number(Math.max(orderTotal - alreadyPaid, 0).toFixed(2));

    if (remainingBeforePayment <= 0.01) return res.status(400).json({ message: 'This order is already fully paid' });

    let paymentRecords = [];
    if (Array.isArray(payments) && payments.length > 0) {
      paymentRecords = payments.map((p) => ({
        method: String(p.method || p.paymentMethod || '').trim(),
        amount: Number(p.amount),
        reference: p.reference || p.paymentReference || paymentReference || null,
      }));
    } else if (paymentMethod) {
      paymentRecords = [{
        method: String(paymentMethod).trim(),
        amount: req.body.amount !== undefined ? Number(req.body.amount) : remainingBeforePayment,
        reference: paymentReference || null,
      }];
    }

    if (paymentRecords.length === 0 && !onCredit) return res.status(400).json({ message: 'Payment method or payments are required' });

    const CREDIT_METHOD_NAMES = new Set(['CREDIT', 'LOAN', 'ON_ACCOUNT']);
    for (const p of paymentRecords) {
      if (!p.method) return res.status(400).json({ message: 'Every payment must have a payment method' });
      const isCredit = CREDIT_METHOD_NAMES.has(String(p.method).trim().toUpperCase());
      if (isCredit) continue; 
      if (!Number.isFinite(p.amount) || p.amount <= 0) return res.status(400).json({ message: 'Every payment amount must be greater than 0' });
    }

    const CREDIT_METHODS = new Set(['CREDIT', 'LOAN', 'ON_ACCOUNT']);
    const isCreditPayment = (m) => CREDIT_METHODS.has(String(m || '').trim().toUpperCase());
    const actualPaymentRecords = paymentRecords.filter(p => !isCreditPayment(p.method));
    const explicitCreditRecords = paymentRecords.filter(p => isCreditPayment(p.method));
    const actualPaymentAmount = actualPaymentRecords.reduce((sum, p) => sum + p.amount, 0);
    const explicitCreditAmount = explicitCreditRecords.reduce((sum, p) => sum + p.amount, 0);

    const totalAttempted = Number((actualPaymentAmount + explicitCreditAmount).toFixed(2));
    if (totalAttempted > remainingBeforePayment + 0.01) return res.status(400).json({ message: `Payment exceeds remaining balance` });

    let automaticCreditAmount = 0;
    if (onCredit) {
      const unpaidAfter = Number((remainingBeforePayment - actualPaymentAmount - explicitCreditAmount).toFixed(2));
      if (unpaidAfter > 0.01) automaticCreditAmount = unpaidAfter;
    }
    const creditAmount = Number((explicitCreditAmount + automaticCreditAmount).toFixed(2));

    if (creditAmount > 0.01 && (!existingOrder.customers || existingOrder.customers.length !== 1)) {
      return res.status(400).json({ message: 'Credit orders must have exactly one customer account' });
    }

    const settlementAmount = Number((actualPaymentAmount + creditAmount).toFixed(2));
    const newPaidAmount = Number((alreadyPaid + settlementAmount).toFixed(2));
    const fullySettled = newPaidAmount >= orderTotal - 0.01;

    const normalMethodNames = [...new Set(actualPaymentRecords.map(p => p.method.trim()))];
    const paymentMethods = normalMethodNames.length > 0 ? await prisma.paymentMethod.findMany({ where: { organizationId, isEnabled: true, name: { in: normalMethodNames } } }) : [];
    const paymentMethodMap = new Map(paymentMethods.map((m) => [m.name.toLowerCase(), m]));

    for (const p of actualPaymentRecords) {
      if (!paymentMethodMap.get(p.method.toLowerCase())) return res.status(400).json({ message: `Payment method "${p.method}" is not available` });
    }

    const result = await prisma.$transaction(async (tx) => {
      const lockedOrder = await tx.order.findFirst({ where: { id: orderId, organizationId }, include: { payments: true, loan: true, customers: true } });
      if (lockedOrder.status !== 'READY') { const e = new Error('Order is no longer ready'); e.status = 409; throw e; }

      const lockedRemaining = Number((Number(lockedOrder.total) - lockedOrder.payments.reduce((s, p) => s + Number(p.amount), 0)).toFixed(2));
      if (settlementAmount > lockedRemaining + 0.01) { const e = new Error(`Payment exceeds balance`); e.status = 409; throw e; }

      const orderUpdateData = {};
      if (fullySettled) {
        orderUpdateData.status = 'PAID';
        const hasCredit = creditAmount > 0.01;
        const hasNormal = actualPaymentRecords.length > 0;
        if (hasCredit && hasNormal) { orderUpdateData.paymentMethod = 'SPLIT'; orderUpdateData.paymentReference = 'Split + Credit'; } 
        else if (hasCredit) { orderUpdateData.paymentMethod = 'CREDIT'; orderUpdateData.paymentReference = 'Customer Account'; } 
        else if (actualPaymentRecords.length === 1) { orderUpdateData.paymentMethod = actualPaymentRecords[0].method; orderUpdateData.paymentReference = actualPaymentRecords[0].reference || null; } 
        else { orderUpdateData.paymentMethod = 'SPLIT'; orderUpdateData.paymentReference = 'Split Payments'; }
      }

      const updatedOrder = await tx.order.update({ where: { id: orderId }, data: orderUpdateData });

      if (actualPaymentRecords.length > 0) {
        await tx.payment.createMany({ data: actualPaymentRecords.map(p => ({ orderId, paymentMethodId: paymentMethodMap.get(p.method.toLowerCase()).id, amount: p.amount, paymentReference: p.reference })) });
      }

      if (creditAmount > 0.01) {
        const existingLoan = await tx.loan.findUnique({ where: { orderId } });
        if (existingLoan) {
          const newRemaining = Number((Number(existingLoan.remainingAmount) + creditAmount).toFixed(2));
          await tx.loan.update({ where: { id: existingLoan.id }, data: { originalAmount: { increment: creditAmount }, remainingAmount: newRemaining, status: newRemaining <= 0.01 ? 'PAID' : 'PARTIALLY_PAID' } });
        } else {
          await tx.loan.create({ data: { customerId: lockedOrder.customers[0].id, orderId, organizationId, originalAmount: creditAmount, paidAmount: 0, remainingAmount: creditAmount, status: 'PENDING' } });
        }
      }

      if (fullySettled) {
        if (lockedOrder.tableId) await tx.table.update({ where: { id: lockedOrder.tableId }, data: { currentOrderId: null } });
        await tx.posSession.update({ where: { id: lockedOrder.sessionId }, data: { lastSaleAmount: lockedOrder.total, totalOrders: { increment: 1 }, totalRevenue: { increment: lockedOrder.total } } });
      }
      return updatedOrder;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const completeOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: { include: { product: true } }, customers: true, table: true, payments: { include: { paymentMethod: true } }, loan: true },
    });

    const finalActualPaid = completeOrder.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const io = req.app.get('io');
    if (io) io.to(`kds-room-${organizationId}`).emit(fullySettled ? 'order-paid' : 'order-payment-updated', { orderId: completeOrder.id, order: completeOrder });

    return res.json({
      message: fullySettled ? 'Order paid successfully' : 'Partial payment recorded',
      order: completeOrder,
      paymentSummary: { orderTotal, alreadyPaid, paymentThisTime: settlementAmount, actualPaymentThisTime: actualPaymentAmount, creditThisTime: creditAmount, totalPaid: finalActualPaid, remaining: Math.max(Number(completeOrder.total) - finalActualPaid, 0).toFixed(2), fullySettled },
    });
  } catch (error) {
    console.error('PAY ORDER ERROR:', error);
    if (error.code === 'P2034') return res.status(409).json({ message: 'Another payment was processed. Try again.' });
    return res.status(error.status || 500).json({ message: error.message || 'Failed to process payment' });
  }
});


// ==========================================
// UPDATE ORDER (PUT /:id)
// ==========================================
// router.put('/:id', verifyToken, requireWaiter, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { tableId, customerId, customerIds, lines, couponCode, orderType, deliveryLocation, customerNotes } = req.body;

//     const lineError = validateLines(lines);
//     if (lineError) return res.status(400).json({ error: lineError });

//     const existingOrder = await prisma.order.findFirst({
//       where: { id, organizationId: req.user.organizationId },
//       include: { lines: true, customers: true }
//     });

//     if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
//     if (['DRAFT', 'SENT_TO_KITCHEN', 'READY'].includes(existingOrder.status) === false) {
//       return res.status(400).json({ error: 'Only draft, kitchen, or ready orders can be updated' });
//     }

//     const allowedOrderTypes = ['TABLE', 'ROOM', 'DELIVERY', 'PICKUP'];
//     const finalOrderType = orderType || existingOrder.orderType || (tableId ? 'TABLE' : 'PICKUP');

//     if (!allowedOrderTypes.includes(finalOrderType)) return res.status(400).json({ error: 'Invalid order type' });
//     if (finalOrderType === 'TABLE' && !tableId) return res.status(400).json({ error: 'Table is required for TABLE orders' });
//     if ((finalOrderType === 'ROOM' || finalOrderType === 'DELIVERY') && (!deliveryLocation || !deliveryLocation.trim())) {
//       return res.status(400).json({ error: 'Delivery location is required' });
//     }

//     if (tableId) {
//       const table = await prisma.table.findFirst({ where: { id: tableId, organizationId: req.user.organizationId } });
//       if (!table) return res.status(404).json({ error: 'Table not found' });
//       if (table.currentOrderId && table.currentOrderId !== id) {
//         const existingTableOrder = await prisma.order.findFirst({
//           where: { id: table.currentOrderId, organizationId: req.user.organizationId, status: { in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY'] } }
//         });
//         if (existingTableOrder) return res.status(409).json({ error: 'This table already has an active order' });
//       }
//     }

//     let customerConnect = [];
//     if (Array.isArray(customerIds)) customerConnect = customerIds.map(id => ({ id }));
//     else if (Array.isArray(customerId)) customerConnect = customerId.map(id => ({ id }));
//     else if (customerId) customerConnect = [{ id: customerId }];

//     let selectedCustomers = [];
//     if (customerConnect.length > 0) {
//       selectedCustomers = await prisma.customer.findMany({
//         where: { id: { in: customerConnect.map(c => c.id) }, organizationId: req.user.organizationId },
//         select: { id: true, name: true, phone: true }
//       });
//       if (selectedCustomers.length !== customerConnect.length) return res.status(404).json({ error: 'One or more customers not found' });
//     }

//     const selectedCustomer = selectedCustomers[0] || null;
//     const customerNameSnapshot = selectedCustomer?.name || null;
//     const customerPhoneSnapshot = selectedCustomer?.phone || null;

//     // 👇 Pass existingOrder.lines to preserve checkmarks
//     const { processedLines, subtotal, taxAmount, discountAmount, total } = await calcOrder(lines, couponCode, req.user.organizationId, existingOrder.lines);

//     const order = await prisma.$transaction(async (tx) => {
//       await tx.orderLine.deleteMany({ where: { orderId: id } });

//       const updated = await tx.order.update({
//         where: { id },
//         data: {
//           tableId: finalOrderType === 'TABLE' ? tableId : null,
//           orderType: finalOrderType,
//           deliveryLocation: deliveryLocation?.trim() || null,
//           customerNameSnapshot,
//           customerPhoneSnapshot,
//           customerNotes: customerNotes?.trim() || null,
//           couponCode: couponCode?.trim() || null,
//           subtotal,
//           taxAmount,
//           discountAmount,
//           total,
//           lines: { create: processedLines },
//           customers: { set: customerConnect }
//         },
//         include: { lines: { include: { product: true } }, customers: true, table: true, payments: true }
//       });

//       const oldTableId = existingOrder.tableId;
//       const newTableId = finalOrderType === 'TABLE' ? tableId : null;

//       if (oldTableId !== newTableId) {
//         if (oldTableId) await tx.table.update({ where: { id: oldTableId }, data: { currentOrderId: null } });
//         if (newTableId) await tx.table.update({ where: { id: newTableId }, data: { currentOrderId: id } });
//       } else if (newTableId) {
//         await tx.table.update({ where: { id: newTableId }, data: { currentOrderId: id } });
//       }

//       if (existingOrder.status === 'SENT_TO_KITCHEN' || existingOrder.status === 'READY') {
//         const oldQty = existingOrder.lines ? existingOrder.lines.reduce((sum, l) => sum + l.quantity, 0) : 0;
//         const newQty = updated.lines ? updated.lines.reduce((sum, l) => sum + l.quantity, 0) : 0;
//         const itemsAdded = newQty > oldQty;

//         const stations = [...new Set(updated.lines.map(line => line.kdsStation).filter(Boolean))];

//         for (const station of stations) {
//           await tx.kdsTicket.upsert({
//             where: { orderId_station: { orderId: updated.id, station } },
//             update: itemsAdded ? { stage: 'TO_COOK' } : {},
//             create: { orderId: updated.id, station, stage: 'TO_COOK' }
//           });
//         }
//       }

//       return updated;
//     });

//     const fullTickets = await prisma.kdsTicket.findMany({
//       where: { orderId: order.id },
//       include: { order: { include: { lines: { include: { product: true } }, table: true, customers: true } } }
//     });

//     if (fullTickets.length > 0) {
//       const io = req.app.get('io');
//       if (io) {
//         io.to(`kds-room-${req.user.organizationId}`).emit('ticket-updated', {
//           source: 'POS',
//           reason: 'ORDER_UPDATED',
//           tickets: fullTickets
//         });
//       }
//     }

//     res.json(order);

//   } catch (e) {
//     console.error('Update order error:', e);
//     res.status(500).json({ error: e.message || 'Something went wrong' });
//   }
// });


router.put('/:id', verifyToken, requireWaiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { tableId, customerId, customerIds, lines, couponCode, orderType, deliveryLocation, customerNotes } = req.body;

    const lineError = validateLines(lines);
    if (lineError) return res.status(400).json({ error: lineError });

    const existingOrder = await prisma.order.findFirst({
      where: { id, organizationId: req.user.organizationId },
      include: { lines: true, customers: true }
    });

    if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
    if (['DRAFT', 'SENT_TO_KITCHEN', 'READY'].includes(existingOrder.status) === false) {
      return res.status(400).json({ error: 'Only draft, kitchen, or ready orders can be updated' });
    }

    const allowedOrderTypes = ['TABLE', 'ROOM', 'DELIVERY', 'PICKUP'];
    const finalOrderType = orderType || existingOrder.orderType || (tableId ? 'TABLE' : 'PICKUP');

    if (!allowedOrderTypes.includes(finalOrderType)) return res.status(400).json({ error: 'Invalid order type' });
    if (finalOrderType === 'TABLE' && !tableId) return res.status(400).json({ error: 'Table is required for TABLE orders' });
    if ((finalOrderType === 'ROOM' || finalOrderType === 'DELIVERY') && (!deliveryLocation || !deliveryLocation.trim())) {
      return res.status(400).json({ error: 'Delivery location is required' });
    }

    if (tableId) {
      const table = await prisma.table.findFirst({ where: { id: tableId, organizationId: req.user.organizationId } });
      if (!table) return res.status(404).json({ error: 'Table not found' });
      if (table.currentOrderId && table.currentOrderId !== id) {
        const existingTableOrder = await prisma.order.findFirst({
          where: { id: table.currentOrderId, organizationId: req.user.organizationId, status: { in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY'] } }
        });
        if (existingTableOrder) return res.status(409).json({ error: 'This table already has an active order' });
      }
    }

    let customerConnect = [];
    if (Array.isArray(customerIds)) customerConnect = customerIds.map(id => ({ id }));
    else if (Array.isArray(customerId)) customerConnect = customerId.map(id => ({ id }));
    else if (customerId) customerConnect = [{ id: customerId }];

    let selectedCustomers = [];
    if (customerConnect.length > 0) {
      selectedCustomers = await prisma.customer.findMany({
        where: { id: { in: customerConnect.map(c => c.id) }, organizationId: req.user.organizationId },
        select: { id: true, name: true, phone: true }
      });
      if (selectedCustomers.length !== customerConnect.length) return res.status(404).json({ error: 'One or more customers not found' });
    }

    const selectedCustomer = selectedCustomers[0] || null;
    const customerNameSnapshot = selectedCustomer?.name || null;
    const customerPhoneSnapshot = selectedCustomer?.phone || null;

    // Pass existingOrder.lines to preserve checkmarks
    const { processedLines, subtotal, taxAmount, discountAmount, total } = await calcOrder(lines, couponCode, req.user.organizationId, existingOrder.lines);

    const order = await prisma.$transaction(async (tx) => {
      await tx.orderLine.deleteMany({ where: { orderId: id } });

      // 👇 1. Calculate if items were added BEFORE updating the order
      const oldQty = existingOrder.lines ? existingOrder.lines.reduce((sum, l) => sum + l.quantity, 0) : 0;
      const newQty = processedLines.reduce((sum, l) => sum + l.quantity, 0);
      const itemsAdded = newQty > oldQty;

      // 👇 2. Prepare update data
      const updateData = {
        tableId: finalOrderType === 'TABLE' ? tableId : null,
        orderType: finalOrderType,
        deliveryLocation: deliveryLocation?.trim() || null,
        customerNameSnapshot,
        customerPhoneSnapshot,
        customerNotes: customerNotes?.trim() || null,
        couponCode: couponCode?.trim() || null,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        lines: { create: processedLines },
        customers: { set: customerConnect }
      };

      // 👇 3. THE FIX: If items were added to a READY order, revert status back to SENT_TO_KITCHEN
      if (itemsAdded && existingOrder.status === 'READY') {
        updateData.status = 'SENT_TO_KITCHEN';
      }

      // 👇 4. Update the order
      const updated = await tx.order.update({
        where: { id },
        data: updateData,
        include: { lines: { include: { product: true } }, customers: true, table: true, payments: true }
      });

      const oldTableId = existingOrder.tableId;
      const newTableId = finalOrderType === 'TABLE' ? tableId : null;

      if (oldTableId !== newTableId) {
        if (oldTableId) await tx.table.update({ where: { id: oldTableId }, data: { currentOrderId: null } });
        if (newTableId) await tx.table.update({ where: { id: newTableId }, data: { currentOrderId: id } });
      } else if (newTableId) {
        await tx.table.update({ where: { id: newTableId }, data: { currentOrderId: id } });
      }

      // 👇 5. Update KDS tickets
      if (existingOrder.status === 'SENT_TO_KITCHEN' || existingOrder.status === 'READY') {
        const stations = [...new Set(updated.lines.map(line => line.kdsStation).filter(Boolean))];

        for (const station of stations) {
          await tx.kdsTicket.upsert({
            where: { orderId_station: { orderId: updated.id, station } },
            update: itemsAdded ? { stage: 'TO_COOK' } : {},
            create: { orderId: updated.id, station, stage: 'TO_COOK' }
          });
        }
      }

      return updated;
    });

    const fullTickets = await prisma.kdsTicket.findMany({
      where: { orderId: order.id },
      include: { order: { include: { lines: { include: { product: true } }, table: true, customers: true } } }
    });

    if (fullTickets.length > 0) {
      const io = req.app.get('io');
      if (io) {
        io.to(`kds-room-${req.user.organizationId}`).emit('ticket-updated', {
          source: 'POS',
          reason: 'ORDER_UPDATED',
          tickets: fullTickets
        });
      }
    }

    res.json(order);

  } catch (e) {
    console.error('Update order error:', e);
    res.status(500).json({ error: e.message || 'Something went wrong' });
  }
});

router.post('/:id/send-receipt', verifyToken, requireWaiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address required' });

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: { lines: { include: { product: true } }, table: true, customers: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await sendReceiptEmail(email, order);
    res.json({ message: `Receipt sent to ${email}` });
  } catch (e) {
    console.error('Email error:', e);
    res.status(500).json({ error: e.message || 'Failed to send email. Check EMAIL_USER and EMAIL_PASS in env variables.' });
  }
});

module.exports = router;