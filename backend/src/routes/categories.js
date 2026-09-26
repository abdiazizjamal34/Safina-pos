const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req, res) => {
  try {
    const cats = await prisma.productCategory.findMany({
      where: { isActive: true, organizationId: req.user.organizationId },
      orderBy: { name: 'asc' }
    });
    res.json(cats);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const normalized = name.trim();
    const exists = await prisma.productCategory.findFirst({
      where: { name: { equals: normalized, mode: 'insensitive' }, organizationId: req.user.organizationId }
    });
    if (exists) return res.status(400).json({ error: 'Category name already exists' });
    const cat = await prisma.productCategory.create({
      data: { name: normalized, color: color || '#6B7280', organizationId: req.user.organizationId }
    });
    res.status(201).json(cat);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, color } = req.body;
    const existing = await prisma.productCategory.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    if (name) {
      const normalized = name.trim();
      const exists = await prisma.productCategory.findFirst({
        where: { name: { equals: normalized, mode: 'insensitive' }, organizationId: req.user.organizationId, NOT: { id: req.params.id } }
      });
      if (exists) return res.status(400).json({ error: 'Category name already exists' });
    }
    const cat = await prisma.productCategory.update({
      where: { id: req.params.id },
      data: { name: name ? name.trim() : undefined, color }
    });
    res.json(cat);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.productCategory.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    await prisma.productCategory.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Category deleted' });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
