import cron from 'node-cron';
import { DateTime } from 'luxon';
import fs from 'fs-extra';
import path from 'path';
import { sendMessage, extractJidFromUrl, getIsConnected } from './whatsapp.js';
import { getRandomMessage } from './messages.js';
import { Lead, DailyCount, LastSent } from './types.js';

const DAILY_COUNT_PATH = path.resolve(process.cwd(), 'data/daily_count.json');
const LAST_SENT_PATH = path.resolve(process.cwd(), 'data/last_sent.json');
const LEADS_PATH = path.resolve(process.cwd(), 'data/leads.json');
const SEND_LOG_PATH = path.resolve(process.cwd(), 'data/send_log.json');

async function getLeads(): Promise<Lead[]> {
  if (await fs.pathExists(LEADS_PATH)) {
    return await fs.readJson(LEADS_PATH);
  }
  return [];
}

async function saveLeads(leads: Lead[]) {
  await fs.writeJson(LEADS_PATH, leads);
}

async function getDailyCount(): Promise<DailyCount> {
  const today = DateTime.now().setZone('America/Santiago').toISODate()!;
  if (await fs.pathExists(DAILY_COUNT_PATH)) {
    const data: DailyCount = await fs.readJson(DAILY_COUNT_PATH);
    if (data.date === today) return data;
  }
  return { date: today, count: 0 };
}

async function updateDailyCount(count: number) {
  const today = DateTime.now().setZone('America/Santiago').toISODate()!;
  await fs.writeJson(DAILY_COUNT_PATH, { date: today, count });
}

async function getLastSent(): Promise<LastSent | null> {
  if (await fs.pathExists(LAST_SENT_PATH)) {
    return await fs.readJson(LAST_SENT_PATH);
  }
  return null;
}

async function updateLastSent() {
  await fs.writeJson(LAST_SENT_PATH, { timestamp: DateTime.now().toISO() });
}

export let schedulerRunning = true;

export function startBot() {
  schedulerRunning = true;
  console.log('Bot iniciado ✓');
}

export function stopBot() {
  schedulerRunning = false;
  console.log('Bot detenido ✓');
}

export function startScheduler() {
  console.log('Scheduler iniciado ✓');

  cron.schedule('*/10 * * * * *', async () => {
    if (!schedulerRunning) return;

    try {
      const now = DateTime.now().setZone('America/Santiago');

      // Leer config desde archivo
      const configPath = path.resolve(process.cwd(), 'data/bot_config.json');
      const config = (await fs.pathExists(configPath))
        ? await fs.readJson(configPath)
        : { maxDaily: 20, startHour: 9, endHour: 18, allowedDays: [1,2,3,4,5] };

      // Validar horario
      if (now.hour < config.startHour || now.hour >= config.endHour) return;

      // Validar día
      if (!config.allowedDays.includes(now.weekday)) return;

      if (!getIsConnected()) {
        console.log('Esperando conexión de WhatsApp...');
        return;
      }

      const daily = await getDailyCount();
      if (daily.count >= config.maxDaily) {
        console.log(`Límite diario alcanzado (${config.maxDaily}). Esperando al día siguiente.`);
        return;
      }

      const lastSent = await getLastSent();
      if (lastSent) {
        const lastSentTime = DateTime.fromISO(lastSent.timestamp);
        const diffSeconds = now.diff(lastSentTime, 'seconds').seconds;
        const nextInterval = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
        if (diffSeconds < nextInterval) return;
      }

      console.log('Buscando prospectos...');
      const leads = await getLeads();

      const targetLeadIndex = leads.findIndex(l => {
        return l.estado === 'frio' &&
               l.url.includes('wa.me') &&
               (!l.f3 || l.f3.dm1_enviado === false);
      });

      if (targetLeadIndex === -1) {
        console.log('No hay prospectos pendientes.');
        return;
      }

      const targetLead = leads[targetLeadIndex];
      console.log(`Enviando mensaje a: ${targetLead.nombre || 'Sin nombre'} (${targetLead.url})`);

      const jid = extractJidFromUrl(targetLead.url);
      const { text, id: msgId } = await getRandomMessage(targetLead as any);

      await sendMessage(jid, text);
      console.log(`Mensaje enviado (ID: ${msgId}) ✓`);

      targetLead.f3.dm1_enviado = true;
      targetLead.f3.fechaEnvio = DateTime.now().toISO()!;
      targetLead.estado = 'dm';
      targetLead.updatedAt = DateTime.now().toISO()!;

      leads[targetLeadIndex] = targetLead;
      await saveLeads(leads);
      console.log('Leads local actualizado ✓');

      const logs = (await fs.pathExists(SEND_LOG_PATH)) ? await fs.readJson(SEND_LOG_PATH) : [];
      logs.unshift({
        timestamp: DateTime.now().toISO(),
        nombre: targetLead.nombre || null,
        url: targetLead.url,
        mensaje_id: msgId,
        estado: 'enviado',
      });
      await fs.writeJson(SEND_LOG_PATH, logs, { spaces: 2 });

      await updateDailyCount(daily.count + 1);
      await updateLastSent();

    } catch (error) {
      console.error('Error en el scheduler:', error);
    }
  });
}
