const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// --------------------------------------------------
// Category image upload configuration
// --------------------------------------------------

const uploadDir = path.join(process.cwd(), 'uploads', 'categories');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `category-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, and WebP images are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// --------------------------------------------------
// GET categories
// --------------------------------------------------
router.get('/', verifyToken, async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// --------------------------------------------------
// CREATE CATEGORY (Updated with Image Upload)
// --------------------------------------------------
router.post('/', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const normalized = name.trim();
    const exists = await prisma.productCategory.findFirst({
      where: { name: { equals: normalized, mode: 'insensitive' }, organizationId: req.user.organizationId }
    });
    
    if (exists) return res.status(400).json({ error: 'Category name already exists' });

    // 👇 Get image URL from req.file
    const imageUrl = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const cat = await prisma.productCategory.create({
      data: { 
        name: normalized, 
        color: color || '#6B7280', 
        imageUrl, // 👈 Pass it to Prisma
        organizationId: req.user.organizationId 
      }
    });
    res.status(201).json(cat);
  } catch (e) { 
    console.error('Create category error:', e);
    res.status(500).json({ error: 'Something went wrong' }); 
  }
});

// --------------------------------------------------
// UPDATE CATEGORY (Updated with Image Upload)
// --------------------------------------------------
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), async (req, res) => {
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

    const updateData = {
      name: name ? name.trim() : undefined,
      color,
    };

    // 👇 Handle image replacement
    if (req.file) {
      updateData.imageUrl = `/uploads/categories/${req.file.filename}`;

      // Delete old image
      if (existing.imageUrl) {
        const oldImagePath = path.join(
          process.cwd(),
          existing.imageUrl.replace(/^\/uploads\//, 'uploads/')
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const cat = await prisma.productCategory.update({
      where: { id: req.params.id },
      data: updateData
    });
    res.json(cat);
  } catch (e) { 
    console.error('Update category error:', e);
    res.status(500).json({ error: 'Something went wrong' }); 
  }
});

// --------------------------------------------------
// DELETE CATEGORY
// --------------------------------------------------
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.productCategory.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId }
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    // Optional: Delete image file
    if (existing.imageUrl) {
      const imagePath = path.join(process.cwd(), existing.imageUrl.replace(/^\/uploads\//, 'uploads/'));
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await prisma.productCategory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;