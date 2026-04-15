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

  // Asegurar directorios y archivos
  await fs.ensureDir(path.resolve(process.cwd(), 'data'));
  await fs.ensureDir(path.resolve(process.cwd(), 'auth'));
  
  const leadsPath = path.resolve(process.cwd(), 'data/leads.json');
  if (!(await fs.pathExists(leadsPath))) {
    await fs.writeJson(leadsPath, []);
  }

  app.use(express.json());

  // API routes
  app.get('/api/status', (req, res) => {
    res.json({ status: 'running', time: new Date().toISOString() });
  });

  app.get('/api/leads', async (req, res) => {
    try {
      const leads = await fs.readJson(leadsPath);
      res.json({ ok: true, result: leads });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Error al leer leads' });
    }
  });

  app.post('/api/leads', async (req, res) => {
    try {
      const newLead = req.body;
      const leads = await fs.readJson(leadsPath);
      leads.push(newLead);
      await fs.writeJson(leadsPath, leads);
      res.json({ ok: true, result: newLead });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Error al guardar lead' });
    }
  });

  app.put('/api/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updatedLead = req.body;
      let leads = await fs.readJson(leadsPath);
      leads = leads.map((l: any) => String(l.id) === String(id) ? updatedLead : l);
      await fs.writeJson(leadsPath, leads);
      res.json({ ok: true, result: updatedLead });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Error al actualizar lead' });
    }
  });

  app.delete('/api/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let leads = await fs.readJson(leadsPath);
      leads = leads.filter((l: any) => String(l.id) !== String(id));
      await fs.writeJson(leadsPath, leads);
      res.json({ ok: true, result: { id } });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Error al eliminar lead' });
    }
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
