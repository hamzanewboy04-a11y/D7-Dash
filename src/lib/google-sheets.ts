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

export interface CrossgifData {
  canUseBalance: number;
  remainingBalance: number;
  dailySpends: { date: string; amount: number }[];
  totalSpend: number;
  desks: { name: string; id: string; canUse: number }[];
}

function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  return parseFloat(cleaned) || 0;
}

export async function getCrossgifData(
  spreadsheetId: string,
  sheetName: string = '1/2026'
): Promise<CrossgifData> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const balanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:AP30`,
    });

    const rows = balanceResponse.data.values || [];
    
    let canUseBalance = 0;
    let remainingBalance = 0;
    const dailySpends: { date: string; amount: number }[] = [];
    const desks: { name: string; id: string; canUse: number }[] = [];

    const headerRow = rows[2] || [];
    const summaryRow = rows[3] || [];
    
    // Column F (index 5) = "Can Use", Column G (index 6) = "The remaining balance" (actual balance)
    canUseBalance = parseNumber(summaryRow[5]);
    remainingBalance = parseNumber(summaryRow[6]);
    
    const dateStartCol = 32;
    for (let i = dateStartCol; i < headerRow.length; i++) {
      const dateLabel = headerRow[i];
      const spendValue = parseNumber(summaryRow[i]);
      if (dateLabel && spendValue > 0) {
        dailySpends.push({
          date: String(dateLabel),
          amount: spendValue,
        });
      }
    }

    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[1]) continue;
      
      const deskName = row[3] || '';
      const deskId = row[4] || '';
      const deskCanUse = parseNumber(row[2]);
      
      if (deskName && String(deskName).includes('Desk')) {
        desks.push({
          name: String(deskName),
          id: String(deskId),
          canUse: deskCanUse,
        });
      }
    }

    const totalSpend = dailySpends.reduce((sum, d) => sum + d.amount, 0);

    return {
      canUseBalance,
      remainingBalance,
      dailySpends,
      totalSpend,
      desks,
    };
  } catch (error) {
    console.error('Error reading Crossgif sheet:', error);
    throw error;
  }
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

    const dataRows = rows.slice(1);

    const result: AgencyBalanceRow[] = [];

    for (const row of dataRows) {
      if (!row[0]) continue;

      result.push({
        date: String(row[0] || ''),
        agency: String(row[1] || ''),
        topUp: parseNumber(row[2]),
        spend: parseNumber(row[3]),
        balance: parseNumber(row[4]),
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

export interface FbmData {
  perMonth: number;
  dailySpends: { day: number; amount: number }[];
  totalBalance: number;
  accounts: { date: string; bayer: string; ads: string; status: string; deposit: number; balance: number }[];
}

export async function getFbmData(
  spreadsheetId: string,
  sheetName: string = 'DailySpend_Jan26'
): Promise<FbmData> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:V50`,
    });

    const rows = response.data.values || [];
    
    let perMonth = 0;
    const dailySpends: { day: number; amount: number }[] = [];
    const accounts: { date: string; bayer: string; ads: string; status: string; deposit: number; balance: number }[] = [];

    const headerRow1 = rows[0] || [];
    const headerRow2 = rows[1] || [];
    
    perMonth = parseNumber(headerRow2[6]);
    
    for (let i = 7; i < headerRow2.length; i++) {
      const dayNum = parseInt(String(headerRow1[i] || '0')) || (i - 6);
      const amount = parseNumber(headerRow2[i]);
      if (amount > 0) {
        dailySpends.push({ day: dayNum, amount });
      }
    }

    let totalBalance = 0;
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue;
      
      const balance = parseNumber(row[5]);
      totalBalance += balance;
      
      accounts.push({
        date: String(row[0] || ''),
        bayer: String(row[1] || ''),
        ads: String(row[2] || ''),
        status: String(row[3] || ''),
        deposit: parseNumber(row[4]),
        balance: balance,
      });
    }

    return {
      perMonth,
      dailySpends,
      totalBalance,
      accounts,
    };
  } catch (error) {
    console.error('Error reading FBM sheet:', error);
    throw error;
  }
}

export async function getSheetInfo(spreadsheetId: string) {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return {
      title: response.data.properties?.title,
      sheets: response.data.sheets?.map((s) => ({
        title: s.properties?.title ?? undefined,
        sheetId: s.properties?.sheetId ?? undefined,
      })),
    };
  } catch (error) {
    console.error('Error getting sheet info:', error);
    throw error;
  }
}
