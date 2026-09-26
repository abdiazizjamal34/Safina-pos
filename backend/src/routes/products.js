// const router = require('express').Router();
// const { PrismaClient } = require('@prisma/client');
// const { verifyToken, requireAdmin } = require('../middleware/auth');
// const { validate, rules: v } = require('../middleware/validate');
// const prisma = new PrismaClient();

// const productValidation = validate({
//   name:       [v.required, v.minLength(2)],
//   categoryId: [v.required],
//   price:      [v.required, v.isPositive],
// });


// router.get('/', verifyToken, async (req, res) => {
//   try {
//     const products = await prisma.product.findMany({
//       where: { isActive: true, organizationId: req.user.organizationId },
//       include: { category: true },
//       orderBy: { name: 'asc' },
//     });
//     res.json(products);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: 'Something went wrong. Please try again.' });
//   }
// });

// router.get('/frequently-together/:productId', verifyToken, async (req, res) => {
//   try {
//     const { productId } = req.params;

//     // Verify product belongs to user's organization
//     const product = await prisma.product.findFirst({
//       where: { id: productId, organizationId: req.user.organizationId }
//     });
//     if (!product) return res.status(404).json({ error: 'Product not found' });

//     // Find all orders that contain this product for this organization
//     const ordersWithProduct = await prisma.orderLine.findMany({
//       where: { productId, order: { organizationId: req.user.organizationId } },
//       select: { orderId: true },
//     });
//     const orderIds = ordersWithProduct.map(o => o.orderId);

//     if (orderIds.length === 0) return res.json([]);

//     // Find other products in those same orders
//     const coProducts = await prisma.orderLine.groupBy({
//       by: ['productId'],
//       where: {
//         orderId: { in: orderIds },
//         productId: { not: productId },
//       },
//       _count: { productId: true },
//       orderBy: { _count: { productId: 'desc' } },
//       take: 3,
//     });

//     const productIds = coProducts.map(p => p.productId);
//     const products = await prisma.product.findMany({
//       where: { id: { in: productIds }, isActive: true, organizationId: req.user.organizationId },
//       include: { category: true },
//     });

//     // Sort by frequency
//     const sorted = productIds
//       .map(id => products.find(p => p.id === id))
//       .filter(Boolean);

//     res.json(sorted);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: 'Something went wrong' });
//   }
// });

// router.post('/', verifyToken, requireAdmin, productValidation, async (req, res) => {
//   try {
//     const { name, categoryId, price, unitOfMeasure, tax, description,  imageUrl, kdsStation } = req.body;

//     let catId = categoryId;
//     if (typeof categoryId === 'object' && categoryId?.name) {
//       const newCat = await prisma.productCategory.create({
//         data: { name: categoryId.name, color: categoryId.color || '#6B7280', organizationId: req.user.organizationId },
//       });
//       catId = newCat.id;
//     } else {
//       const cat = await prisma.productCategory.findFirst({
//         where: { id: categoryId, organizationId: req.user.organizationId }
//       });
//       if (!cat) return res.status(404).json({ error: 'Category not found' });
//     }

//     const product = await prisma.product.create({
//       data: {
//         name: name.trim(),
//         categoryId: catId,
//         price:         parseFloat(price),
//         unitOfMeasure: unitOfMeasure || 'piece',
//         tax:           parseFloat(tax) || 0,
//         description:   description?.trim() || null,
//         imageUrl: imageUrl?.trim() || null,
//         kdsStation:    kdsStation || null,
//         organizationId: req.user.organizationId,
//       },
//       include: { category: true },
//     });
//     res.status(201).json(product);
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: 'Something went wrong. Please try again.' });
//   }
// });

// router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
//   try {
//     const { name, categoryId, price, unitOfMeasure, tax, description,  imageUrl,
//  kdsStation } = req.body;
    
//     const existing = await prisma.product.findFirst({
//       where: { id: req.params.id, organizationId: req.user.organizationId }
//     });
//     if (!existing) return res.status(404).json({ error: 'Product not found' });

//     if (categoryId) {
//       const cat = await prisma.productCategory.findFirst({
//         where: { id: categoryId, organizationId: req.user.organizationId }
//       });
//       if (!cat) return res.status(404).json({ error: 'Category not found' });
//     }

