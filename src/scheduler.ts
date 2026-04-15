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

export let schedulerRunning = false;

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

  // Cada 1 minuto
  cron.schedule('* * * * *', async () => {
    if (!schedulerRunning) return;

    try {
      const now = DateTime.now().setZone('America/Santiago');
      
      // Horario permitido: 9:00 AM a 6:00 PM
      if (now.hour < 9 || now.hour >= 18) return;
      
      // Días permitidos: lunes (1) a viernes (5)
      if (now.weekday < 1 || now.weekday > 5) return;

      if (!getIsConnected()) {
        console.log('Esperando conexión de WhatsApp...');
        return;
      }

      // Revisar límite diario
      const daily = await getDailyCount();
      const maxDaily = parseInt(process.env.MAX_DAILY || '20');
      if (daily.count >= maxDaily) {
        console.log(`Límite diario alcanzado (${maxDaily}). Esperando al día siguiente.`);
        return;
      }

      // Revisar intervalo entre mensajes (25-45 minutos)
      const lastSent = await getLastSent();
      if (lastSent) {
        const lastSentTime = DateTime.fromISO(lastSent.timestamp);
        const diffMinutes = now.diff(lastSentTime, 'minutes').minutes;
        
        // Generar un intervalo aleatorio para la espera
        // Nota: Para simplificar, si no ha pasado el mínimo (25), salimos.
        // El intervalo exacto se "cumple" cuando diffMinutes > randomInterval.
        // Pero como el cron corre cada minuto, podemos simplemente chequear contra un valor guardado o aleatorio.
        const nextInterval = Math.floor(Math.random() * (45 - 25 + 1)) + 25;
        if (diffMinutes < nextInterval) return;
      }

      // Si llegamos aquí, es momento de enviar
      console.log('Buscando prospectos...');
      const leads = await getLeads();
      
      // Filtrar leads: estado == "frio" Y url incluye "wa.me" Y f3.dm1_enviado == false
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

      // Actualizar Lead localmente
      targetLead.f3.dm1_enviado = true;
      targetLead.f3.fechaEnvio = DateTime.now().toISO()!;
      targetLead.estado = 'dm';
      targetLead.updatedAt = DateTime.now().toISO()!;
      
      leads[targetLeadIndex] = targetLead;
      await saveLeads(leads);
      console.log('Leads local actualizado ✓');

      // Actualizar contadores
      await updateDailyCount(daily.count + 1);
      await updateLastSent();

    } catch (error) {
      console.error('Error en el scheduler:', error);
    }
  });
}
