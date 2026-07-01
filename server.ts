import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Load environment variables
dotenv.config();

import authRoutes from './server/routes/authRoutes.ts';
import templateRoutes from './server/routes/templateRoutes.ts';
import { seedAdminIfNeeded } from './server/controllers/authController.ts';
import { Template } from './server/models/Template.ts';

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());
  
  // Configure helmet safely for iframe previews
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false, // Essential for AI Studio iframe preview to load
    })
  );
  
  app.use(morgan('dev'));

  // Seed Admin on startup
  try {
    await seedAdminIfNeeded();
  } catch (err) {
    console.error('Failed to seed admin on startup:', err);
  }

  // 1. Static Thumbnails Serving
  const thumbnailsDir = path.join(process.cwd(), 'server', 'storage', 'uploads', 'thumbnails');
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }
  app.use('/uploads/thumbnails', express.static(thumbnailsDir));

  // Helper to serve HTML files with base tags and rewritten root-relative paths on the fly
  const serveHtmlFile = (filePath: string, slug: string, res: express.Response) => {
    try {
      let html = fs.readFileSync(filePath, 'utf8');
      
      // 1. Inject <base href="/preview/${slug}/"> right after <head> to guarantee correct relative path resolution
      const baseTag = `<base href="/preview/${slug}/">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>\n    ${baseTag}`);
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>\n    ${baseTag}`);
      } else {
        html = `${baseTag}\n${html}`;
      }

      // 2. Rewrite root-relative URLs (e.g. href="/css/main.css" -> href="/preview/slug/css/main.css")
      // Matches src="/something" and href="/something", ignoring external URLs (http, //) or already-prefixed paths (/preview/)
      html = html.replace(/(src|href)="\/((?![\/]|preview\/)[^"]*)"/g, `$1="/preview/${slug}/$2"`);
      html = html.replace(/(src|href)='\/((?![\/]|preview\/)[^']*)'/g, `$1='/preview/${slug}/$2'`);

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (err) {
      console.error('Error reading HTML file for preview rewriting:', err);
      return res.status(500).send('Error preparing preview');
    }
  };

  // 2. Custom Live Preview route handler (secure and robust)
  app.use('/preview/:slug', async (req, res, next) => {
    try {
      const { slug } = req.params;
      const template = await Template.findOne({ slug });
      if (!template) {
        return res.status(404).send('Template preview not found');
      }

      // 1. Handle missing trailing slash for the base route to ensure asset resolution works perfectly
      const [urlPath, queryStr] = req.originalUrl.split('?');
      if (urlPath === `/preview/${slug}`) {
        return res.redirect(301, `/preview/${slug}/${queryStr ? '?' + queryStr : ''}`);
      }

      // Serve files from previewPath (which points to extracted index.html directory)
      const relativePath = req.path;
      const fullPath = path.join(process.cwd(), template.previewPath, relativePath);

      // Traversal Guard
      const resolvedPath = path.resolve(fullPath);
      const resolvedPreviewBase = path.resolve(path.join(process.cwd(), template.previewPath));
      if (!resolvedPath.startsWith(resolvedPreviewBase)) {
        return res.status(403).send('Access Forbidden');
      }

      if (fs.existsSync(resolvedPath)) {
        const stat = fs.statSync(resolvedPath);
        if (stat.isDirectory()) {
          const indexPath = path.join(resolvedPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            return serveHtmlFile(indexPath, slug, res);
          } else {
            return res.status(404).send('Template index file not found');
          }
        }

        // If serving any HTML file, rewrite on-the-fly to fix paths
        if (resolvedPath.endsWith('.html') || resolvedPath.endsWith('.htm')) {
          return serveHtmlFile(resolvedPath, slug, res);
        }

        return res.sendFile(resolvedPath);
      } else {
        return res.status(404).send('Template asset not found');
      }
    } catch (err) {
      console.error('Error serving template preview:', err);
      next(err);
    }
  });

  // 3. API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/templates', templateRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // 4. Vite Dev Server / Production Build static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving compiled client files in production mode');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});
