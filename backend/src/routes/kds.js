const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRoles } = require('../middleware/auth');
const { validateUUIDParam } = require('../middleware/validate');
const prisma = new PrismaClient();
const kdsAccess = requireRoles('ADMIN', 'MANAGER', 'KITCHEN', 'BAR');

const canManageStation = (role, station) =>
  role === 'ADMIN' || role === 'MANAGER' || role === station;

router.param('id', validateUUIDParam());
router.param('ticketId', validateUUIDParam('ticketId'));
router.param('lineId', validateUUIDParam('lineId'));

router.get('/tickets', verifyToken, kdsAccess, async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const station = req.user.role === 'KITCHEN' || req.user.role === 'BAR'
      ? req.user.role
      : undefined;
    const tickets = await prisma.kdsTicket.findMany({
      where: {
        ...(station ? { station } : {}),
        order: {
          status: {
            not: 'CANCELLED'
          },
          organizationId: req.user.organizationId
        },
        NOT: {
          stage: 'COMPLETED',
          order: {
            status: 'PAID'
          }
        },
        OR: [
          { stage: { not: 'COMPLETED' } },
          {
            stage: 'COMPLETED',
            updatedAt: { gte: thirtyMinutesAgo }
          }
        ]
      },
      include: { order: { include: { lines: { include: { product: true } }, table: true, customers: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(tickets);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// router.put('/tickets/:id/stage', verifyToken, kdsAccess, async (req, res) => {
//   try {
//     const { stage } = req.body;
//     const ticket = await prisma.kdsTicket.findFirst({
//       where: { id: req.params.id, order: { organizationId: req.user.organizationId } }
//     });
//     if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
//     if (!canManageStation(req.user.role, ticket.station)) {
//       return res.status(403).json({ error: `Only ${ticket.station.toLowerCase()} staff can update this ticket` });
//     }
    
//     let nextStage = stage;
//     if (!nextStage) {
//       nextStage = ticket.stage === 'TO_COOK' ? 'PREPARING' : 'COMPLETED';
//     }
    
//     if (!['TO_COOK', 'PREPARING', 'COMPLETED'].includes(nextStage)) {
//       return res.status(400).json({ error: 'Invalid KDS stage' });
//     }

//     const updated = await prisma.kdsTicket.update({
//       where: { id: req.params.id },
//       data: { stage: nextStage },
//       include: { order: { include: { lines: { include: { product: true } }, table: true, customers: true } } }
//     });

//     const allTickets = await prisma.kdsTicket.findMany({ where: { orderId: updated.orderId } });
//     const orderStatus = allTickets.length > 0 && allTickets.every(item => item.stage === 'COMPLETED')
//       ? 'READY'
//       : 'SENT_TO_KITCHEN';

//     await prisma.order.update({
//       where: { id: updated.orderId },
//       data: { status: orderStatus },
//     });
//     updated.order.status = orderStatus;

//     const io = req.app.get('io');
//     io.to(`kds-room-${req.user.organizationId}`).emit('ticket-updated', updated);
//     res.json(updated);
//   } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
// });

router.put('/tickets/:id/stage', verifyToken, kdsAccess, async (req, res) => {
  try {
    const { stage } = req.body;

    // --------------------------------------------------
    // 1. Find ticket
    // --------------------------------------------------
    const ticket = await prisma.kdsTicket.findFirst({
      where: {
        id: req.params.id,
        order: {
          organizationId: req.user.organizationId
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        error: 'Ticket not found'
      });
    }

    // --------------------------------------------------
    // 2. Check station permission
    // --------------------------------------------------
    if (!canManageStation(req.user.role, ticket.station)) {
      return res.status(403).json({
        error: `Only ${ticket.station.toLowerCase()} staff can update this ticket`
      });
    }

    // --------------------------------------------------
    // 3. Determine next stage
    // --------------------------------------------------
    let nextStage = stage;

    if (!nextStage) {
      nextStage =
        ticket.stage === 'TO_COOK'
          ? 'PREPARING'
          : 'COMPLETED';
    }

    // --------------------------------------------------
    // 4. Validate stage
    // --------------------------------------------------
    if (
      ![
        'TO_COOK',
        'PREPARING',
        'COMPLETED'
      ].includes(nextStage)
    ) {
      return res.status(400).json({
        error: 'Invalid KDS stage'
      });
    }

    // --------------------------------------------------
    // 5. Update ticket
    // --------------------------------------------------
    const updated = await prisma.kdsTicket.update({
      where: {
        id: req.params.id
      },

      data: {
        stage: nextStage
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

    // --------------------------------------------------
    // 6. Determine overall order status
    // --------------------------------------------------
    const allTickets = await prisma.kdsTicket.findMany({
      where: {
        orderId: updated.orderId
      }
    });

    const orderStatus =
      allTickets.length > 0 &&
      allTickets.every(
        item => item.stage === 'COMPLETED'
      )
        ? 'READY'
        : 'SENT_TO_KITCHEN';

    // --------------------------------------------------
    // 7. Update order status
    // --------------------------------------------------
    await prisma.order.update({
      where: {
        id: updated.orderId
      },

      data: {
        status: orderStatus
      }
    });

    updated.order.status = orderStatus;

    // --------------------------------------------------
    // 8. Notify KDS
    // --------------------------------------------------
    const io = req.app.get('io');

    if (io) {
      io.to(
        `kds-room-${req.user.organizationId}`
      ).emit(
        'ticket-updated',
        {
          source: 'KDS',
          reason: 'STAGE_UPDATED',
          tickets: [updated]
        }
      );
    }

    // --------------------------------------------------
    // 9. Return updated ticket
    // --------------------------------------------------
    res.json(updated);

  } catch (e) {
    console.error(
      'KDS stage update error:',
      e
    );

    res.status(500).json({
      error: 'Something went wrong'
    });
  }
});



router.put('/tickets/:ticketId/items/:lineId/done', verifyToken, kdsAccess, async (req, res) => {
  try {
    const ticket = await prisma.kdsTicket.findFirst({
      where: { id: req.params.ticketId, order: { organizationId: req.user.organizationId } }
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!canManageStation(req.user.role, ticket.station)) {
      return res.status(403).json({ error: `Only ${ticket.station.toLowerCase()} staff can update this ticket` });
    }

    const line = await prisma.orderLine.findFirst({
      where: { id: req.params.lineId, orderId: ticket.orderId, kdsStation: ticket.station }
    });
    if (!line) return res.status(404).json({ error: 'Order line not found' });

    const nextStatus = line.kdsStatus === 'DONE' ? 'PENDING' : 'DONE';
    
    const updatedLine = await prisma.orderLine.update({
      where: { id: req.params.lineId },
      data: { kdsStatus: nextStatus }
    });
    
    const io = req.app.get('io');
    io.to(`kds-room-${req.user.organizationId}`).emit('item-status-updated', {
      ticketId: req.params.ticketId,
      lineId: req.params.lineId,
      kdsStatus: nextStatus
    });
    res.json(updatedLine);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
