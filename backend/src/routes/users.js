


const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const {
  verifyToken,
  requireAdmin,
  requireManager,
} = require('../middleware/auth');

const {
  validate,
  rules: v,
} = require('../middleware/validate');

const prisma = new PrismaClient();

const ROLES = [
  'ADMIN',
  'MANAGER',
  'WAITER',
  'CASHIER',
  'KITCHEN',
  'BAR',
  'INVENTORY',
];

const userValidation = validate({
  name: [
    v.required,
    v.minLength(2),
  ],

  email: [
    v.required,
    v.isEmail,
  ],

  password: [
    v.required,
    v.minLength(8),
  ],
   
  pin: [
    v.required,
    v.minLength(4),
  ],
  role: [
    v.required,
    v.isEnum(...ROLES),
  ],
});

const passwordValidation = validate({
  password: [
    v.required,
    v.minLength(8),
  ],
});

/**
 * GET /api/users
 *
 * List users belonging to the current organization.
 */
router.get(
  '/',
  verifyToken,
  requireManager,
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          organizationId: req.user.organizationId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(users);
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: 'Something went wrong. Please try again.',
      });
    }
  }
);


/**
 * POST /api/users
 *
 * Create a user inside the current organization.
 */
router.post(
  '/',
  verifyToken,
  requireManager,
  userValidation,
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role,
      } = req.body;

      const normalizedEmail = email
        .toLowerCase()
        .trim();

      const exists = await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (exists) {
        return res.status(400).json({
          error: 'Email already registered',
          errors: {
            email: 'Already in use',
          },
        });
      }

      /*
       * Prevent a MANAGER from creating another ADMIN.
       * Only ADMIN can create ADMIN accounts.
       */
      if (
        role === 'ADMIN' &&
        req.user.role !== 'ADMIN'
      ) {
        return res.status(403).json({
          error: 'Only an administrator can create an administrator account',
        });
      }

      const hashed = await bcrypt.hash(
        password,
        12
      );

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: hashed,
          role,
          organizationId: req.user.organizationId,
        },
      });

      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: 'Something went wrong. Please try again.',
      });
    }
  }
);


router.put('/:id/pin', verifyToken, requireManager, async (req, res) => {
  try {
    const { pin } = req.body;

    // Validate PIN
    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({
        error: 'PIN must be exactly 4 digits',
      });
    }

    // Make sure the user belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(String(pin), 10);

    // Save PIN
    await prisma.user.update({
      where: {
        id: targetUser.id,
      },
      data: {
        pin: hashedPin,
      },
    });

    return res.json({
      message: 'PIN updated successfully',
    });
  } catch (error) {
    console.error('Update PIN error:', error);

    return res.status(500).json({
      error: 'Failed to update PIN',
    });
  }
});

/**
 * PUT /api/users/:id/password
 *
 * Change another user's password.
 */
router.put(
  '/:id/password',
  verifyToken,
  requireManager,
  passwordValidation,
  async (req, res) => {
    try {
      const targetUser = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      const hashed = await bcrypt.hash(
        req.body.password,
        12
      );

      await prisma.user.update({
        where: {
          id: targetUser.id,
        },

        data: {
          password: hashed,
        },
      });

      res.json({
        message: 'Password updated',
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: 'Something went wrong. Please try again.',
      });
    }
  }
);


/**
 * PUT /api/users/:id/archive
 *
 * Deactivate a user.
 */
router.put(
  '/:id/archive',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({
          error: 'You cannot archive your own account',
        });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      await prisma.user.update({
        where: {
          id: targetUser.id,
        },

        data: {
          isActive: false,
        },
      });

      res.json({
        message: 'User archived',
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: 'Something went wrong. Please try again.',
      });
    }
  }
);


/**
 * DELETE /api/users/:id
 *
 * Permanently delete a user.
 */
router.delete(
  '/:id',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({
          error: 'You cannot delete your own account',
        });
      }

      const targetUser = await prisma.user.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      await prisma.user.delete({
        where: {
          id: targetUser.id,
        },
      });

      res.json({
        message: 'User deleted',
      });
    } catch (e) {
      console.error(e);

      if (e.code === 'P2025') {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.status(500).json({
        error: 'Something went wrong. Please try again.',
      });
    }
  }
);

module.exports = router;