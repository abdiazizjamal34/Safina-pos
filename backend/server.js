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

const app = express();
const server = http.createServer(app);
const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const io = new Server(server, {
  cors: { origin: frontendUrl, credentials: true }
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
app.use(cors({ origin: frontendUrl, credentials: true }));
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


// commmets are not needed, but if you want to add them, you can do so here.

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
