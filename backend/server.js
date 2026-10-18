const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();


const cron = require('node-cron');
const { sendDailyReportEmail, sendClosingAlertEmail } = require('./src/utils/emailService');

const alertTime = process.env.CRON_ALERT_TIME || '0 23 * * *';
const closeTime = process.env.CRON_CLOSE_TIME || '30 23 * * *';
const openTime  = process.env.CRON_OPEN_TIME  || '0 7 * * *';
const orgId = process.env.PUBLIC_MENU_ORGANIZATION_ID || 'YOUR_ORG_ID_HERE'; // Replace with your real Org ID



const app = express();
const server = http.createServer(app);
const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const io = new Server(server, {
  cors: { origin: true, credentials: true }
});

io.use(async (socket, next) => {
  try {
    const header = socket.handshake.headers.authorization;
    const token = socket.handshake.auth?.token || (header?.startsWith('Bearer ') ? header.slice(7) : null);
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true, organizationId: true }
    });
    if (!user || !user.isActive) return next(new Error('Invalid or inactive user'));
    if (!['ADMIN', 'MANAGER', 'KITCHEN', 'BAR'].includes(user.role)) {
      return next(new Error('KDS access denied'));
    }
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid access token'));
  }
});

// app.use(helmet());
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);
app.set('trust proxy', 1); // Trust Render's reverse proxy for correct IP detection
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
app.set('io', io);

