import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import * as whatsapp from './src/whatsapp.js';
import { startScheduler, startBot, stopBot, schedulerRunning } from './src/scheduler.js';

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

  // Bot control endpoints
  app.post('/api/bot/start', (req, res) => {
    startBot();
    res.json({ ok: true, status: 'running' });
  });

  app.post('/api/bot/stop', (req, res) => {
    stopBot();
    res.json({ ok: true, status: 'stopped' });
  });

  app.get('/api/bot/status', async (req, res) => {
    const DAILY_COUNT_PATH = path.resolve(process.cwd(), 'data/daily_count.json');
    let dailyCount = 0;
    try {
      if (await fs.pathExists(DAILY_COUNT_PATH)) {
        const data = await fs.readJson(DAILY_COUNT_PATH);
        const today = new Date().toISOString().slice(0, 10);
        if (data.date === today) dailyCount = data.count;
      }
    } catch {}
    res.json({
      ok: true,
      running: schedulerRunning,
      dailyCount,
      maxDaily: parseInt(process.env.MAX_DAILY || '20'),
    });
  });

  // QR endpoint
  app.get('/qr', (req, res) => {
    const qr = whatsapp.currentQR;
    res.setHeader('Content-Type', 'text/html');
    if (qr) {
      res.send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>WhatsApp QR</title></head>
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;background:#f0f0f0;">
  <h2>Escanea este QR con WhatsApp</h2>
  <img src="${qr}" style="width:300px;height:300px;border:8px solid white;border-radius:8px;">
  <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;font-size:16px;cursor:pointer;">Recargar</button>
</body>
</html>`);
    } else {
      res.send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>WhatsApp QR</title><meta http-equiv="refresh" content="5"></head>
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;background:#f0f0f0;">
  <h2 id="msg">Esperando QR... recarga en 5 segundos</h2>
  <script>
    fetch('/api/status').then(() => {
      document.getElementById('msg').textContent = 'WhatsApp ya está conectado ✓';
    });
  </script>
</body>
</html>`);
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
      await whatsapp.connectToWhatsApp();
      
      // Iniciar Scheduler
      startScheduler();
    } catch (error) {
      console.error('Error al iniciar servicios:', error);
    }
  });
}

startServer();
