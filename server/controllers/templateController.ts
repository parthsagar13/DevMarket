import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { Template } from '../models/Template.ts';

// Storage paths setup
const UPLOADS_DIR = path.join(process.cwd(), 'server', 'storage', 'uploads');
const ZIP_DIR = path.join(UPLOADS_DIR, 'zip');
const PREVIEW_DIR = path.join(UPLOADS_DIR, 'preview');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const TEMP_DIR = path.join(UPLOADS_DIR, 'temp');

// Ensure directories exist
[UPLOADS_DIR, ZIP_DIR, PREVIEW_DIR, THUMBNAILS_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper: Slug generator
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Helper: Recursively search for index.html directory
function findIndexHtml(dir: string): string | null {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const result = findIndexHtml(fullPath);
      if (result) return result;
    } else if (file.toLowerCase() === 'index.html') {
      return dir;
    }
  }
  return null;
}

// Helper: Recursively find any image
function findImageFile(dir: string): string | null {
  const files = fs.readdirSync(dir);
  // First pass: scan direct files
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        return fullPath;
      }
    }
  }
  // Second pass: scan directories
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const result = findImageFile(fullPath);
      if (result) return result;
    }
  }
  return null;
}

// Helper: Create SVG fallback thumbnail
function generateSvgThumbnail(title: string, framework: string, category: string, slug: string): string {
  const colors = [
    { start: '#4f46e5', end: '#06b6d4' }, // Indigo to Cyan
    { start: '#ec4899', end: '#f43f5e' }, // Pink to Rose
    { start: '#3b82f6', end: '#8b5cf6' }, // Blue to Purple
    { start: '#10b981', end: '#3b82f6' }, // Emerald to Blue
    { start: '#f59e0b', end: '#e11d48' }, // Amber to Rose
  ];
  const color = colors[title.length % colors.length];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
    <defs>
      <linearGradient id="grad-${slug}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color.start};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color.end};stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.3"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad-${slug})" />
    
    <g opacity="0.12">
      <line x1="0" y1="100" x2="800" y2="100" stroke="#fff" stroke-width="2" />
      <line x1="0" y1="200" x2="800" y2="200" stroke="#fff" stroke-width="2" />
      <line x1="0" y1="300" x2="800" y2="300" stroke="#fff" stroke-width="2" />
      <line x1="0" y1="400" x2="800" y2="400" stroke="#fff" stroke-width="2" />
      <line x1="100" y1="0" x2="100" y2="500" stroke="#fff" stroke-width="2" />
      <line x1="200" y1="0" x2="200" y2="500" stroke="#fff" stroke-width="2" />
      <line x1="300" y1="0" x2="300" y2="500" stroke="#fff" stroke-width="2" />
      <line x1="400" y1="0" x2="400" y2="500" stroke="#fff" stroke-width="2" />
      <line x1="500" y1="0" x2="500" y2="500" stroke="#fff" stroke-width="2" />
      <line x1="600" y1="0" x2="600" y2="500" stroke="#fff" stroke-width="2" />
      <line x1="700" y1="0" x2="700" y2="500" stroke="#fff" stroke-width="2" />
    </g>

    <g transform="translate(100, 100)" filter="url(#shadow)">
      <rect width="600" height="300" rx="16" fill="#ffffff" fill-opacity="0.96" />
      <text x="50" y="80" font-family="'Inter', system-ui, sans-serif" font-weight="800" font-size="36" fill="#0f172a">${title}</text>
      
      <g transform="translate(50, 125)">
        <rect width="110" height="32" rx="6" fill="#f1f5f9" />
        <text x="55" y="20" font-family="'Inter', system-ui, sans-serif" font-weight="600" font-size="13" fill="#475569" text-anchor="middle">${framework}</text>
        
        <g transform="translate(125, 0)">
          <rect width="130" height="32" rx="6" fill="#e0f2fe" />
          <text x="65" y="20" font-family="'Inter', system-ui, sans-serif" font-weight="600" font-size="13" fill="#0369a1" text-anchor="middle">${category}</text>
        </g>
      </g>
      
      <line x1="50" y1="200" x2="550" y2="200" stroke="#e2e8f0" stroke-width="1.5" />
      
      <text x="50" y="245" font-family="'JetBrains Mono', monospace" font-size="12" fill="#94a3b8" letter-spacing="1">PREVIEW ACTIVE</text>
      <text x="550" y="245" font-family="'Inter', system-ui, sans-serif" font-weight="700" font-size="16" fill="#4f46e5" text-anchor="end">CODEMARKET</text>
    </g>
  </svg>`;
}

// Controller: Get all templates
export const getAllTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await Template.find({});
    // Sort by newest first
    templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ message: 'Failed to retrieve templates' });
  }
};

// Controller: Get template by slug
export const getTemplateBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const template = await Template.findOne({ slug });
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(template);
  } catch (error: any) {
    console.error('Error fetching template by slug:', error);
    return res.status(500).json({ message: 'Failed to retrieve template' });
  }
};

// Controller: Upload and process ZIP template
export const uploadTemplate = async (req: Request, res: Response) => {
  try {
    const { title, framework, category, price, isFree } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const zipFile = files?.zipFile?.[0];
    const thumbnailFile = files?.thumbnailFile?.[0];

    if (!title || !framework || !category || !zipFile) {
      // Clean uploaded files if input is invalid
      if (zipFile && fs.existsSync(zipFile.path)) {
        fs.unlinkSync(zipFile.path);
      }
      if (thumbnailFile && fs.existsSync(thumbnailFile.path)) {
        fs.unlinkSync(thumbnailFile.path);
      }
      return res.status(400).json({ message: 'Title, framework, category, and ZIP file are required' });
    }

    const priceNum = Number(price) || 0;
    const isFreeBool = isFree === 'true' || isFree === true;

    // 1. Generate unique slug
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let suffix = 1;
    while (await Template.findOne({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // 2. Generate unique zip filename & move to original uploads dir
    const uniqueZipName = `${slug}-${Date.now()}.zip`;
    const finalZipPath = path.join(ZIP_DIR, uniqueZipName);
    fs.renameSync(zipFile.path, finalZipPath);

    // 3. Extract ZIP to preview destination
    const extractPath = path.join(PREVIEW_DIR, slug);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    try {
      const zip = new AdmZip(finalZipPath);
      zip.extractAllTo(extractPath, true);
    } catch (err: any) {
      console.error('Extraction failed:', err);
      // cleanup zip and thumbnail
      if (fs.existsSync(finalZipPath)) fs.unlinkSync(finalZipPath);
      if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
      return res.status(400).json({ message: 'Invalid ZIP file. Could not extract files.' });
    }

    // 4. Automatically locate the index.html parent directory (website root)
    const detectedRoot = findIndexHtml(extractPath);
    if (!detectedRoot) {
      // Cleanup
      fs.rmSync(extractPath, { recursive: true, force: true });
      fs.unlinkSync(finalZipPath);
      if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
      return res.status(400).json({ message: 'The uploaded ZIP template must contain at least one index.html file' });
    }

    // 5. Card preview image resolution
    let thumbnailFilename = '';
    
    if (thumbnailFile && fs.existsSync(thumbnailFile.path)) {
      // User uploaded a custom thumbnail
      const ext = path.extname(thumbnailFile.originalname).toLowerCase();
      thumbnailFilename = `${slug}-custom-thumb${ext}`;
      fs.renameSync(thumbnailFile.path, path.join(THUMBNAILS_DIR, thumbnailFilename));
    } else {
      // Look for preview image recursively inside extracted folder
      const imagePath = findImageFile(extractPath);
      if (imagePath) {
        // Copy existing image to thumbnails folder
        const ext = path.extname(imagePath).toLowerCase();
        thumbnailFilename = `${slug}-thumb${ext}`;
        fs.copyFileSync(imagePath, path.join(THUMBNAILS_DIR, thumbnailFilename));
      } else {
        // Generate dynamic SVG fallback thumbnail
        thumbnailFilename = `${slug}-thumb.svg`;
        const svgContent = generateSvgThumbnail(title, framework, category, slug);
        fs.writeFileSync(path.join(THUMBNAILS_DIR, thumbnailFilename), svgContent, 'utf-8');
      }
    }

    // Paths and URLs for persistence
    const relativePreviewPath = path.relative(process.cwd(), detectedRoot);
    const thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;
    const previewUrl = `/preview/${slug}`;
    const downloadUrl = `/api/templates/download/${slug}`; // We'll serve via slug for convenience

    // 6. Save metadata to MongoDB
    const newTemplate = await Template.create({
      title,
      slug,
      framework,
      category,
      price: isFreeBool ? 0 : priceNum,
      isFree: isFreeBool,
      thumbnail: thumbnailPath,
      zipFile: uniqueZipName,
      previewPath: relativePreviewPath,
      previewUrl,
      downloadUrl,
      downloadCount: 0,
    });

    return res.status(201).json(newTemplate);
  } catch (error: any) {
    console.error('Error uploading template:', error);
    // Cleanup temporary files if exists
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files) {
      if (files.zipFile?.[0] && fs.existsSync(files.zipFile[0].path)) {
        fs.unlinkSync(files.zipFile[0].path);
      }
      if (files.thumbnailFile?.[0] && fs.existsSync(files.thumbnailFile[0].path)) {
        fs.unlinkSync(files.thumbnailFile[0].path);
      }
    }
    return res.status(500).json({ message: 'Internal server error during template upload' });
  }
};

// Controller: Download ZIP template
export const downloadTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Supports searching by id or slug
    let template = await Template.findById(id);
    if (!template) {
      template = await Template.findOne({ slug: id });
    }

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const zipFilePath = path.join(ZIP_DIR, template.zipFile);
    if (!fs.existsSync(zipFilePath)) {
      return res.status(404).json({ message: 'Original ZIP file not found on the server' });
    }

    // Increase download count
    await Template.findByIdAndUpdate(template.id || template._id, {
      downloadCount: (template.downloadCount || 0) + 1,
    });

    // Send original zip file for download
    return res.download(zipFilePath, `${template.slug}.zip`);
  } catch (error: any) {
    console.error('Download error:', error);
    return res.status(500).json({ message: 'Failed to download template' });
  }
};

// Controller: Update template metadata
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, framework, category, price, isFree } = req.body;

    const template = await Template.findById(id);
    if (!template) {
      // Cleanup uploaded file if template doesn't exist
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files?.thumbnailFile?.[0] && fs.existsSync(files.thumbnailFile[0].path)) {
        fs.unlinkSync(files.thumbnailFile[0].path);
      }
      return res.status(404).json({ message: 'Template not found' });
    }

    const isFreeBool = isFree === 'true' || isFree === true;
    const priceNum = isFreeBool ? 0 : (Number(price) || 0);

    // Check if new thumbnail is uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const thumbnailFile = files?.thumbnailFile?.[0];
    let thumbnailPath = template.thumbnail;

    if (thumbnailFile && fs.existsSync(thumbnailFile.path)) {
      const ext = path.extname(thumbnailFile.originalname).toLowerCase();
      // Generate a filename with timestamp to avoid caching issues
      const thumbnailFilename = `${template.slug}-custom-thumb-${Date.now()}${ext}`;
      const finalThumbPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
      fs.renameSync(thumbnailFile.path, finalThumbPath);
      thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;

      // Try to clean up the old thumbnail file if it exists and is not the default SVG
      try {
        const oldFilename = path.basename(template.thumbnail);
        const oldThumbPath = path.join(THUMBNAILS_DIR, oldFilename);
        if (fs.existsSync(oldThumbPath) && !template.thumbnail.endsWith('.svg')) {
          fs.unlinkSync(oldThumbPath);
        }
      } catch (e) {
        console.warn('Could not delete old thumbnail:', e);
      }
    }

    // Update database record
    await Template.findByIdAndUpdate(id, {
      title: title || template.title,
      framework: framework || template.framework,
      category: category || template.category,
      price: priceNum,
      isFree: isFreeBool,
      thumbnail: thumbnailPath,
    });

    const freshTemplate = await Template.findById(id);
    return res.json(freshTemplate);
  } catch (error: any) {
    console.error('Update template error:', error);
    // Cleanup files if error occurred
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files?.thumbnailFile?.[0] && fs.existsSync(files.thumbnailFile[0].path)) {
      fs.unlinkSync(files.thumbnailFile[0].path);
    }
    return res.status(500).json({ message: 'Failed to update template' });
  }
};

// Controller: Delete template
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Delete database entry
    await Template.findByIdAndDelete(id);

    // Try to cleanup files from disk safely
    try {
      const zipFilePath = path.join(ZIP_DIR, template.zipFile);
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }

      // Extract path cleanup
      const folderName = template.slug;
      const previewExtractPath = path.join(PREVIEW_DIR, folderName);
      if (fs.existsSync(previewExtractPath)) {
        fs.rmSync(previewExtractPath, { recursive: true, force: true });
      }

      // Thumbnail file cleanup
      const thumbnailFilename = path.basename(template.thumbnail);
      const thumbFilePath = path.join(THUMBNAILS_DIR, thumbnailFilename);
      if (fs.existsSync(thumbFilePath)) {
        fs.unlinkSync(thumbFilePath);
      }
    } catch (cleanupErr) {
      console.warn('Error during file deletion cleanup:', cleanupErr);
    }

    return res.json({ message: 'Template and all related assets deleted successfully' });
  } catch (error: any) {
    console.error('Delete template error:', error);
    return res.status(500).json({ message: 'Failed to delete template' });
  }
};
