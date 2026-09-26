const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', verifyToken, async (req, res) => {
  try {
    const promos = await prisma.promotion.findMany({
      where: { isActive: true, organizationId: req.user.organizationId },
      include: { product: true }
    });
    res.json(promos);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, applyTo, productId, minQuantity, minOrderAmount, discountType, discountValue } = req.body;
    if (productId) {
      const p = await prisma.product.findFirst({
        where: { id: productId, organizationId: req.user.organizationId }
      });
      if (!p) return res.status(404).json({ error: 'Product not found' });
    }

    const promo = await prisma.promotion.create({
      data: {
        name,
        applyTo,
        productId,
        minQuantity: minQuantity ? parseInt(minQuantity) : null,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        discountType,
        discountValue: parseFloat(discountValue),
        organizationId: req.user.organizationId
      },
      include: { product: true }
    });
    res.status(201).json(promo);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    const promo = await prisma.promotion.update({
      where: { id: req.params.id },
      data: { isActive }
    });
    res.json(promo);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.promotion.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Promotion not found' });

    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ message: 'Promotion deleted' });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

module.exports = router;
