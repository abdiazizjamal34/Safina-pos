const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req, res) => {
  try {
    const floors = await prisma.floor.findMany({
      where: { isActive: true, organizationId: req.user.organizationId },
      include: {
        tables: {
          where: { isActive: true, organizationId: req.user.organizationId },
          include: {
            orders: {
              where: {
                status: { in: ['DRAFT', 'SENT_TO_KITCHEN', 'READY'] },
                organizationId: req.user.organizationId
              },
              include: {
                lines: { include: { product: true } }
              }
            }
          }
        }
      }
    });
    res.json(floors);
  } catch (e) {
    console.error('[floors GET]', e.message);
    res.status(500).json({ error: 'Something went wrong', detail: e.message });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Floor name is required' });
    const floor = await prisma.floor.create({
      data: {
        name: name.trim(),
        organizationId: req.user.organizationId
      }
    });
    res.status(201).json(floor);
  } catch (e) {
    console.error('[floors POST]', e.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.floor.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Floor not found' });

    await prisma.floor.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Floor deleted' });
  } catch (e) {
    console.error('[floors DELETE]', e.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