app.use('/uploads', express.static('uploads'));   
app.use('/api/auth',           require('./src/routes/auth'));
app.use('/api/products',       require('./src/routes/products'));
app.use('/api/menu',          require('./src/routes/menu'));
app.use('/api/categories',     require('./src/routes/categories'));
app.use('/api/payment-methods',require('./src/routes/paymentMethods'));
app.use('/api/loans',     require('./src/routes/loans'));
app.use('/api/floors',         require('./src/routes/floors'));
app.use('/api/tables',         require('./src/routes/tables'));
app.use('/api/coupons',        require('./src/routes/coupons'));
app.use('/api/promotions',     require('./src/routes/promotions'));
app.use('/api/users',          require('./src/routes/users'));
app.use('/api/orders',         require('./src/routes/orders'));
app.use('/api/customers',      require('./src/routes/customers'));
app.use('/api/kds',            require('./src/routes/kds'));
app.use('/api/session',        require('./src/routes/session'));
app.use('/api/reports',        require('./src/routes/reports'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

/* ── 404 handler ───────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});


// ─────────────────────────────────────────────────────────
// CRON JOB 1: ALERT AT 11:00 PM (30 mins before close)
// ─────────────────────────────────────────────────────────
cron.schedule(alertTime, async () => {
console.log(`⏰ [CRON] Running Alert Job (${alertTime})...`);
  try {
    const orgId = process.env.PUBLIC_MENU_ORGANIZATION_ID || 'YOUR_ORG_ID_HERE'; // 👈 Replace with your real Org ID
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    // Find unfinished orders
    const unfinishedOrders = await prisma.order.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY'] }
      },
      include: { table: true }
    });

    if (unfinishedOrders.length > 0) {
      await sendClosingAlertEmail(adminEmail, unfinishedOrders);
    } else {
      console.log('⏰ [CRON] No unfinished orders. No alert needed.');
    }
  } catch (error) {
    console.error('❌ [CRON] Error during alert job:', error);
  }
}, { timezone: "Africa/Addis_Ababa" });



// ─────────────────────────────────────────────────────────
// CRON JOBS: Auto Close & Open Sessions
// ─────────────────────────────────────────────────────────

// 1. CLOSE SESSION & SEND REPORT AT 11:30 PM
// ─────────────────────────────────────────────────────────
// CRON JOB 2: CLOSE SESSION & SEND FINAL REPORT AT 11:30 PM
// ─────────────────────────────────────────────────────────
cron.schedule(closeTime, async () => {
  console.log(`⏰ [CRON] Running 11:30 PM Auto-Close Job (${closeTime})...`);
  try {
    const orgId = process.env.PUBLIC_MENU_ORGANIZATION_ID ||  'YOUR_ORG_ID_HERE'; // 👈 Replace with your real Org ID
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    // 1. Find the open session
    const session = await prisma.posSession.findFirst({
      where: { organizationId: orgId, status: 'OPEN' }
    });

    if (!session) {
      console.log('⏰ [CRON] No open session found to close.');
      return;
    }

    // 2. Find any REMAINING unfinished orders
    const unfinishedOrders = await prisma.order.findMany({
      where: {
        sessionId: session.id,
        status: { in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY'] }
      }
    });

    // 3. Force-settle unfinished orders
    const forcedPaidIds = [];
    if (unfinishedOrders.length > 0) {
      console.log(`⏰ [CRON] Forcing ${unfinishedOrders.length} unfinished orders to PAID...`);
      
      // Get a default payment method to attach to these forced payments
      const defaultMethod = await prisma.paymentMethod.findFirst({
        where: { organizationId: orgId, isEnabled: true }
      });

      for (const order of unfinishedOrders) {
        // Create a payment record so the balance matches
        if (defaultMethod) {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              paymentMethodId: defaultMethod.id,
              amount: order.total,
              paymentReference: 'Auto-Settled at Close'
            }
          });
        }

        // Mark order as PAID
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAID' }
        });

        forcedPaidIds.push(order.orderNumber);
      }
    }

    // 4. Generate Report Data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const paidOrders = await prisma.order.findMany({
      where: { sessionId: session.id, status: 'PAID' }, // Using sessionId ensures we only report on this session
      include: { payments: { include: { paymentMethod: true } } }
    });

    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = paidOrders.length;
    const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;
    
    // Group payments
    const byMethod = {};
    paidOrders.forEach(o => o.payments.forEach(p => {
      const name = p.paymentMethod?.name || 'Unknown';
      byMethod[name] = (byMethod[name] || 0) + Number(p.amount);
    }));
    const paymentMethods = {
      methods: Object.keys(byMethod).map(name => ({ name, amount: byMethod[name] }))
    };

    const reportData = { 
      totalOrders, 
      revenue, 
      avgOrderValue, 
      paymentMethods,
      forcedPaidOrders: forcedPaidIds // 👈 Pass the forced IDs to the email
    };

    // 5. Fetch Outstanding Loans
    const loans = await prisma.loan.findMany({
      where: { organizationId: orgId, remainingAmount: { gt: 0 } },
      include: { customer: true, order: true }
    });

    // 6. Send Email
    await sendDailyReportEmail(adminEmail, reportData, loans);

    // 7. Close Session
    await prisma.posSession.update({
      where: { id: session.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });
    
    console.log('✅ [CRON] Session closed successfully.');

  } catch (error) {
    console.error('❌ [CRON] Error during auto-close:', error);
  }
}, { timezone: "Africa/Addis_Ababa" });

// 2. OPEN NEW SESSION AT 7:00 AM
cron.schedule(openTime, async () => {
  console.log(`⏰ [CRON] Running 7:00 AM Auto-Open Job (${openTime})...`);
  try {
    const organizationId = process.env.PUBLIC_MENU_ORGANIZATION_ID || 'YOUR_ORG_ID_HERE'; // 👈 Replace with your real Org ID

    // Check if one is already open
    const existing = await prisma.posSession.findFirst({
      where: { organizationId, status: 'OPEN' }
    });

    if (existing) {
      console.log('⏰ [CRON] A session is already open. Skipping.');
      return;
    }

    // Find an Admin user to assign as the opener
    const adminUser = await prisma.user.findFirst({
      where: { organizationId, role: 'ADMIN' }
    });

    if (!adminUser) {
        console.log('❌ [CRON] No Admin user found to attribute the session to.');
        return;
    }

    // Open new session
    await prisma.posSession.create({
      data: {
        organizationId,
        openedById: adminUser.id,
        status: 'OPEN',
        openedAt: new Date(),
      }
    });
    console.log('✅ [CRON] New session opened automatically.');

  } catch (error) {
    console.error('❌ [CRON] Error during auto-open:', error);
  }
}, {
  timezone: "Africa/Addis_Ababa"
});


/* ── Global error handler ───────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

// io.on('connection', (socket) => {
//   console.log('Client connected:', socket.id);
//   socket.on('join-kds', () => {
//     socket.join(`kds-room-${socket.data.user.organizationId}`);
//   });
//   socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
// });


/* ─────────────────────────────────────────────────────
   Public "waiter display" socket namespace
   — no login required, secret in handshake auth
───────────────────────────────────────────────────── */
const waiterNamespace = io.of('/waiter');

waiterNamespace.use((socket, next) => {
  const { organizationId, secret } = socket.handshake.auth || {};

  if (!organizationId || !secret) {
    return next(new Error('organizationId and secret required'));
  }

  const expected = process.env.WAITER_KIOSK_SECRET;

  if (!expected) {
    console.warn('[waiter-ns] WAITER_KIOSK_SECRET not set in env');
    return next(new Error('Waiter display not configured'));
  }

  if (secret !== expected) {
    return next(new Error('Invalid waiter display secret'));
  }

  socket.data.organizationId = organizationId;
  next();
});

waiterNamespace.on('connection', (socket) => {
  const orgId = socket.data.organizationId;
  const room = `waiter-room-${orgId}`;

  socket.join(room);
  console.log(`[waiter-ns] joined ${room}: ${socket.id}`);

  socket.on('waiter-ack', ({ orderId, ackName }) => {
    // Relay ack to the waiter room (all kiosks) AND the KDS room (chefs)
    waiterNamespace.to(room).emit('waiter-ack', { orderId, ackName });
    io.to(`kds-room-${orgId}`).emit('waiter-ack', { orderId, ackName });
  });

  socket.on('disconnect', () => {
    console.log(`[waiter-ns] left ${room}: ${socket.id}`);
  });
});

/* ─────────────────────────────────────────────────────
   Authenticated socket (KDS + POS)
───────────────────────────────────────────────────── */
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-kds', () => {
    socket.join(`kds-room-${socket.data.user.organizationId}`);
  });

  // KDS / POS emits a waiter call
  socket.on('waiter-call', ({ orderId, orderNumber, orderType, tableNumber, items }) => {
    const orgId = socket.data.user?.organizationId;
    if (!orgId) return;

    const payload = {
      orderId,
      orderNumber,
      orderType,
      tableNumber,
      items: items || [],
      calledAt: new Date().toISOString(),
      calledBy: socket.data.user.id,
    };

    // Broadcast to waiter displays
    waiterNamespace.to(`waiter-room-${orgId}`).emit('waiter-call', payload);

    // Confirm back to KDS (so it can show "notified")
    io.to(`kds-room-${orgId}`).emit('waiter-call-sent', payload);

    console.log(`[waiter-call] ${orderNumber} from org ${orgId}`);
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});


// Add '0.0.0.0' right after the port definition
server.listen(process.env.PORT || 5000, '0.0.0.0', () => {
  console.log(`Cafe POS server running on port ${process.env.PORT || 5000}`);

  // Self-ping every 14 minutes to prevent Render free tier spin-down
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const pingUrl = `${process.env.RENDER_EXTERNAL_URL}/api/health`;
    setInterval(async () => {
      try {
        const res = await fetch(pingUrl);
        console.log(`[Self-ping] ${new Date().toISOString()} — status: ${res.status}`);
      } catch (err) {
        console.warn(`[Self-ping] Failed: ${err.message}`);
      }
    }, 14 * 60 * 1000); // every 14 minutes
    console.log(`[Self-ping] Enabled — pinging ${pingUrl} every 14 minutes`);
  }
});


module.exports = { io };
