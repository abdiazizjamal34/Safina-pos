const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/*
 * Public customer menu
 *
 * GET /api/menu
 * GET /api/menu?categoryId=...
 *
 * No authentication required.
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = process.env.PUBLIC_MENU_ORGANIZATION_ID;
    const { categoryId } = req.query;

    if (!organizationId) {
      console.error('PUBLIC_MENU_ORGANIZATION_ID is not configured');

      return res.status(500).json({
        error: 'Public menu is not configured',
      });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Restaurant not found',
      });
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      select: {
        id: true,
        name: true,
        price: true,
        unitOfMeasure: true,
        tax: true,
        description: true,
        imageUrl: true,
        kdsStation: true,

        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        {
          category: {
            name: 'asc',
          },
        },
        {
          name: 'asc',
        },
      ],
    });

    const categories = [];

    for (const product of products) {
      if (!categories.some(category => category.id === product.category.id)) {
        categories.push(product.category);
      }
    }

    res.json({
      restaurant: organization,
      categories,
      products,
    });
  } catch (error) {
    console.error('Public menu error:', error);

    res.status(500).json({
      error: 'Unable to load menu',
    });
  }
});

module.exports = router;