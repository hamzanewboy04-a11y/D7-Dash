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

export interface DeskDailySpend {
  deskName: string;
  deskId: string;
  dailySpends: { day: number; amount: number }[];
  totalSpend: number;
}

export interface CrossgifData {
  canUseBalance: number;
  remainingBalance: number;
  dailySpends: { date: string; amount: number }[];
  totalSpend: number;
  desks: { name: string; id: string; canUse: number }[];
  deskSpends: DeskDailySpend[];
}

function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  let str = String(value).replace(/[$\s]/g, '');
  
  // Handle European format: 1.234,56 or 213,67
  // If there's a comma and it's used as decimal separator (not thousands)
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  
  if (hasComma && hasDot) {
    // Format like 1.234,56 - dot is thousands, comma is decimal
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // Format like 213,67 - comma is decimal
    str = str.replace(',', '.');
  }
  // else: Format like 1234.56 or 1,234.56 - standard format, just remove commas
  else if (hasComma) {
    str = str.replace(/,/g, '');
  }
  
  return parseFloat(str) || 0;
}

export async function getCrossgifData(
  spreadsheetId: string,
  sheetName: string = '1/2026'
): Promise<CrossgifData> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    const balanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:BZ10`,
    });

    const rows = balanceResponse.data.values || [];
    
    let canUseBalance = 0;
    let remainingBalance = 0;
    const dailySpends: { date: string; amount: number }[] = [];
    const desks: { name: string; id: string; canUse: number }[] = [];

    const spendsRow = rows[3] || [];
    
    // Column F (index 5) = "Can Use", Column G (index 6) = "The remaining balance" (actual balance)
    canUseBalance = parseNumber(spendsRow[5]);
    remainingBalance = parseNumber(spendsRow[6]);
    
    // Row 4 (index 3) has daily spends starting from column M (index 12)
    // Column L (index 11) is "TOTAL SPENT", columns M onwards are daily spends
    // Generate dates based on current month (1/1, 2/1, 3/1, etc.)
    const dateStartCol = 12;
    const currentMonth = sheetName.split('/')[0] || '1';
    
    for (let i = dateStartCol; i < spendsRow.length; i++) {
      const dayNum = i - dateStartCol + 1;
      const spendValue = parseNumber(spendsRow[i]);
      
      // Only include valid spend values (days 1-31)
      if (dayNum <= 31) {
        dailySpends.push({
          date: `${dayNum}/${currentMonth}`,
          amount: spendValue,
        });
      }
    }
    
    console.log('CROSSGIF dailySpends count:', dailySpends.length, 'first 5:', dailySpends.slice(0, 5));

    const deskSpends: DeskDailySpend[] = [];

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
        
        const deskDailySpends: { day: number; amount: number }[] = [];
        let deskTotal = 0;
        
        for (let col = dateStartCol; col < row.length; col++) {
          const dayNum = col - dateStartCol + 1;
          const spendValue = parseNumber(row[col]);
          
          if (dayNum <= 31) {
            deskDailySpends.push({
              day: dayNum,
              amount: spendValue,
            });
            deskTotal += spendValue;
          }
        }
        
        deskSpends.push({
          deskName: String(deskName),
          deskId: String(deskId),
          dailySpends: deskDailySpends,
          totalSpend: deskTotal,
        });
        
        console.log(`CROSSGIF ${deskName} total: ${deskTotal}, days with spend: ${deskDailySpends.filter(d => d.amount > 0).length}`);
      }
    }

    const totalSpend = dailySpends.reduce((sum, d) => sum + d.amount, 0);

    return {
      canUseBalance,
      remainingBalance,
      dailySpends,
      totalSpend,
      desks,
      deskSpends,
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
    
    // Expand range to include column AF and beyond for daily spends
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:AZ50`,
    });

    const rows = response.data.values || [];
    
    let perMonth = 0;
    const dailySpends: { day: number; amount: number }[] = [];
    const accounts: { date: string; bayer: string; ads: string; status: string; deposit: number; balance: number }[] = [];

    const row1 = rows[0] || [];   // Row 1: spends from column H to AL
    const row2 = rows[1] || [];   // Row 2: dates or day labels
    
    // Daily spends are in Row 1, starting from column H (index 7) through AL
    // Column H = index 7, Column AL = index 37
    const spendStartCol = 7;
    const spendEndCol = 38; // up to and including AL (index 37)
    
    for (let i = spendStartCol; i < Math.min(row1.length, spendEndCol); i++) {
      const amount = parseNumber(row1[i]);
      const dayNum = i - spendStartCol + 1; // Day 1, 2, 3...
      dailySpends.push({ 
        day: dayNum, 
        amount,
      });
    }
    
    // Calculate perMonth as sum of all daily spends
    perMonth = dailySpends.reduce((sum, d) => sum + d.amount, 0);

    // Sum balances from column F (index 5) for all accounts
    // Account data starts from row 3 (index 2) after header and summary rows
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
