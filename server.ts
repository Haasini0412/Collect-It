import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes';
import { db } from './server/db';
import { seedDemoData } from './server/seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase body parser limit for bulk rosters (up to 5,000 rows)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initial seed if fresh
try {
  const existingGroups = db.listGroupsByOwner('demo-lead-uid');
  if (existingGroups.length === 0) {
    seedDemoData('demo-lead-uid');
    console.log('🌱 Seeded initial demo groups and collections for Demo Lead.');
  }
} catch (e) {
  console.error('Error during initial demo seed:', e);
}

// Mount API routes
app.use('/api', apiRouter);

// Frontend Vite Dev / Prod static serving
async function setupFrontend() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CollectIt Server running on http://0.0.0.0:${PORT}`);
  });
}

setupFrontend().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
