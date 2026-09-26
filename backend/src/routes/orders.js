const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
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

const calcOrder = async (lines, couponCode, organizationId) => {
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
    processedLines.push({ productId: line.productId, quantity: line.quantity, unitPrice: parseFloat(product.price), lineTotal, discount: 0, kdsStation: product.kdsStation });
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
      // Security: verify session belongs to organization
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
        payments: true,
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// order creation and payment routes are commented out for now, as they are being refactored to improve concurrency handling and validation. The new implementation will ensure that orders can be paid atomically, preventing race conditions when multiple users attempt to pay the same order simultaneously.

// router.post('/', verifyToken, requireWaiter, async (req, res) => {
//   try {
//     const { tableId, customerId, customerIds, lines, couponCode, sessionId } = req.body;
//     const lineError = validateLines(lines);
//     if (lineError) return res.status(400).json({ error: lineError });
    
//     // Verify session belongs to organization
//     const session = await prisma.posSession.findFirst({
//       where: { id: sessionId, organizationId: req.user.organizationId, status: 'OPEN' }
//     });
//     if (!session) return res.status(404).json({ error: 'Session not found or access denied' });

//     // Verify table belongs to organization
//     if (tableId) {
//       const table = await prisma.table.findFirst({
//         where: { id: tableId, organizationId: req.user.organizationId }
//       });
//       if (!table) return res.status(404).json({ error: 'Table not found or access denied' });
//     }

//     let customerConnect = [];
//     if (Array.isArray(customerIds)) {
//       customerConnect = customerIds.map(id => ({ id }));
//     } else if (Array.isArray(customerId)) {
//       customerConnect = customerId.map(id => ({ id }));
//     } else if (customerId) {
//       customerConnect = [{ id: customerId }];
//     }

//     // Verify customers exist globally
//     if (customerConnect.length > 0) {
//       const dbCustCount = await prisma.customer.count({
//         where: {
//           id: { in: customerConnect.map(c => c.id) },
//           organizationId: req.user.organizationId
//         }
//       });
//       if (dbCustCount !== customerConnect.length) {
//         return res.status(404).json({ error: 'One or more customers not found' });
//       }
//     }

//     const finalLines = lines;
//     const ts = Date.now().toString().slice(-6);
//     const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
//     const orderNumber = `ORD-${ts}${rand}`;
//     const { processedLines, subtotal, taxAmount, discountAmount, total } = await calcOrder(finalLines, couponCode, req.user.organizationId);
    
//     const order = await prisma.order.create({
//       data: {
//         orderNumber,
//         sessionId,
//         tableId,
//         couponCode,
//         subtotal,
//         taxAmount,
//         discountAmount,
//         total,
//         createdById: req.user.id,
//         organizationId: req.user.organizationId,
//         lines: { create: processedLines },
//         customers: { connect: customerConnect }
//       },
//       include: { lines: { include: { product: true } }, customers: true, table: true, payments: true }
//     });
//     if (tableId) await prisma.table.update({ where: { id: tableId }, data: { currentOrderId: order.id } });
//     res.status(201).json(order);
//   } catch (e) { console.error(e); res.status(500).json({ error: e.message || 'Something went wrong' }); }
// });

router.post('/', verifyToken, requireWaiter, async (req, res) => {
  try {
    const {
      tableId,
      customerId,
      customerIds,
      lines,
      couponCode,
      sessionId,

      // Customer order information
      orderType,
      deliveryLocation,
      customerNotes,
    } = req.body;

    const lineError = validateLines(lines);
    if (lineError) {
      return res.status(400).json({ error: lineError });
    }

    // --------------------------------------------------
    // 1. Validate order type
    // --------------------------------------------------
    const allowedOrderTypes = ['TABLE', 'ROOM', 'DELIVERY', 'PICKUP'];

    const finalOrderType = orderType || (tableId ? 'TABLE' : 'PICKUP');

    if (!allowedOrderTypes.includes(finalOrderType)) {
      return res.status(400).json({
        error: 'Invalid order type'
      });
    }

    // --------------------------------------------------
    // 2. Validate order-type-specific information
    // --------------------------------------------------

    if (finalOrderType === 'TABLE' && !tableId) {
      return res.status(400).json({
        error: 'Table is required for TABLE orders'
      });
    }

    if (
      (finalOrderType === 'ROOM' || finalOrderType === 'DELIVERY') &&
      (!deliveryLocation || !deliveryLocation.trim())
    ) {
      return res.status(400).json({
        error: 'Delivery location is required for ROOM or DELIVERY orders'
      });
    }

    if (finalOrderType !== 'TABLE' && tableId) {
      return res.status(400).json({
        error: 'Table cannot be assigned to this order type'
      });
    }

    // --------------------------------------------------
    // 3. Verify POS session belongs to organization
    // --------------------------------------------------
    const session = await prisma.posSession.findFirst({
      where: {
        id: sessionId,
        organizationId: req.user.organizationId,
        status: 'OPEN'
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }

    // --------------------------------------------------
    // 4. Verify table belongs to organization
    // --------------------------------------------------
    if (tableId) {
      const table = await prisma.table.findFirst({
        where: {
          id: tableId,
          organizationId: req.user.organizationId
        }
      });

      if (!table) {
        return res.status(404).json({
          error: 'Table not found or access denied'
        });
      }

      // Optional: prevent two active orders on same table
      if (table.currentOrderId) {
        const existingOrder = await prisma.order.findFirst({
          where: {
            id: table.currentOrderId,
            organizationId: req.user.organizationId,
            status: {
              in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY']
            }
          }
        });

        if (existingOrder) {
          return res.status(409).json({
            error: 'This table already has an active order'
          });
        }
      }
    }

    // --------------------------------------------------
    // 5. Build customer connection
    // --------------------------------------------------
    let customerConnect = [];

    if (Array.isArray(customerIds)) {
      customerConnect = customerIds.map(id => ({ id }));
    } else if (Array.isArray(customerId)) {
      customerConnect = customerId.map(id => ({ id }));
    } else if (customerId) {
      customerConnect = [{ id: customerId }];
    }

    // --------------------------------------------------
    // 6. Verify customers belong to this organization
    // --------------------------------------------------
    let selectedCustomers = [];

    if (customerConnect.length > 0) {
      selectedCustomers = await prisma.customer.findMany({
        where: {
          id: {
            in: customerConnect.map(c => c.id)
          },
          organizationId: req.user.organizationId
        },
        select: {
          id: true,
          name: true,
          phone: true
        }
      });

      if (selectedCustomers.length !== customerConnect.length) {
        return res.status(404).json({
          error: 'One or more customers not found'
        });
      }
    }

    // --------------------------------------------------
    // 7. Customer snapshot
    // --------------------------------------------------
    // Keep the customer's information on the order even if
    // the customer profile is changed later.

    const selectedCustomer = selectedCustomers[0] || null;

    const customerNameSnapshot = selectedCustomer?.name || null;
    const customerPhoneSnapshot = selectedCustomer?.phone || null;

    // --------------------------------------------------
    // 8. Calculate order
    // --------------------------------------------------
    const finalLines = lines;

    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');

    const orderNumber = `ORD-${ts}${rand}`;

    const {
      processedLines,
      subtotal,
      taxAmount,
      discountAmount,
      total
    } = await calcOrder(
      finalLines,
      couponCode,
      req.user.organizationId
    );

    // --------------------------------------------------
    // 9. Create order
    // --------------------------------------------------
    const order = await prisma.order.create({
      data: {
        orderNumber,

        sessionId,
        tableId: finalOrderType === 'TABLE' ? tableId : null,

        orderType: finalOrderType,

        deliveryLocation:
          deliveryLocation?.trim() || null,

        customerNameSnapshot,

        customerPhoneSnapshot,

        customerNotes:
          customerNotes?.trim() || null,

        couponCode:
          couponCode?.trim() || null,

        subtotal,
        taxAmount,
        discountAmount,
        total,

        createdById: req.user.id,
        waiterId: req.user.id, 


        organizationId: req.user.organizationId,

        lines: {
          create: processedLines
        },

        customers: {
          connect: customerConnect
        }
      },

      include: {
        lines: {
          include: {
            product: true
          }
        },
        customers: true,
        table: true,
        payments: true
      }
    });

    // --------------------------------------------------
    // 10. Assign order to table
    // --------------------------------------------------
    if (finalOrderType === 'TABLE' && tableId) {
      await prisma.table.update({
        where: {
          id: tableId
        },
        data: {
          currentOrderId: order.id
        }
      });
    }

    // --------------------------------------------------
    // 11. Return created order
    // --------------------------------------------------
    res.status(201).json(order);

  } catch (e) {
    console.error('Create order error:', e);

    res.status(500).json({
      error: e.message || 'Something went wrong'
    });
  }
});


// GET /api/orders/:id

// router.get('/:id', verifyToken, requireWaiter, async (req, res) => {
//   try {
//     const order = await prisma.order.findFirst({
//       where: { id: req.params.id, organizationId: req.user.organizationId },
//       include: { lines: { include: { product: { include: { category: true } } } }, customers: true, table: true, kdsTickets: true, payments: true }
//     });
//     if (!order) return res.status(404).json({ error: 'Order not found' });
//     res.json(order);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });


router.get('/:id', verifyToken, requireWaiter, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId
      },
      include: {
        lines: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        customers: true,
        table: true,
        kdsTickets: true,
        payments: true
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.json(order);

  } catch (e) {
    console.error('Get order error:', e);

    res.status(500).json({
      error: 'Something went wrong'
    });
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

    // Fetch the full ticket details to match the GET /kds/tickets schema
    const fullTickets = await prisma.kdsTicket.findMany({
      where: { id: { in: tickets.map(ticket => ticket.id) } },
      include: {
        order: {
          include: {
            lines: {
              include: {
                product: true
              }
            },
            table: true,
            customers: true
          }
        }
      }
    });

    const io = req.app.get('io');
    const roomName = `kds-room-${req.user.organizationId}`;
    if (isNew) {
      io.to(roomName).emit('new-order', fullTickets);
    } else {
      io.to(roomName).emit('ticket-updated', fullTickets);
    }
    res.json(order);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Something went wrong' }); }
});

// router.put('/:id/pay', verifyToken, requireWaiter, async (req, res) => {
//   try {
//     const { paymentMethod, paymentReference, payments } = req.body;
//     if (!paymentMethod && (!Array.isArray(payments) || payments.length === 0)) {
//       return res.status(400).json({ error: 'Payment method or payments array required' });
//     }

//     const existingOrder = await prisma.order.findFirst({
//       where: { id: req.params.id, organizationId: req.user.organizationId }
//     });
//     if (!existingOrder) return res.status(404).json({ error: 'Order not found' });
//     if (existingOrder.status !== 'READY') return res.status(400).json({ error: 'Only ready orders can be paid' });

//     let paymentRecords = [];
//     if (Array.isArray(payments) && payments.length > 0) {
//       paymentRecords = payments.map(p => ({
//         amount: parseFloat(p.amount),
//         method: p.method,
//         paymentReference: p.reference || null
//       }));
//     } else {
//       paymentRecords = [{
//         amount: existingOrder.total,
//         method: paymentMethod,
//         paymentReference
//       }];
//     }

//     if (paymentRecords.some(payment => !Number.isFinite(payment.amount) || payment.amount <= 0 || !payment.method)) {
//       return res.status(400).json({ error: 'Payments must have a valid method and positive amount' });
//     }
//     const totalPaid = paymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
//     if (Math.abs(totalPaid - Number(existingOrder.total)) > 0.01) {
//       return res.status(400).json({ error: 'Payment total must equal order total' });
//     }
//     const methods = await prisma.paymentMethod.findMany({
//       where: { organizationId: req.user.organizationId, name: { in: paymentRecords.map(payment => payment.method) }, isEnabled: true }
//     });
//     const methodByName = new Map(methods.map(method => [method.name, method]));
//     if (paymentRecords.some(payment => !methodByName.has(payment.method))) {
//       return res.status(400).json({ error: 'One or more payment methods are unavailable' });
//     }

//     const order = await prisma.$transaction(async tx => {
//       const claimed = await tx.order.updateMany({
//         where: { id: req.params.id, organizationId: req.user.organizationId, status: 'READY' },
//         data: {
//           status: 'PAID',
//           paymentMethod: paymentMethod || 'SPLIT',
//           paymentReference: paymentReference || 'Split Payments',
//         },
//       });
//       if (claimed.count !== 1) {
//         const error = new Error('Order is no longer ready for payment');
//         error.status = 409;
//         throw error;
//       }

//       const updated = await tx.order.update({
//         where: { id: req.params.id },
//         data: {
//           payments: { create: paymentRecords.map(payment => ({ amount: payment.amount, paymentMethodId: methodByName.get(payment.method).id, paymentReference: payment.paymentReference })) }
//         },
//         include: { lines: { include: { product: true } }, customers: true, table: true, payments: true }
//       });
//       if (updated.tableId) await tx.table.update({ where: { id: updated.tableId }, data: { currentOrderId: null } });
//       await tx.posSession.update({ where: { id: updated.sessionId }, data: { lastSaleAmount: updated.total, totalOrders: { increment: 1 }, totalRevenue: { increment: updated.total } } });
//       return updated;
//     });
    
//     const io = req.app.get('io');
//     io.to(`kds-room-${req.user.organizationId}`).emit('order-paid', { orderId: order.id });
//     res.json(order);
//   } catch (e) {
//     console.error(e);
//     res.status(e.status || 500).json({ error: e.message || 'Something went wrong' });
//   }
// });

router.put('/:id/cancel', verifyToken, requireWaiter, async (req, res) => {
  try {

    
    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: { kdsTickets: true }
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (existing.status === 'READY') {
      return res.status(400).json({ error: 'Cannot cancel an order that is ready from the kitchen. Please complete the payment.' });
    }
    
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
   console.log('🔥 PAYMENT ROUTE HIT:', req.params.id);
  try {
    const { paymentMethod, paymentReference, payments } = req.body;

    console.log('========== PAYMENT REQUEST ==========');
    console.log('BODY:', req.body);
    console.log('USER:', {
      id: req.user?.id,
      role: req.user?.role,
      organizationId: req.user?.organizationId,
    });
    console.log('ORDER ID:', req.params.id);
    console.log('=====================================');

    // --------------------------------------------------
    // 1. Validate payment input
    // --------------------------------------------------
    if (
      !paymentMethod &&
      (!Array.isArray(payments) || payments.length === 0)
    ) {
      return res.status(400).json({
        error: 'Payment method or payments array required',
      });
    }

    // --------------------------------------------------
    // 2. Find the order inside user's organization
    // --------------------------------------------------
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({
        error: 'Order not found',
      });
    }

    // --------------------------------------------------
// PAYMENT DEBUG
// --------------------------------------------------
console.log('========== BACKEND PAYMENT DEBUG ==========');
console.log('BODY:', req.body);
console.log('PAYMENT METHOD:', paymentMethod);
console.log('PAYMENTS:', payments);
console.log('ORDER TOTAL:', existingOrder.total);
console.log('ORDER STATUS:', existingOrder.status);
console.log('ORDER TOTAL NUMBER:', Number(existingOrder.total));
console.log(
  'IS FINITE:',
  Number.isFinite(Number(existingOrder.total))
);
console.log('===========================================');
    // --------------------------------------------------
    // 3. Only READY orders can be paid
    // --------------------------------------------------
    if (existingOrder.status !== 'READY') {
      return res.status(400).json({
        error: `Only ready orders can be paid. Current status: ${existingOrder.status}`,
      });
    }

    // --------------------------------------------------
    // 4. Build normalized payment records
    // --------------------------------------------------
    let paymentRecords = [];

    if (Array.isArray(payments) && payments.length > 0) {
      paymentRecords = payments.map((payment) => ({
        amount: Number(payment.amount),
        method:
          typeof payment.method === 'string'
            ? payment.method.trim()
            : payment.method,
        paymentReference:
          payment.reference ||
          payment.paymentReference ||
          null,
      }));
    } else {
      // Single payment
      paymentRecords = [
        {
          amount: Number(existingOrder.total),
          method:
            typeof paymentMethod === 'string'
              ? paymentMethod.trim()
              : paymentMethod,
          paymentReference: paymentReference || null,
        },
      ];
    }

    console.log('NORMALIZED PAYMENT RECORDS:', paymentRecords);

    // --------------------------------------------------
    // 5. Validate each payment
    // --------------------------------------------------
    const invalidPayment = paymentRecords.find(
      (payment) =>
        !Number.isFinite(payment.amount) ||
        payment.amount <= 0 ||
        !payment.method ||
        typeof payment.method !== 'string'
    );

    if (invalidPayment) {
      console.error('INVALID PAYMENT:', invalidPayment);

      return res.status(400).json({
        error: 'Payments must have a valid method and positive amount',
        details: {
          amount: invalidPayment.amount,
          method: invalidPayment.method,
        },
      });
    }

    // --------------------------------------------------
    // 6. Validate payment total
    // --------------------------------------------------
    const orderTotal = Number(existingOrder.total);

    const totalPaid = paymentRecords.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    console.log('ORDER TOTAL:', orderTotal);
    console.log('TOTAL PAID:', totalPaid);

    if (!Number.isFinite(orderTotal)) {
      return res.status(500).json({
        error: 'Invalid order total',
      });
    }

    if (Math.abs(totalPaid - orderTotal) > 0.01) {
      return res.status(400).json({
        error: 'Payment total must equal order total',
        orderTotal,
        totalPaid,
      });
    }

    // --------------------------------------------------
    // 7. Find enabled payment methods
    // --------------------------------------------------
    const paymentMethodNames = [
      ...new Set(
        paymentRecords.map((payment) => payment.method)
      ),
    ];

    console.log(
      'PAYMENT METHOD NAMES:',
      paymentMethodNames
    );

    const methods = await prisma.paymentMethod.findMany({
      where: {
        organizationId: req.user.organizationId,
        name: {
          in: paymentMethodNames,
        },
        isEnabled: true,
      },
    });

    console.log('AVAILABLE PAYMENT METHODS:', methods);

    const methodByName = new Map(
      methods.map((method) => [
        method.name,
        method,
      ])
    );

    // --------------------------------------------------
    // 8. Check that all payment methods exist
    // --------------------------------------------------
    const unavailableMethods = paymentRecords
      .filter(
        (payment) =>
          !methodByName.has(payment.method)
      )
      .map((payment) => payment.method);

    if (unavailableMethods.length > 0) {
      return res.status(400).json({
        error: 'One or more payment methods are unavailable',
        unavailableMethods,
        availableMethods: methods.map(
          (method) => method.name
        ),
      });
    }

    // --------------------------------------------------
    // 9. Atomically mark order as PAID
    // --------------------------------------------------
    const order = await prisma.$transaction(
      async (tx) => {
        // Claim the order first.
        // This prevents two users from paying the same
        // order at the same time.
        const claimed = await tx.order.updateMany({
          where: {
            id: req.params.id,
            organizationId: req.user.organizationId,
            status: 'READY',
          },
          data: {
            status: 'PAID',
            paymentMethod:
              paymentMethod || 'SPLIT',
            paymentReference:
              paymentReference ||
              'Split Payments',
          },
        });

        if (claimed.count !== 1) {
          const error = new Error(
            'Order is no longer ready for payment'
          );

          error.status = 409;

          throw error;
        }

        // --------------------------------------------------
        // Create payment records
        // --------------------------------------------------
        const updated = await tx.order.update({
          where: {
            id: req.params.id,
          },

          data: {
            payments: {
              create: paymentRecords.map(
                (payment) => ({
                  amount: payment.amount,

                  paymentMethodId:
                    methodByName.get(
                      payment.method
                    ).id,

                  paymentReference:
                    payment.paymentReference,
                })
              ),
            },
          },

          include: {
            lines: {
              include: {
                product: true,
              },
            },

            customers: true,

            table: true,

            payments: true,
          },
        });

        // --------------------------------------------------
        // Free the restaurant table
        // --------------------------------------------------
        if (updated.tableId) {
          await tx.table.update({
            where: {
              id: updated.tableId,
            },

            data: {
              currentOrderId: null,
            },
          });
        }

        // --------------------------------------------------
        // Update POS session statistics
        // --------------------------------------------------
        await tx.posSession.update({
          where: {
            id: updated.sessionId,
          },

          data: {
            lastSaleAmount: updated.total,

            totalOrders: {
              increment: 1,
            },

            totalRevenue: {
              increment: updated.total,
            },
          },
        });

        return updated;
      }
    );

    // --------------------------------------------------
    // 10. Notify connected KDS clients
    // --------------------------------------------------
    const io = req.app.get('io');

    if (io) {
      io.to(
        `kds-room-${req.user.organizationId}`
      ).emit('order-paid', {
        orderId: order.id,
      });
    }

    // --------------------------------------------------
    // 11. Return successful payment
    // --------------------------------------------------
    return res.json(order);

  } catch (error) {
    console.error(
      'PAYMENT ERROR:',
      error
    );

    return res.status(
      error.status || 500
    ).json({
      error:
        error.message ||
        'Something went wrong while processing payment',
    });
  }
});


// order update route
// router.put('/:id', verifyToken, requireWaiter, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { tableId, customerId, customerIds, lines, couponCode } = req.body;
//     const lineError = validateLines(lines);
//     if (lineError) return res.status(400).json({ error: lineError });
    
//     const existingOrder = await prisma.order.findFirst({
//       where: { id, organizationId: req.user.organizationId },
//       include: { lines: true }

      
//     });
//     if (!existingOrder) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
//     if (existingOrder.status !== 'DRAFT' && existingOrder.status !== 'SENT_TO_KITCHEN' && existingOrder.status !== 'READY') {
//       return res.status(400).json({ error: 'Only draft, kitchen, or ready orders can be updated' });
//     }

//     // Verify table belongs to organization
//     if (tableId) {
//       const table = await prisma.table.findFirst({
//         where: { id: tableId, organizationId: req.user.organizationId }
//       });
//       if (!table) return res.status(404).json({ error: 'Table not found or access denied' });
//     }

//     let customerConnect = [];
//     if (Array.isArray(customerIds)) {
//       customerConnect = customerIds.map(id => ({ id }));
//     } else if (Array.isArray(customerId)) {
//       customerConnect = customerId.map(id => ({ id }));
//     } else if (customerId) {
//       customerConnect = [{ id: customerId }];
//     }

//     // Verify customers exist globally
//     if (customerConnect.length > 0) {
//       const dbCustCount = await prisma.customer.count({
//         where: {
//           id: { in: customerConnect.map(c => c.id) },
//           organizationId: req.user.organizationId
//         }
//       });
//       if (dbCustCount !== customerConnect.length) {
//         return res.status(404).json({ error: 'One or more customers not found' });
//       }
//     }

//     const finalLines = lines;
//     const { processedLines, subtotal, taxAmount, discountAmount, total } = await calcOrder(finalLines, couponCode, req.user.organizationId);

//     const order = await prisma.$transaction(async (tx) => {
//       // Delete old lines
//       await tx.orderLine.deleteMany({ where: { orderId: id } });

//       // Update order
//       const updated = await tx.order.update({
//         where: { id },
//         data: {
//           tableId: tableId || null,
//           couponCode: couponCode || null,
//           subtotal,
//           taxAmount,
//           discountAmount,
//           total,
//           lines: { create: processedLines },
//           customers: { set: customerConnect }
//         },
//         include: { lines: { include: { product: true } }, customers: true, table: true, payments: true }
//       });

//       // Update table currentOrderId
//       const oldTableId = existingOrder.tableId;
//       if (oldTableId !== tableId) {
//         if (oldTableId) {
//           await tx.table.update({ where: { id: oldTableId }, data: { currentOrderId: null } });
//         }
//         if (tableId) {
//           await tx.table.update({ where: { id: tableId }, data: { currentOrderId: id } });
//         }
//       } else if (tableId) {
//         await tx.table.update({ where: { id: tableId }, data: { currentOrderId: id } });
//       }

//       return updated;
//     });

//     // Check if there is an active KDS ticket for this order to notify the KDS room in real-time
//     const tickets = await prisma.kdsTicket.findMany({ where: { orderId: order.id } });
//     if (tickets.length > 0) {
//       const fullTickets = await prisma.kdsTicket.findMany({
//         where: { id: { in: tickets.map(ticket => ticket.id) } },
//         include: {
//           order: {
//             include: {
//               lines: {
//                 include: {
//                   product: true
//                 }
//               },
//               table: true,
//               customers: true
//             }
//           }
//         }
//       });
//       const io = req.app.get('io');
//       io.to(`kds-room-${req.user.organizationId}`).emit('ticket-updated', fullTickets);
//     }

//     res.json(order);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: e.message || 'Something went wrong' });
//   }
// });

router.put('/:id', verifyToken, requireWaiter, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      tableId,
      customerId,
      customerIds,
      lines,
      couponCode,

      // Customer order information
      orderType,
      deliveryLocation,
      customerNotes
    } = req.body;

    // --------------------------------------------------
    // 1. Validate order lines
    // --------------------------------------------------
    const lineError = validateLines(lines);

    if (lineError) {
      return res.status(400).json({
        error: lineError
      });
    }

    // --------------------------------------------------
    // 2. Find existing order
    // --------------------------------------------------
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      include: {
        lines: true,
        customers: true
      }
    });

    if (!existingOrder) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // --------------------------------------------------
    // 3. Check order status
    // --------------------------------------------------
    if (
      existingOrder.status !== 'DRAFT' &&
      existingOrder.status !== 'SENT_TO_KITCHEN' &&
      existingOrder.status !== 'READY'
    ) {
      return res.status(400).json({
        error: 'Only draft, kitchen, or ready orders can be updated'
      });
    }

    // --------------------------------------------------
    // 4. Validate order type
    // --------------------------------------------------
    const allowedOrderTypes = [
      'TABLE',
      'ROOM',
      'DELIVERY',
      'PICKUP'
    ];

    const finalOrderType =
      orderType ||
      existingOrder.orderType ||
      (tableId ? 'TABLE' : 'PICKUP');

    if (!allowedOrderTypes.includes(finalOrderType)) {
      return res.status(400).json({
        error: 'Invalid order type'
      });
    }

    // --------------------------------------------------
    // 5. Validate order-type-specific information
    // --------------------------------------------------

    if (finalOrderType === 'TABLE' && !tableId) {
      return res.status(400).json({
        error: 'Table is required for TABLE orders'
      });
    }

    if (
      (finalOrderType === 'ROOM' ||
        finalOrderType === 'DELIVERY') &&
      (!deliveryLocation || !deliveryLocation.trim())
    ) {
      return res.status(400).json({
        error: 'Delivery location is required for ROOM or DELIVERY orders'
      });
    }

    if (finalOrderType !== 'TABLE' && tableId) {
      return res.status(400).json({
        error: 'Table cannot be assigned to this order type'
      });
    }

    // --------------------------------------------------
    // 6. Verify table belongs to organization
    // --------------------------------------------------
    if (tableId) {
      const table = await prisma.table.findFirst({
        where: {
          id: tableId,
          organizationId: req.user.organizationId
        }
      });

      if (!table) {
        return res.status(404).json({
          error: 'Table not found or access denied'
        });
      }

      // Prevent assigning another active order
      // to the same table.
      if (
        table.currentOrderId &&
        table.currentOrderId !== id
      ) {
        const existingTableOrder = await prisma.order.findFirst({
          where: {
            id: table.currentOrderId,
            organizationId: req.user.organizationId,
            status: {
              in: [
                'DRAFT',
                'SENT_TO_KITCHEN',
                'READY'
              ]
            }
          }
        });

        if (existingTableOrder) {
          return res.status(409).json({
            error: 'This table already has an active order'
          });
        }
      }
    }

    // --------------------------------------------------
    // 7. Build customer connection
    // --------------------------------------------------
    let customerConnect = [];

    if (Array.isArray(customerIds)) {
      customerConnect = customerIds.map(id => ({
        id
      }));
    } else if (Array.isArray(customerId)) {
      customerConnect = customerId.map(id => ({
        id
      }));
    } else if (customerId) {
      customerConnect = [
        {
          id: customerId
        }
      ];
    }

    // --------------------------------------------------
    // 8. Verify customers belong to organization
    // --------------------------------------------------
    let selectedCustomers = [];

    if (customerConnect.length > 0) {
      selectedCustomers = await prisma.customer.findMany({
        where: {
          id: {
            in: customerConnect.map(c => c.id)
          },
          organizationId: req.user.organizationId
        },
        select: {
          id: true,
          name: true,
          phone: true
        }
      });

      if (
        selectedCustomers.length !==
        customerConnect.length
      ) {
        return res.status(404).json({
          error: 'One or more customers not found'
        });
      }
    }

    // --------------------------------------------------
    // 9. Customer snapshot
    // --------------------------------------------------
    const selectedCustomer =
      selectedCustomers[0] || null;

    const customerNameSnapshot =
      selectedCustomer?.name || null;

    const customerPhoneSnapshot =
      selectedCustomer?.phone || null;

    // --------------------------------------------------
    // 10. Calculate updated order
    // --------------------------------------------------
    const finalLines = lines;

    const {
      processedLines,
      subtotal,
      taxAmount,
      discountAmount,
      total
    } = await calcOrder(
      finalLines,
      couponCode,
      req.user.organizationId
    );

    // --------------------------------------------------
    // 11. Update order transactionally
    // --------------------------------------------------
    const order = await prisma.$transaction(
      async (tx) => {

        // Delete old lines
        await tx.orderLine.deleteMany({
          where: {
            orderId: id
          }
        });

        // Update order
        const updated = await tx.order.update({
          where: {
            id
          },
          data: {
            tableId:
              finalOrderType === 'TABLE'
                ? tableId
                : null,

            orderType: finalOrderType,

            deliveryLocation:
              deliveryLocation?.trim() || null,

            customerNameSnapshot,

            customerPhoneSnapshot,

            customerNotes:
              customerNotes?.trim() || null,

            couponCode:
              couponCode?.trim() || null,

            subtotal,
            taxAmount,
            discountAmount,
            total,

            lines: {
              create: processedLines
            },

            customers: {
              set: customerConnect
            }
          },

          include: {
            lines: {
              include: {
                product: true
              }
            },
            customers: true,
            table: true,
            payments: true
          }
        });

        // --------------------------------------------------
        // Update table assignment
        // --------------------------------------------------
        const oldTableId = existingOrder.tableId;

        const newTableId =
          finalOrderType === 'TABLE'
            ? tableId
            : null;

        if (oldTableId !== newTableId) {

          // Clear old table
          if (oldTableId) {
            await tx.table.update({
              where: {
                id: oldTableId
              },
              data: {
                currentOrderId: null
              }
            });
          }

          // Assign new table
          if (newTableId) {
            await tx.table.update({
              where: {
                id: newTableId
              },
              data: {
                currentOrderId: id
              }
            });
          }

        } else if (newTableId) {

          // Make sure current table still points
          // to this order.
          await tx.table.update({
            where: {
              id: newTableId
            },
            data: {
              currentOrderId: id
            }
          });
        }

        return updated;
      }
    );

    // --------------------------------------------------
    // 12. Notify KDS
    // --------------------------------------------------
    const tickets = await prisma.kdsTicket.findMany({
      where: {
        orderId: order.id
      }
    });

    if (tickets.length > 0) {

      const fullTickets =
        await prisma.kdsTicket.findMany({
          where: {
            id: {
              in: tickets.map(ticket => ticket.id)
            }
          },

          include: {
            order: {
              include: {
                lines: {
                  include: {
                    product: true
                  }
                },
                table: true,
                customers: true
              }
            }
          }
        });

      const io = req.app.get('io');

      io.to(
        `kds-room-${req.user.organizationId}`
      ).emit(
        'ticket-updated',
        fullTickets
      );
    }

    // --------------------------------------------------
    // 13. Return updated order
    // --------------------------------------------------
    res.json(order);

  } catch (e) {
    console.error('Update order error:', e);

    res.status(500).json({
      error: e.message || 'Something went wrong'
    });
  }
});

router.post('/:id/send-receipt', verifyToken, requireWaiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address required' });

    const order = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: {
        lines: { include: { product: true } },
        table: true,
        customers: true,
      },
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
