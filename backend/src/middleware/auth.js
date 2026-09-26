// const jwt = require('jsonwebtoken');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// const verifyToken = async (req, res, next) => {
//   // Accept Bearer header OR ?token= query param (for file download links)
//   const raw = req.headers.authorization?.startsWith('Bearer ')
//     ? req.headers.authorization.split(' ')[1]
//     : req.query.token;
//   if (!raw) return res.status(401).json({ error: 'No token' });
//   try {
//     const decoded = jwt.verify(raw, process.env.JWT_SECRET);
//     req.user = decoded;

//     // Fallback for active sessions logged in before migration
//     if (!req.user.organizationId) {
//       const dbUser = await prisma.user.findUnique({
//         where: { id: decoded.id },
//         select: { organizationId: true }
//       });
//       if (dbUser) {
//         req.user.organizationId = dbUser.organizationId;
//       } else {
//         return res.status(401).json({ error: 'Organization not found for user' });
//       }
//     }

//     next();
//   } catch (err) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }
// };

// const requireAdmin = (req, res, next) => {
//   if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
//   next();
// };

// const requireEmployee = (req, res, next) => {
//   if (!['ADMIN','EMPLOYEE'].includes(req.user?.role)) return res.status(403).json({ error: 'Access denied' });
//   next();
// };

// module.exports = { verifyToken, requireAdmin, requireEmployee };








const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        organizationId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to perform this action',
      });
    }

    next();
  };
};

const requireAdmin = requireRoles('ADMIN');

const requireManager = requireRoles(
  'ADMIN',
  'MANAGER'
);

const requireManagement = requireRoles(
  'ADMIN',
  'MANAGER'
);

const requireWaiter = requireRoles(
  'ADMIN',
  'MANAGER',
  'WAITER'
);

const requireCashier = requireRoles(
  'ADMIN',
  'MANAGER',
  'CASHIER'
);

const requireKitchen = requireRoles(
  'ADMIN',
  'MANAGER',
  'KITCHEN'
);

const requireBar = requireRoles(
  'ADMIN',
  'MANAGER',
  'BAR'
);

const requireInventory = requireRoles(
  'ADMIN',
  'MANAGER',
  'INVENTORY'
);

const requireEmployee = requireRoles(
  'ADMIN',
  'MANAGER',
  'WAITER',
  'CASHIER',
  'KITCHEN',
  'BAR',
  'INVENTORY'
);

module.exports = {
  verifyToken,
  requireRoles,
  requireEmployee,
  requireAdmin,
  requireManager,
  requireManagement,
  requireWaiter,
  requireCashier,
  requireKitchen,
  requireBar,
  requireInventory,
};