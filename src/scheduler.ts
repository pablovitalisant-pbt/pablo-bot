import cron from 'node-cron';
import { DateTime } from 'luxon';
import fs from 'fs-extra';
import path from 'path';
import { sendMessage, extractJidFromUrl, getIsConnected } from './whatsapp.js';
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

  const DM_INTERVALS = [0, 3, 7, 12, 21]; // días desde fechaEnvio del DM1

  cron.schedule('*/10 * * * * *', async () => {
    if (!schedulerRunning) return;

    try {
      const now = DateTime.now().setZone('America/Santiago');

      const configPath = path.resolve(process.cwd(), 'data/bot_config.json');
      const config = (await fs.pathExists(configPath))
        ? await fs.readJson(configPath)
        : { maxDaily: 20, startHour: 9, endHour: 18, allowedDays: [1,2,3,4,5] };

      if (now.hour < config.startHour || now.hour >= config.endHour) return;
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
        const diffSeconds = now.diff(DateTime.fromISO(lastSent.timestamp), 'seconds').seconds;
        const nextInterval = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
        if (diffSeconds < nextInterval) return;
      }

      const leads = await getLeads();
      const messagesPath = path.resolve(process.cwd(), 'data/messages.json');
      const allMessages = await fs.readJson(messagesPath);

      // ── Prioridad 1: DMs de seguimiento (DM2–DM5) ──────────────────────
      const followUpLead = leads.find(l => {
        if (l.estado !== 'dm') return false;
        if (!l.f3?.dm1_enviado || !l.f3?.fechaEnvio) return false;
        if (l.f3?.dm1_respondio) return false; // respondió, no seguir

        const baseDate = DateTime.fromISO(l.f3.fechaEnvio);
        const dms = l.f4?.dms || [];

        for (let i = 0; i < dms.length; i++) {
          if (dms[i].e) continue; // ya enviado
          const dueDate = baseDate.plus({ days: DM_INTERVALS[i + 1] });
          if (now >= dueDate) return true; // toca enviar este
        }
        return false;
      });

      if (followUpLead) {
        const baseDate = DateTime.fromISO(followUpLead.f3.fechaEnvio!);
        const dms = followUpLead.f4!.dms;
        let dmIndex = -1;
        for (let i = 0; i < dms.length; i++) {
          if (dms[i].e) continue;
          const dueDate = baseDate.plus({ days: DM_INTERVALS[i + 1] });
          if (now >= dueDate) { dmIndex = i; break; }
        }

        const dmNumber = dmIndex + 2; // DM2=índice0, DM3=índice1, etc.
        const dmMessages = allMessages.filter((m: any) => m.dm === dmNumber);
        const msg = dmMessages[Math.floor(Math.random() * dmMessages.length)];
        const text = followUpLead.nombre
          ? msg.con_nombre.replace('{nombre}', followUpLead.nombre)
          : msg.generico;

        const jid = extractJidFromUrl(followUpLead.url);
        await sendMessage(jid, text);
        console.log(`Seguimiento DM${dmNumber} enviado a: ${followUpLead.nombre || followUpLead.url} ✓`);

        const leads2 = await getLeads();
        const idx = leads2.findIndex((l: any) => String(l.id) === String(followUpLead.id));
        if (idx !== -1) {
          leads2[idx].f4.dms[dmIndex].e = true;
          leads2[idx].f4.dms[dmIndex].fechaEnvio = now.toISO();
          leads2[idx].updatedAt = now.toISO();
          await saveLeads(leads2);
        }

        const logs = (await fs.pathExists(SEND_LOG_PATH)) ? await fs.readJson(SEND_LOG_PATH) : [];
        logs.unshift({ timestamp: now.toISO(), nombre: followUpLead.nombre || null, url: followUpLead.url, mensaje_id: msg.id, dm: dmNumber, estado: 'seguimiento' });
        await fs.writeJson(SEND_LOG_PATH, logs, { spaces: 2 });

        await updateDailyCount(daily.count + 1);
        await updateLastSent();
        return;
      }

      // ── Prioridad 2: DM1 nuevos leads fríos ────────────────────────────
      const dm1Messages = allMessages.filter((m: any) => m.dm === 1);
      const targetLeadIndex = leads.findIndex((l: any) =>
        l.estado === 'frio' &&
        l.url.includes('wa.me') &&
        (!l.f3 || l.f3.dm1_enviado === false)
      );

      if (targetLeadIndex === -1) {
        console.log('No hay prospectos pendientes.');
        return;
      }

      const targetLead = leads[targetLeadIndex];
      console.log(`Enviando DM1 a: ${targetLead.nombre || 'Sin nombre'} (${targetLead.url})`);

      const msg = dm1Messages[Math.floor(Math.random() * dm1Messages.length)];
      const text = targetLead.nombre
        ? msg.con_nombre.replace('{nombre}', targetLead.nombre)
        : msg.generico;

      const jid = extractJidFromUrl(targetLead.url);
      await sendMessage(jid, text);
      console.log(`DM1 enviado (msg ID: ${msg.id}) ✓`);

      targetLead.f3.dm1_enviado = true;
      targetLead.f3.fechaEnvio = now.toISO();
      targetLead.estado = 'dm';
      targetLead.updatedAt = now.toISO();
      leads[targetLeadIndex] = targetLead;
      await saveLeads(leads);

      const logs = (await fs.pathExists(SEND_LOG_PATH)) ? await fs.readJson(SEND_LOG_PATH) : [];
      logs.unshift({ timestamp: now.toISO(), nombre: targetLead.nombre || null, url: targetLead.url, mensaje_id: msg.id, dm: 1, estado: 'enviado' });
      await fs.writeJson(SEND_LOG_PATH, logs, { spaces: 2 });

      await updateDailyCount(daily.count + 1);
      await updateLastSent();

    } catch (error) {
      console.error('Error en el scheduler:', error);
    }
  });
}
