import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs-extra';

const logger = pino({ level: 'info' });

let sock: any = null;
let isConnected = false;

export async function connectToWhatsApp() {
  const authPath = path.resolve(process.cwd(), 'auth');
  await fs.ensureDir(authPath);

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Pablo Bot', 'Chrome', '120.0.0'],
    logger,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: any) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada debido a ', lastDisconnect?.error, ', reconectando: ', shouldReconnect);
      isConnected = false;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp conectado ✓');
      isConnected = true;
    }
  });

  return sock;
}

export async function sendMessage(jid: string, text: string) {
  if (!sock || !isConnected) {
    throw new Error('WhatsApp no está conectado');
  }

  // Simular tiempo de tipeo (2-3 segundos)
  const typingTime = Math.floor(Math.random() * 1000) + 2000;
  await sock.sendPresenceUpdate('composing', jid);
  await new Promise(resolve => setTimeout(resolve, typingTime));
  await sock.sendPresenceUpdate('paused', jid);

  await sock.sendMessage(jid, { text });
}

export function getIsConnected() {
  return isConnected;
}

export function extractJidFromUrl(url: string): string {
  // de "https://wa.me/56912345678" extraer "56912345678"
  const number = url.split('/').pop()?.replace(/[^0-9]/g, '');
  if (!number) throw new Error('URL de WhatsApp inválida');
  return `${number}@s.whatsapp.net`;
}
