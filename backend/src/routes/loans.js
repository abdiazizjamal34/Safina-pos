const router = require('express').Router();
const { PrismaClient, Prisma } = require('@prisma/client');
const {
  verifyToken,
  requireWaiter,
} = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validate');

const prisma = new PrismaClient();

// router.param('customerId', validateUUIDParam());

/**
 * =========================================================
 * GET /api/loans/customer/:customerId
 * Get customer loans + outstanding balance
 * =========================================================
 */
router.get(
  '/customer/:customerId',
  verifyToken,
  requireWaiter,
  async (req, res) => {
    try {
      const { customerId } = req.params;
      const organizationId = req.user.organizationId;

      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: 'Customer not found',
        });
      }

      const loans = await prisma.loan.findMany({
        where: {
          customerId,
          organizationId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              paymentMethod: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const outstandingLoans = loans.filter(
        (loan) =>
          ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(
            loan.status
          ) &&
          Number(loan.remainingAmount) > 0.01
      );

      const totalOutstanding = outstandingLoans.reduce(
        (sum, loan) =>
          sum + Number(loan.remainingAmount),
        0
      );

      const totalBorrowed = loans.reduce(
        (sum, loan) =>
          sum + Number(loan.originalAmount),
        0
      );

      const totalPaid = loans.reduce(
        (sum, loan) =>
          sum + Number(loan.paidAmount),
        0
      );

      return res.json({
        customer,
        summary: {
          totalBorrowed: Number(
            totalBorrowed.toFixed(2)
          ),
          totalPaid: Number(
            totalPaid.toFixed(2)
          ),
          totalOutstanding: Number(
            totalOutstanding.toFixed(2)
          ),
          openLoans: outstandingLoans.length,
          totalLoans: loans.length,
        },
        loans,
      });
    } catch (error) {
      console.error(
        'GET CUSTOMER LOANS ERROR:',
        error
      );

      return res.status(500).json({
        message: 'Failed to fetch customer loans',
      });
    }
  }
);

/**
 * =========================================================
 * GET /api/loans
 * Get all loans for the organization
 *
 * Optional query parameters:
 * ?status=PENDING
 * ?customerId=...
 * ?search=customer name / phone / order number
 * =========================================================
 */
