
// const router = require('express').Router();
// const { PrismaClient } = require('@prisma/client');
// const {
//   verifyToken,
//   requireRoles,
// } = require('../middleware/auth');

// const prisma = new PrismaClient();

// const customerAccess = requireRoles(
//   'ADMIN',
//   'MANAGER',
//   'WAITER',
//   'CASHIER'
// );


// // GET /api/customers
// router.get(
//   '/',
//   verifyToken,
//   customerAccess,
//   async (req, res) => {
//     try {
//       const { search } = req.query;

//       const where = {
//         organizationId: req.user.organizationId,
//       };

//       if (search) {
//         where.AND = [
//           {
//             OR: [
//               {
//                 name: {
//                   contains: search,
//                   mode: 'insensitive',
//                 },
//               },
//               {
//                 email: {
//                   contains: search,
//                   mode: 'insensitive',
//                 },
//               },
//               {
//                 phone: {
//                   contains: search,
//                 },
//               },
//             ],
//           },
//         ];
//       }

//       const customers = await prisma.customer.findMany({
//         where,
//         orderBy: {
//           name: 'asc',
//         },
//       });

//       res.json(customers);
//     } catch (e) {
//       console.error('Get customers error:', e);

//       res.status(500).json({
//         error: 'Something went wrong',
//       });
//     }
//   }
// );


// // POST /api/customers
// router.post(
//   '/',
//   verifyToken,
//   customerAccess,
//   async (req, res) => {
//     try {
//       const {
//         name,
//         email,
//         phone,
//       } = req.body;

//       if (!name || !name.trim()) {
//         return res.status(400).json({
//           error: 'Name required',
//         });
//       }

//       const customer = await prisma.customer.create({
//         data: {
//           name: name.trim(),
//           email: email?.trim() || null,
//           phone: phone?.trim() || null,

//           // IMPORTANT:
//           // Customer belongs to the logged-in user's organization.
//           organizationId: req.user.organizationId,
//         },
//       });

//       res.status(201).json(customer);
//     } catch (e) {
//       console.error('Create customer error:', e);

//       res.status(500).json({
//         error: 'Something went wrong',
//       });
//     }
//   }
// );


// // PUT /api/customers/:id
// router.put(
//   '/:id',
//   verifyToken,
//   customerAccess,
//   async (req, res) => {
//     try {
//       const {
//         name,
//         email,
//         phone,
//       } = req.body;

//       // IMPORTANT:
//       // Search by BOTH customer ID and organization ID.
//       const existing = await prisma.customer.findFirst({
//         where: {
//           id: req.params.id,
//           organizationId: req.user.organizationId,
//         },
//       });

//       if (!existing) {
//         return res.status(404).json({
//           error: 'Customer not found',
//         });
//       }

//       if (!name || !name.trim()) {
//         return res.status(400).json({
//           error: 'Name required',
//         });
//       }

//       const customer = await prisma.customer.update({
//         where: {
//           id: existing.id,
//         },

//         data: {
//           name: name.trim(),
//           email: email?.trim() || null,
//           phone: phone?.trim() || null,
//         },
//       });

//       res.json(customer);
//     } catch (e) {
//       console.error('Update customer error:', e);

//       if (e.code === 'P2025') {
//         return res.status(404).json({
//           error: 'Customer not found',
//         });
//       }

//       res.status(500).json({
//         error: 'Something went wrong',
//       });
//     }
//   }
// );


// // DELETE /api/customers/:id
// router.delete(
//   '/:id',
//   verifyToken,
//   customerAccess,
//   async (req, res) => {
//     try {
//       // IMPORTANT:
//       // A user cannot delete another organization's customer.
//       const existing = await prisma.customer.findFirst({
//         where: {
//           id: req.params.id,
//           organizationId: req.user.organizationId,
//         },
//       });

//       if (!existing) {
//         return res.status(404).json({
//           error: 'Customer not found',
//         });
//       }

//       await prisma.customer.delete({
//         where: {
//           id: existing.id,
//         },
//       });

//       res.json({
//         message: 'Customer deleted',
//       });
//     } catch (e) {
//       console.error('Delete customer error:', e);

//       if (e.code === 'P2003') {
//         return res.status(400).json({
//           error: 'Cannot delete customer who has existing orders',
//         });
//       }

//       if (e.code === 'P2025') {
//         return res.status(404).json({
//           error: 'Customer not found',
//         });
//       }

