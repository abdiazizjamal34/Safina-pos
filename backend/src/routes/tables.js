const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      where: { isActive: true, organizationId: req.user.organizationId },
      include: { floor: true }
    });
    res.json(tables);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { tableNumber, seats, floorId, x, y, shape } = req.body;
    if (!tableNumber) return res.status(400).json({ error: 'Table number required' });
    const parsedSeats = parseInt(seats, 10);
    if (isNaN(parsedSeats) || parsedSeats <= 0) return res.status(400).json({ error: 'Seats must be a positive number' });

    // Verify floor belongs to user's organization
    const floor = await prisma.floor.findFirst({
      where: { id: floorId, organizationId: req.user.organizationId }
    });
    if (!floor) return res.status(404).json({ error: 'Floor not found' });

    const exists = await prisma.table.findFirst({
      where: { tableNumber: tableNumber.trim().toUpperCase(), floorId, isActive: true, organizationId: req.user.organizationId }
    });
    if (exists) return res.status(400).json({ error: 'Table number already exists on this floor' });

    const table = await prisma.table.create({
      data: {
        tableNumber: tableNumber.trim().toUpperCase(),
        seats: parsedSeats,
        floorId,
        x: x !== undefined ? parseInt(x, 10) : 0,
        y: y !== undefined ? parseInt(y, 10) : 0,
        shape: shape || 'square',
        organizationId: req.user.organizationId
      }
    });
    res.status(201).json(table);
  } catch (e) {
    console.error("Error in POST /tables:", e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { tableNumber, seats, isActive, x, y, shape } = req.body;
    
    // Verify table belongs to user's organization
    const existingTable = await prisma.table.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existingTable) return res.status(404).json({ error: 'Table not found' });

    let parsedSeats = undefined;
    if (seats !== undefined) {
      parsedSeats = parseInt(seats, 10);
      if (isNaN(parsedSeats) || parsedSeats <= 0) return res.status(400).json({ error: 'Seats must be a positive number' });
    }

    if (tableNumber) {
      const exists = await prisma.table.findFirst({
        where: { tableNumber: tableNumber.trim().toUpperCase(), floorId: existingTable.floorId, isActive: true, organizationId: req.user.organizationId, NOT: { id: req.params.id } }
      });
      if (exists) return res.status(400).json({ error: 'Table number already exists on this floor' });
    }

    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: {
        tableNumber: tableNumber ? tableNumber.trim().toUpperCase() : undefined,
        seats: parsedSeats,
        isActive,
        x: x !== undefined ? parseInt(x, 10) : undefined,
        y: y !== undefined ? parseInt(y, 10) : undefined,
        shape: shape !== undefined ? shape : undefined
      }
    });
    res.json(table);
  } catch (e) {
    console.error("Error in PUT /tables:", e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Verify table belongs to user's organization
    const existingTable = await prisma.table.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existingTable) return res.status(404).json({ error: 'Table not found' });

    await prisma.table.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Table deleted' });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
