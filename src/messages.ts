import fs from 'fs-extra';
import path from 'path';
import { Message, Lead } from './types.js';

export async function getRandomMessage(lead: Lead): Promise<{ text: string; id: number }> {
  const messagesPath = path.resolve(process.cwd(), 'data/messages.json');
  const messages: Message[] = await fs.readJson(messagesPath);

  const randomIndex = Math.floor(Math.random() * messages.length);
  const selected = messages[randomIndex];

  let text = '';
  if (lead.nombre && lead.nombre.trim() !== '') {
    text = selected.con_nombre.replace(/{nombre}/g, lead.nombre.trim());
  } else {
    text = selected.generico;
  }

  return { text, id: selected.id };
}
