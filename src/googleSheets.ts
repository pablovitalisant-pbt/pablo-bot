import { google } from 'googleapis';
import { Lead } from './types.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Missing Google Service Account credentials');
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: SCOPES,
  });
}

const sheets = google.sheets('v4');

export async function getLeads(): Promise<Lead[]> {
  const auth = getAuth();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: 'Prospectos!A:Q',
  });

  const rows = response.data.values;
  if (!rows || rows.length <= 1) return [];

  const leads: Lead[] = [];
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0];
    const nombre = row[1] || null;
    const url = row[3] || '';
    const estado = row[8] || '';
    const f3 = row[12] || '{}';

    if (!url.includes('wa.me')) continue;

    leads.push({
      id,
      nombre,
      url,
      estado,
      fases: f3,
      rowIndex: i + 1,
    } as any);
  }

  return leads;
}

export async function updateLead(rowIndex: number, estado: string, f3: object) {
  const auth = getAuth();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId,
    range: `Prospectos!I${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[estado]],
    },
  });

  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId,
    range: `Prospectos!M${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[JSON.stringify(f3)]],
    },
  });
}
