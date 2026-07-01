import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { protectAdmin } from '../middlewares/authMiddleware.ts';
import {
  getAllTemplates,
  getTemplateBySlug,
  uploadTemplate,
  downloadTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templateController.ts';

const router = Router();

// Configure multer storage
const upload = multer({
  dest: path.join(process.cwd(), 'server', 'storage', 'uploads', 'temp'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'zipFile' && ext !== '.zip') {
      return cb(new Error('Only ZIP files are allowed') as any, false);
    }
    if (file.fieldname === 'thumbnailFile' && !['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
      return cb(new Error('Only JPG, JPEG, PNG, WEBP, or SVG are allowed for card preview image') as any, false);
    }
    cb(null, true);
  },
});

// Public endpoints
router.get('/', getAllTemplates);
router.get('/:slug', getTemplateBySlug);
router.get('/download/:id', downloadTemplate);

// Protected endpoints (Admin only)
router.post('/upload', protectAdmin, upload.fields([
  { name: 'zipFile', maxCount: 1 },
  { name: 'thumbnailFile', maxCount: 1 }
]), uploadTemplate);
router.patch('/:id', protectAdmin, upload.fields([
  { name: 'thumbnailFile', maxCount: 1 }
]), updateTemplate);
router.delete('/:id', protectAdmin, deleteTemplate);

export default router;
