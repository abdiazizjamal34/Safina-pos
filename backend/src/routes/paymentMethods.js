// const router = require('express').Router();
// const { PrismaClient } = require('@prisma/client');
// const { verifyToken, requireAdmin } = require('../middleware/auth');
// const { validateUUIDParam } = require('../middleware/validate');
// const prisma = new PrismaClient();

// router.param('id', validateUUIDParam());

// router.get('/', verifyToken, async (req, res) => {
//   try {
//     const methods = await prisma.paymentMethod.findMany({
//       where: { organizationId: req.user.organizationId }
//     });
//     res.json(methods);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });

// router.post('/', verifyToken, requireAdmin, async (req, res) => {
//   try {
//     const { name, isEnabled = true, upiId = null } = req.body;

//     if (typeof name !== 'string' || !name.trim()) {
//       return res.status(400).json({
//         error: 'Payment method name is required',
//       });
//     }

//     if (typeof isEnabled !== 'boolean') {
//       return res.status(400).json({
//         error: 'isEnabled must be true or false',
//       });
//     }

//     if (
//       upiId !== null &&
//       upiId !== undefined &&
//       typeof upiId !== 'string'
//     ) {
//       return res.status(400).json({
//         error: 'upiId must be a string',
//       });
//     }

//     const paymentMethodName = name.trim().toUpperCase();

//     const validMethods = [
//       'CASH',
//       'CARD',
//       'UPI',
//       'TELEBIRR',
//       'CBE_BIRR',
//       'BANK_TRANSFER',
//       'OTHER',
//     ];

//     if (!validMethods.includes(paymentMethodName)) {
//       return res.status(400).json({
//         error: `Invalid payment method. Allowed methods: ${validMethods.join(', ')}`,
//       });
//     }

//     const existing = await prisma.paymentMethod.findFirst({
//       where: {
//         organizationId: req.user.organizationId,
//         name: paymentMethodName,
//       },
//     });

//     if (existing) {
//       return res.status(409).json({
//         error: 'This payment method already exists',
//       });
//     }

//     const method = await prisma.paymentMethod.create({
//       data: {
//         name: paymentMethodName,
//         isEnabled,
//         upiId: upiId?.trim() || null,
//         organizationId: req.user.organizationId,
//       },
//     });

//     return res.status(201).json(method);
//   } catch (e) {
//     console.error('Create payment method error:', e);

//     if (e.code === 'P2002') {
//       return res.status(409).json({
//         error: 'This payment method already exists',
//       });
//     }

//     return res.status(500).json({
//       error: 'Something went wrong',
//     });
//   }
// });

// router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
//   try {
//     const { isEnabled, upiId } = req.body;
//     if (typeof isEnabled !== 'boolean') return res.status(400).json({ error: 'isEnabled must be true or false' });
//     if (upiId !== undefined && upiId !== null && typeof upiId !== 'string') return res.status(400).json({ error: 'upiId must be a string' });
//     const existing = await prisma.paymentMethod.findFirst({
//       where: { id: req.params.id, organizationId: req.user.organizationId }
//     });
//     if (!existing) return res.status(404).json({ error: 'Payment method not found' });

//     const method = await prisma.paymentMethod.update({
//       where: { id: req.params.id },
//       data: { isEnabled, upiId }
//     });
//     res.json(method);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });

// module.exports = router;



const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validate');

const prisma = new PrismaClient();

router.param('id', validateUUIDParam());

/*
|--------------------------------------------------------------------------
| GET /payment-methods
|--------------------------------------------------------------------------
| Get all payment methods belonging to the logged-in user's organization.
*/
router.get('/', verifyToken, async (req, res) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: {
        organizationId: req.user.organizationId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.json(methods);
  } catch (error) {
    console.error('Get payment methods error:', error);

    return res.status(500).json({
      error: 'Something went wrong',
    });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      isEnabled = true,
      upiId = null,
    } = req.body;

    // Validate name
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'Payment method name is required',
      });
    }

    const cleanName = name.trim();

    if (cleanName.length > 50) {
      return res.status(400).json({
        error: 'Payment method name must be 50 characters or less',
      });
    }

    // Validate enabled status
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        error: 'isEnabled must be true or false',
      });
    }

    // Validate UPI ID
    if (
      upiId !== null &&
      upiId !== undefined &&
      typeof upiId !== 'string'
    ) {
      return res.status(400).json({
        error: 'upiId must be a string',
      });
    }

    const cleanUpiId =
      typeof upiId === 'string'
        ? upiId.trim() || null
        : null;
    const existing = await prisma.paymentMethod.findFirst({
      where: {
        organizationId: req.user.organizationId,
        name: {
          equals: cleanName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'This payment method already exists',
      });
    }

    const method = await prisma.paymentMethod.create({
      data: {
        name: cleanName,
        isEnabled,
        upiId:
          cleanName.toUpperCase() === 'UPI'
            ? cleanUpiId
            : null,
        organizationId: req.user.organizationId,
      },
    });

    return res.status(201).json(method);
  } catch (error) {
    console.error('Create payment method error:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'This payment method already exists',
      });
    }

    return res.status(500).json({
      error: 'Something went wrong',
    });
  }
});



router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      isEnabled,
      upiId,
    } = req.body;

    // Validate enabled status
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        error: 'isEnabled must be true or false',
      });
    }

    // Validate UPI ID
    if (
      upiId !== undefined &&
      upiId !== null &&
      typeof upiId !== 'string'
    ) {
      return res.status(400).json({
        error: 'upiId must be a string',
      });
    }

    // Find method inside user's organization
    const existing = await prisma.paymentMethod.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user.organizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: 'Payment method not found',
      });
    }

    const cleanUpiId =
      typeof upiId === 'string'
        ? upiId.trim() || null
        : null;

    const method = await prisma.paymentMethod.update({
      where: {
        id: existing.id,
      },
      data: {
        isEnabled,

        // Only UPI should store a UPI ID.
        upiId:
          existing.name.toUpperCase() === 'UPI'
            ? cleanUpiId
            : null,
      },
    });

    return res.json(method);
  } catch (error) {
    console.error('Update payment method error:', error);

    return res.status(500).json({
      error: 'Something went wrong',
    });
  }
});


module.exports = router;
