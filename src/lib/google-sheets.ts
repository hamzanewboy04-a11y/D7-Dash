import { google } from 'googleapis';

let connectionSettings: { settings: { expires_at?: string; access_token?: string; oauth?: { credentials?: { access_token?: string } } } } | null = null;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

export async function getGoogleSheetsClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export interface AgencyBalanceRow {
  date: string;
  agency: string;
  topUp: number;
  spend: number;
  balance: number;
}

export async function getAgencyBalancesFromSheet(
  spreadsheetId: string,
  sheetName: string,
  range: string = 'A:E'
): Promise<AgencyBalanceRow[]> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${range}`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    const result: AgencyBalanceRow[] = [];

    for (const row of dataRows) {
      if (!row[0]) continue;

      result.push({
        date: String(row[0] || ''),
        agency: String(row[1] || ''),
        topUp: parseFloat(String(row[2] || '0').replace(/[^\d.-]/g, '')) || 0,
        spend: parseFloat(String(row[3] || '0').replace(/[^\d.-]/g, '')) || 0,
        balance: parseFloat(String(row[4] || '0').replace(/[^\d.-]/g, '')) || 0,
      });
    }

    return result;
  } catch (error) {
    console.error('Error reading Google Sheet:', error);
    throw error;
  }
}

export async function getCurrentAgencyBalances(
  spreadsheetId: string,
  sheetName: string
): Promise<Record<string, number>> {
  const rows = await getAgencyBalancesFromSheet(spreadsheetId, sheetName);
  
  const latestBalances: Record<string, number> = {};
  
  for (const row of rows) {
    if (row.agency) {
      latestBalances[row.agency.toUpperCase()] = row.balance;
    }
  }
  
  return latestBalances;
}

export async function getSheetInfo(spreadsheetId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map((s: { properties?: { title?: string; sheetId?: number } }) => ({
        title: s.properties?.title,
        sheetId: s.properties?.sheetId,
      })),
    };
  } catch (error) {
    console.error('Error getting sheet info:', error);
    throw error;
  }
}
