import fs from 'fs-extra';
import path from 'path';

const LEADS_PATH = path.resolve(process.cwd(), 'data/leads.json');

async function main() {
  const leads = await fs.readJson(LEADS_PATH);
  let count = 0;
  const updated = leads.map((l: any) => {
    if (l.nombre === null || l.nombre === 'null' || l.nombre === '') {
      const numero = l.url.replace('https://wa.me/', '').replace('http://wa.me/', '').trim();
      l.nombre = numero || 'Sin nombre';
      count++;
    }
    return l;
  });
  await fs.writeJson(LEADS_PATH, updated, { spaces: 2 });
  console.log(`✓ ${count} leads actualizados`);
}

main().catch(console.error);
