// const router = require('express').Router();
// const { PrismaClient } = require('@prisma/client');
// const { verifyToken, requireEmployee } = require('../middleware/auth');
// const prisma = new PrismaClient();

// router.get('/', verifyToken, requireEmployee, async (req, res) => {
//   try {
//     const { search } = req.query;
//     const where = {};
    
//     if (search) {
//       where.AND = [
//         {
//           OR: [
//             { name: { contains: search, mode: 'insensitive' } },
//             { email: { contains: search, mode: 'insensitive' } },
//             { phone: { contains: search } }
//           ]
//         }
//       ];
//     }

//     const customers = await prisma.customer.findMany({
//       where,
//       orderBy: { name: 'asc' }
//     });
//     res.json(customers);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });

// router.post('/', verifyToken, requireEmployee, async (req, res) => {
//   try {
//     const { name, email, phone } = req.body;
//     if (!name) return res.status(400).json({ error: 'Name required' });
//     const customer = await prisma.customer.create({
//       data: {
//         name,
//         email,
//         phone
//       }
//     });
//     res.status(201).json(customer);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });

// router.put('/:id', verifyToken, requireEmployee, async (req, res) => {
//   try {
//     const { name, email, phone } = req.body;
//     const existing = await prisma.customer.findUnique({
//       where: { id: req.params.id }
//     });
//     if (!existing) return res.status(404).json({ error: 'Customer not found' });

//     const customer = await prisma.customer.update({
//       where: { id: req.params.id },
//       data: { name, email, phone }
//     });
//     res.json(customer);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });

// router.delete('/:id', verifyToken, requireEmployee, async (req, res) => {
//   try {
//     const existing = await prisma.customer.findUnique({
//       where: { id: req.params.id }
//     });
//     if (!existing) return res.status(404).json({ error: 'Customer not found' });

//     await prisma.customer.delete({ where: { id: req.params.id } });
//     res.json({ message: 'Customer deleted' });
//   } catch (e) {
//     if (e.code === 'P2003') {
//       return res.status(400).json({ error: 'Cannot delete customer who has existing orders' });
//     }
//     res.status(500).json({ error: 'Something went wrong' });
//   }
// });

// module.exports = router;




const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const {
  verifyToken,
  requireRoles,
} = require('../middleware/auth');

const prisma = new PrismaClient();

const customerAccess = requireRoles(
  'ADMIN',
  'MANAGER',
  'WAITER',
  'CASHIER'
);


// GET /api/customers
router.get(
  '/',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      const { search } = req.query;

      const where = {
        organizationId: req.user.organizationId,
      };

      if (search) {
        where.AND = [
          {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                },
              },
            ],
          },
        ];
      }

      const customers = await prisma.customer.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      });

      res.json(customers);
    } catch (e) {
      console.error('Get customers error:', e);

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


// POST /api/customers
router.post(
  '/',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: 'Name required',
        });
      }

      const customer = await prisma.customer.create({
        data: {
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,

          // IMPORTANT:
          // Customer belongs to the logged-in user's organization.
          organizationId: req.user.organizationId,
        },
      });

      res.status(201).json(customer);
    } catch (e) {
      console.error('Create customer error:', e);

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


// PUT /api/customers/:id
router.put(
  '/:id',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
      } = req.body;

      // IMPORTANT:
      // Search by BOTH customer ID and organization ID.
      const existing = await prisma.customer.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Customer not found',
        });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: 'Name required',
        });
      }

      const customer = await prisma.customer.update({
        where: {
          id: existing.id,
        },

        data: {
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
        },
      });

      res.json(customer);
    } catch (e) {
      console.error('Update customer error:', e);

      if (e.code === 'P2025') {
        return res.status(404).json({
          error: 'Customer not found',
        });
      }

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


// DELETE /api/customers/:id
router.delete(
  '/:id',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      // IMPORTANT:
      // A user cannot delete another organization's customer.
      const existing = await prisma.customer.findFirst({
        where: {
          id: req.params.id,
          organizationId: req.user.organizationId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Customer not found',
        });
      }

      await prisma.customer.delete({
        where: {
          id: existing.id,
        },
      });

      res.json({
        message: 'Customer deleted',
      });
    } catch (e) {
      console.error('Delete customer error:', e);

      if (e.code === 'P2003') {
        return res.status(400).json({
          error: 'Cannot delete customer who has existing orders',
        });
      }

      if (e.code === 'P2025') {
        return res.status(404).json({
          error: 'Customer not found',
        });
      }

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


module.exports = router;