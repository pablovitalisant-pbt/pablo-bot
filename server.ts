import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import { connectToWhatsApp } from './src/whatsapp.js';
import { startScheduler } from './src/scheduler.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Asegurar directorios
  await fs.ensureDir(path.resolve(process.cwd(), 'data'));
  await fs.ensureDir(path.resolve(process.cwd(), 'auth'));

  // API routes
  app.get('/api/status', (req, res) => {
    res.json({ status: 'running', time: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    
    try {
      // Iniciar WhatsApp
      await connectToWhatsApp();
      
      // Iniciar Scheduler
      startScheduler();
    } catch (error) {
      console.error('Error al iniciar servicios:', error);
    }
  });
}

startServer();