router.get(
  '/',
  verifyToken,
  requireWaiter,
  async (req, res) => {
    try {
      const organizationId = req.user.organizationId;

      const {
        status,
        customerId,
        search,
      } = req.query;

      const where = {
        organizationId,
      };

      if (status) {
        const validStatuses = [
          'PENDING',
          'PARTIALLY_PAID',
          'PAID',
          'OVERDUE',
          'CANCELLED',
        ];

        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: `Invalid loan status: ${status}`,
          });
        }

        where.status = status;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      if (search) {
        where.OR = [
          {
            customer: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            customer: {
              phone: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            order: {
              orderNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ];
      }

      const loans = await prisma.loan.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
          payments: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              paymentMethod: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const summary = {
        totalLoans: loans.length,

        totalBorrowed: Number(
          loans
            .reduce(
              (sum, loan) =>
                sum + Number(loan.originalAmount),
              0
            )
            .toFixed(2)
        ),

        totalPaid: Number(
          loans
            .reduce(
              (sum, loan) =>
                sum + Number(loan.paidAmount),
              0
            )
            .toFixed(2)
        ),

        totalOutstanding: Number(
          loans
            .filter(
              (loan) =>
                !['PAID', 'CANCELLED'].includes(
                  loan.status
                )
            )
            .reduce(
              (sum, loan) =>
                sum + Number(loan.remainingAmount),
              0
            )
            .toFixed(2)
        ),
      };

      return res.json({
        summary,
        loans,
      });
    } catch (error) {
      console.error(
        'GET ALL LOANS ERROR:',
        error
      );

      return res.status(500).json({
        message: 'Failed to fetch loans',
      });
    }
  }
);

/**
 * =========================================================
 * POST /api/loans/customer/:customerId/pay
 *
 * Record a payment against customer's outstanding loans.
 *
 * Body:
 * {
 *   "amount": 500,
 *   "paymentMethod": "Cash",
 *   "paymentReference": "optional",
 *   "notes": "optional"
 * }
 *
 * Payment is automatically allocated FIFO:
 * oldest unpaid loan first.
 * =========================================================
 */
router.post(
  '/customer/:customerId/pay',
  verifyToken,
  requireWaiter,
  async (req, res) => {
    try {
      const { customerId } = req.params;
      const organizationId = req.user.organizationId;

      const {
        amount,
        paymentMethod,
        paymentReference,
        notes,
      } = req.body;

      const paymentAmount = Number(amount);

      if (
        !Number.isFinite(paymentAmount) ||
        paymentAmount <= 0
      ) {
        return res.status(400).json({
          message:
            'Payment amount must be greater than 0',
        });
      }

      if (!paymentMethod) {
        return res.status(400).json({
          message: 'Payment method is required',
        });
      }

      /**
       * -----------------------------------------------------
       * Verify customer belongs to organization
       * -----------------------------------------------------
       */
      const customer =
        await prisma.customer.findFirst({
          where: {
            id: customerId,
            organizationId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        });

      if (!customer) {
        return res.status(404).json({
          message: 'Customer not found',
        });
      }

      /**
       * -----------------------------------------------------
       * Find payment method
       * -----------------------------------------------------
       */
      const method =
        await prisma.paymentMethod.findFirst({
          where: {
            organizationId,
            isEnabled: true,
            name: {
              equals: String(paymentMethod).trim(),
              mode: 'insensitive',
            },
          },
        });

      if (!method) {
        return res.status(400).json({
          message:
            `Payment method "${paymentMethod}" is not available`,
        });
      }

      /**
       * -----------------------------------------------------
       * Transaction
       * -----------------------------------------------------
       */
      const result = await prisma.$transaction(
        async (tx) => {
          /**
           * Get customer's unpaid loans.
           *
           * FIFO:
           * oldest loan gets paid first.
           */
          const loans =
            await tx.loan.findMany({
              where: {
                customerId,
                organizationId,
                status: {
                  in: [
                    'PENDING',
                    'PARTIALLY_PAID',
                    'OVERDUE',
                  ],
                },
                remainingAmount: {
                  gt: new Prisma.Decimal('0'),
                },
              },
              orderBy: [
                {
                  createdAt: 'asc',
                },
                {
                  id: 'asc',
                },
              ],
            });

          if (loans.length === 0) {
            const error =
              new Error(
                'Customer has no outstanding loans'
              );

            error.status = 400;

            throw error;
          }

          const totalOutstanding =
            loans.reduce(
              (sum, loan) =>
                sum +
                Number(loan.remainingAmount),
              0
            );

          if (
            paymentAmount >
            totalOutstanding + 0.01
          ) {
            const error =
              new Error(
                `Payment exceeds customer's outstanding balance of ${totalOutstanding.toFixed(
                  2
                )}`
              );

            error.status = 400;

            throw error;
          }

          let remainingPayment =
            paymentAmount;

          const allocations = [];

          /**
           * ---------------------------------------------------
           * Allocate payment FIFO
           * ---------------------------------------------------
           */
          for (const loan of loans) {
            if (remainingPayment <= 0.01) {
              break;
            }

            const loanRemaining =
              Number(
                loan.remainingAmount
              );

            const allocation = Math.min(
              remainingPayment,
              loanRemaining
            );

            const newRemaining =
              Number(
                (
                  loanRemaining -
                  allocation
                ).toFixed(2)
              );

            const newPaid =
              Number(
                (
                  Number(loan.paidAmount) +
                  allocation
                ).toFixed(2)
              );

            let newStatus =
              'PARTIALLY_PAID';

            if (newRemaining <= 0.01) {
              newStatus = 'PAID';
            }

            /**
             * Update loan
             */
            const updatedLoan =
              await tx.loan.update({
                where: {
                  id: loan.id,
                },
                data: {
                  paidAmount: newPaid,
                  remainingAmount:
                    newRemaining,
                  status: newStatus,
                },
              });

            /**
             * Create loan payment record
             */
            const loanPayment =
              await tx.loanPayment.create({
                data: {
                  loanId: loan.id,
                  organizationId,
                  amount: allocation,
                  paymentMethodId:
                    method.id,
                  paymentReference:
                    paymentReference ||
                    null,
                  notes: notes || null,
                },
                include: {
                  paymentMethod: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });

            allocations.push({
              loan: updatedLoan,
              payment: loanPayment,
              amount: allocation,
            });

            remainingPayment =
              Number(
                (
                  remainingPayment -
                  allocation
                ).toFixed(2)
              );
          }

          /**
           * Recalculate customer's outstanding
           */
          const remainingLoans =
            await tx.loan.findMany({
              where: {
                customerId,
                organizationId,
                status: {
                  in: [
                    'PENDING',
                    'PARTIALLY_PAID',
                    'OVERDUE',
                  ],
                },
                remainingAmount: {
                  gt: new Prisma.Decimal('0'),
                },
              },
              select: {
                remainingAmount: true,
              },
            });

          const customerOutstanding =
            remainingLoans.reduce(
              (sum, loan) =>
                sum +
                Number(
                  loan.remainingAmount
                ),
              0
            );

          return {
            allocations,
            customerOutstanding:
              Number(
                customerOutstanding.toFixed(2)
              ),
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      /**
       * -----------------------------------------------------
       * Get updated customer loans
       * -----------------------------------------------------
       */
      const updatedLoans =
        await prisma.loan.findMany({
          where: {
            customerId,
            organizationId,
          },
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
                status: true,
                createdAt: true,
              },
            },
            payments: {
              orderBy: {
                createdAt: 'asc',
              },
              include: {
                paymentMethod: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

      const io = req.app.get('io');

      if (io) {
        io.to(
          `kds-room-${organizationId}`
        ).emit('loan-payment-created', {
          customerId,
          amount: paymentAmount,
          customerOutstanding:
            result.customerOutstanding,
        });
      }

      return res.json({
        message:
          'Loan payment recorded successfully',

        customer,

        payment: {
          amount: paymentAmount,
          paymentMethod: method.name,
          paymentReference:
            paymentReference || null,
          notes: notes || null,
        },

        allocations:
          result.allocations.map(
            (allocation) => ({
              loanId:
                allocation.loan.id,
              orderId:
                allocation.loan.orderId,
              amount:
                Number(
                  allocation.amount.toFixed(2)
                ),
              remainingAmount:
                Number(
                  allocation.loan
                    .remainingAmount
                ),
              status:
                allocation.loan.status,
              paymentId:
                allocation.payment.id,
            })
          ),

        summary: {
          paymentAmount:
            paymentAmount,
          customerOutstanding:
            result.customerOutstanding,
        },

        loans: updatedLoans,
      });
    } catch (error) {
      console.error(
        'CUSTOMER LOAN PAYMENT ERROR:',
        error
      );

      if (error.code === 'P2034') {
        return res.status(409).json({
          message:
            'Another loan payment was processed at the same time. Please try again.',
        });
      }

      return res.status(
        error.status || 500
      ).json({
        message:
          error.message ||
          'Failed to process loan payment',
      });
    }
  }
);

module.exports = router;