//     const product = await prisma.product.update({
//       where: { id: req.params.id },
//       data: {
//         name:          name?.trim(),
//         categoryId,
//         price:         price  ? parseFloat(price)  : undefined,
//         unitOfMeasure: unitOfMeasure || undefined,
//         tax:           tax    ? parseFloat(tax)    : undefined,
//         imageUrl:      imageUrl?.trim() ?? undefined,
//         description:   description?.trim() ?? undefined,
//         kdsStation:    kdsStation ?? undefined,
//       },
//       include: { category: true },
//     });
//     res.json(product);
//   } catch (e) {
//     console.error(e);
//     if (e.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
//     res.status(500).json({ error: 'Something went wrong. Please try again.' });
//   }
// });

// router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
//   try {
//     const existing = await prisma.product.findFirst({
//       where: { id: req.params.id, organizationId: req.user.organizationId }
//     });
//     if (!existing) return res.status(404).json({ error: 'Product not found' });

//     await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
//     res.json({ message: 'Product deactivated' });
//   } catch (e) {
//     console.error(e);
//     if (e.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
//     res.status(500).json({ error: 'Something went wrong. Please try again.' });
//   }
// });

// module.exports = router;



const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validate, rules: v } = require('../middleware/validate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// --------------------------------------------------
// Product validation
// --------------------------------------------------
const productValidation = validate({
  name:       [v.required, v.minLength(2)],
  categoryId: [v.required],
  price:      [v.required, v.isPositive],
});

// --------------------------------------------------
// Product image upload configuration
// --------------------------------------------------

const uploadDir = path.join(
  process.cwd(),
  'uploads',
  'products'
);

// Create directory automatically if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName =
      `product-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;

    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new Error('Only JPG, PNG, and WebP images are allowed')
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// --------------------------------------------------
// GET products
// --------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        organizationId: req.user.organizationId
      },
      include: {
        category: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(products);

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: 'Something went wrong. Please try again.'
    });
  }
});

// --------------------------------------------------
// Frequently together
// --------------------------------------------------
router.get(
  '/frequently-together/:productId',
  verifyToken,
  async (req, res) => {
    try {
      const { productId } = req.params;

      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          organizationId: req.user.organizationId
        }
      });

      if (!product) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      const ordersWithProduct =
        await prisma.orderLine.findMany({
          where: {
            productId,
            order: {
              organizationId: req.user.organizationId
            }
          },
          select: {
            orderId: true
          }
        });

      const orderIds =
        ordersWithProduct.map(o => o.orderId);

      if (orderIds.length === 0) {
        return res.json([]);
      }

      const coProducts =
        await prisma.orderLine.groupBy({
          by: ['productId'],

          where: {
            orderId: {
              in: orderIds
            },
            productId: {
              not: productId
            }
          },

          _count: {
            productId: true
          },

          orderBy: {
            _count: {
              productId: 'desc'
            }
          },

          take: 3
        });

      const productIds =
        coProducts.map(p => p.productId);

      const products =
        await prisma.product.findMany({
          where: {
            id: {
              in: productIds
            },
            isActive: true,
            organizationId: req.user.organizationId
          },
          include: {
            category: true
          }
        });

      const sorted = productIds
        .map(id =>
          products.find(p => p.id === id)
        )
        .filter(Boolean);

      res.json(sorted);

    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: 'Something went wrong'
      });
    }
  }
);

// --------------------------------------------------
// CREATE PRODUCT
// --------------------------------------------------
router.post(
  '/',
  verifyToken,
  requireAdmin,
  upload.single('image'),
  productValidation,
  async (req, res) => {
    try {

      const {
        name,
        categoryId,
        price,
        unitOfMeasure,
        tax,
        description,
        kdsStation
      } = req.body;

      // ----------------------------------------------
      // Category
      // ----------------------------------------------

      let catId = categoryId;

      if (
        typeof categoryId === 'object' &&
        categoryId?.name
      ) {
        const newCat =
          await prisma.productCategory.create({
            data: {
              name: categoryId.name,
              color:
                categoryId.color || '#6B7280',
              organizationId:
                req.user.organizationId
            }
          });

        catId = newCat.id;

      } else {

        const cat =
          await prisma.productCategory.findFirst({
            where: {
              id: categoryId,
              organizationId:
                req.user.organizationId
            }
          });

        if (!cat) {
          return res.status(404).json({
            error: 'Category not found'
          });
        }
      }

      // ----------------------------------------------
      // Image URL
      // ----------------------------------------------

      const imageUrl = req.file
        ? `/uploads/products/${req.file.filename}`
        : null;

      // ----------------------------------------------
      // Create product
      // ----------------------------------------------

      const product =
        await prisma.product.create({
          data: {
            name: name.trim(),

            categoryId: catId,

            price:
              parseFloat(price),

            unitOfMeasure:
              unitOfMeasure || 'piece',

            tax:
              parseFloat(tax) || 0,

            description:
              description?.trim() || null,

            imageUrl,

            kdsStation:
              kdsStation || null,

            organizationId:
              req.user.organizationId
          },

          include: {
            category: true
          }
        });

      res.status(201).json(product);

    } catch (e) {

      console.error(
        'Create product error:',
        e
      );

      res.status(500).json({
        error:
          e.message ||
          'Something went wrong'
      });
    }
  }
);

// --------------------------------------------------
// UPDATE PRODUCT
// --------------------------------------------------
router.put(
  '/:id',
  verifyToken,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {

      const {
        name,
        categoryId,
        price,
        unitOfMeasure,
        tax,
        description,
        kdsStation
      } = req.body;

      const existing =
        await prisma.product.findFirst({
          where: {
            id: req.params.id,
            organizationId:
              req.user.organizationId
          }
        });

      if (!existing) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      // ----------------------------------------------
      // Category validation
      // ----------------------------------------------

      if (categoryId) {

        const cat =
          await prisma.productCategory.findFirst({
            where: {
              id: categoryId,
              organizationId:
                req.user.organizationId
            }
          });

        if (!cat) {
          return res.status(404).json({
            error: 'Category not found'
          });
        }
      }

      // ----------------------------------------------
      // Prepare update
      // ----------------------------------------------

      const updateData = {
        name:
          name?.trim(),

        categoryId:
          categoryId || undefined,

        price:
          price !== undefined
            ? parseFloat(price)
            : undefined,

        unitOfMeasure:
          unitOfMeasure || undefined,

        tax:
          tax !== undefined
            ? parseFloat(tax)
            : undefined,

        description:
          description?.trim() ?? undefined,

        kdsStation:
          kdsStation ?? undefined
      };

      // ----------------------------------------------
      // Replace image only if a new image was uploaded
      // ----------------------------------------------

      if (req.file) {

        updateData.imageUrl =
          `/uploads/products/${req.file.filename}`;

        // Delete old local image
        if (existing.imageUrl) {

          const oldImagePath =
            path.join(
              process.cwd(),
              existing.imageUrl.replace(
                /^\/uploads\//,
                'uploads/'
              )
            );

          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      // ----------------------------------------------
      // Update product
      // ----------------------------------------------

      const product =
        await prisma.product.update({
          where: {
            id: req.params.id
          },

          data: updateData,

          include: {
            category: true
          }
        });

      res.json(product);

    } catch (e) {

      console.error(
        'Update product error:',
        e
      );

      if (e.code === 'P2025') {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      res.status(500).json({
        error:
          e.message ||
          'Something went wrong'
      });
    }
  }
);

// --------------------------------------------------
// DELETE / DEACTIVATE PRODUCT
// --------------------------------------------------
router.delete(
  '/:id',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {

      const existing =
        await prisma.product.findFirst({
          where: {
            id: req.params.id,
            organizationId:
              req.user.organizationId
          }
        });

      if (!existing) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      await prisma.product.update({
        where: {
          id: req.params.id
        },

        data: {
          isActive: false
        }
      });

      res.json({
        message: 'Product deactivated'
      });

    } catch (e) {

      console.error(e);

      if (e.code === 'P2025') {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      res.status(500).json({
        error:
          'Something went wrong'
      });
    }
  }
);

module.exports = router;