//       res.status(500).json({
//         error: 'Something went wrong',
//       });
//     }
//   }
// );


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

/**
 * =========================================================
 * Helper: Add outstanding balance to a customer
 * =========================================================
 *
 * Balance is calculated from:
 *
 * PENDING
 * PARTIALLY_PAID
 * OVERDUE
 *
 * PAID and CANCELLED loans are ignored.
 */
const addOutstandingBalance = async (
  customer,
  organizationId
) => {
  const result = await prisma.loan.aggregate({
    where: {
      customerId: customer.id,
      organizationId,
      status: {
        in: [
          'PENDING',
          'PARTIALLY_PAID',
          'OVERDUE',
        ],
      },
    },

    _sum: {
      remainingAmount: true,
    },
  });

  return {
    ...customer,

    outstandingBalance: Number(
      result._sum.remainingAmount || 0
    ),
  };
};


/**
 * =========================================================
 * GET /api/customers
 *
 * Get all customers.
 *
 * Each customer now includes:
 *
 * outstandingBalance
 * =========================================================
 */
router.get(
  '/',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      const { search } = req.query;

      const organizationId =
        req.user.organizationId;

      const where = {
        organizationId,
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

      const customers =
        await prisma.customer.findMany({
          where,
          orderBy: {
            name: 'asc',
          },
        });

      /**
       * Calculate balance for every customer.
       */
      const customersWithBalance =
        await Promise.all(
          customers.map((customer) =>
            addOutstandingBalance(
              customer,
              organizationId
            )
          )
        );

      res.json(customersWithBalance);
    } catch (e) {
      console.error(
        'Get customers error:',
        e
      );

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


/**
 * =========================================================
 * GET /api/customers/:id
 *
 * Get one customer with outstanding balance.
 * =========================================================
 */
router.get(
  '/:id',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      const organizationId =
        req.user.organizationId;

      const customer =
        await prisma.customer.findFirst({
          where: {
            id: req.params.id,
            organizationId,
          },
        });

      if (!customer) {
        return res.status(404).json({
          error: 'Customer not found',
        });
      }

      const customerWithBalance =
        await addOutstandingBalance(
          customer,
          organizationId
        );

      res.json(customerWithBalance);
    } catch (e) {
      console.error(
        'Get customer error:',
        e
      );

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


/**
 * =========================================================
 * POST /api/customers
 * =========================================================
 */
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

      const customer =
        await prisma.customer.create({
          data: {
            name: name.trim(),
            email:
              email?.trim() || null,
            phone:
              phone?.trim() || null,

            // Customer belongs to
            // logged-in user's organization.
            organizationId:
              req.user.organizationId,
          },
        });

      /**
       * New customer has no loans,
       * so outstandingBalance = 0.
       */
      res.status(201).json({
        ...customer,
        outstandingBalance: 0,
      });
    } catch (e) {
      console.error(
        'Create customer error:',
        e
      );

      res.status(500).json({
        error: 'Something went wrong',
      });
    }
  }
);


/**
 * =========================================================
 * PUT /api/customers/:id
 * =========================================================
 */
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

      // Search by BOTH customer ID
      // and organization ID.
      const existing =
        await prisma.customer.findFirst({
          where: {
            id: req.params.id,
            organizationId:
              req.user.organizationId,
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

      const customer =
        await prisma.customer.update({
          where: {
            id: existing.id,
          },

          data: {
            name: name.trim(),
            email:
              email?.trim() || null,
            phone:
              phone?.trim() || null,
          },
        });

      /**
       * Keep outstanding balance in
       * the response after updating.
       */
      const customerWithBalance =
        await addOutstandingBalance(
          customer,
          req.user.organizationId
        );

      res.json(customerWithBalance);
    } catch (e) {
      console.error(
        'Update customer error:',
        e
      );

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


/**
 * =========================================================
 * DELETE /api/customers/:id
 * =========================================================
 */
router.delete(
  '/:id',
  verifyToken,
  customerAccess,
  async (req, res) => {
    try {
      // A user cannot delete another
      // organization's customer.
      const existing =
        await prisma.customer.findFirst({
          where: {
            id: req.params.id,
            organizationId:
              req.user.organizationId,
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
      console.error(
        'Delete customer error:',
        e
      );

      if (e.code === 'P2003') {
        return res.status(400).json({
          error:
            'Cannot delete customer who has existing orders',
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
