/**
 * Direct Import Script for D7 TEAM Excel Data
 * This script directly reads the Excel file and imports all data into the database
 */

import * as XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Database path - matches DATABASE_URL="file:./dev.db" in .env
const DB_PATH = path.join(process.cwd(), 'dev.db');

// Sheet to Country mapping
const SHEET_COUNTRY_MAP: Record<string, { countryId: string; countryName: string; countryCode: string; currency: string }> = {
  'Перу Декабрь': { countryId: 'peru', countryName: 'Peru', countryCode: 'PE', currency: 'SOL' },
  'Перу Январь': { countryId: 'peru', countryName: 'Peru', countryCode: 'PE', currency: 'SOL' },
  'Перу Январь 2': { countryId: 'peru', countryName: 'Peru', countryCode: 'PE', currency: 'SOL' },
  'Перу Ноябрь': { countryId: 'peru', countryName: 'Peru', countryCode: 'PE', currency: 'SOL' },
  'Италия Ж Декабрь': { countryId: 'italy_f', countryName: 'Italy (Women)', countryCode: 'IT_F', currency: 'EUR' },
  'Италия Ж Январь': { countryId: 'italy_f', countryName: 'Italy (Women)', countryCode: 'IT_F', currency: 'EUR' },
  'Италия Ж Ноябрь': { countryId: 'italy_f', countryName: 'Italy (Women)', countryCode: 'IT_F', currency: 'EUR' },
  'Италия М декабрь': { countryId: 'italy_m', countryName: 'Italy (Men)', countryCode: 'IT_M', currency: 'EUR' },
  'Италия М Ноябрь': { countryId: 'italy_m', countryName: 'Italy (Men)', countryCode: 'IT_M', currency: 'EUR' },
  'Италия М Ноябрь ': { countryId: 'italy_m', countryName: 'Italy (Men)', countryCode: 'IT_M', currency: 'EUR' },
  'Аргентина декабрь': { countryId: 'argentina', countryName: 'Argentina', countryCode: 'AR', currency: 'ARS' },
  'Аргентина январь': { countryId: 'argentina', countryName: 'Argentina', countryCode: 'AR', currency: 'ARS' },
  'Аргентина Ноябрь': { countryId: 'argentina', countryName: 'Argentina', countryCode: 'AR', currency: 'ARS' },
  'Чили декабрь': { countryId: 'chile', countryName: 'Chile', countryCode: 'CL', currency: 'CLP' },
  'Чили Ноябрь': { countryId: 'chile', countryName: 'Chile', countryCode: 'CL', currency: 'CLP' },
};

// Column name patterns - returns field name or null
function matchColumn(col: string): string | null {
  if (!col) return null;
  const normalized = col.toLowerCase().trim();

  // Date
  if (normalized === 'дата' || normalized === 'date') return 'date';

  // Spend Trust - must have both "спенд" and "trust"
  if ((normalized.includes('спенд') && normalized.includes('trust')) ||
      normalized === 'спенд trust') return 'spendTrust';

  // Spend Crossgif - must have "спенд" and "крос"
  if ((normalized.includes('спенд') && (normalized.includes('крос') || normalized.includes('cross'))) ||
      normalized === 'спенд кросгиф' || normalized === 'спенд кроссгиф') return 'spendCrossgif';

  // Spend FBM
  if (normalized.includes('спенд') && normalized.includes('fbm')) return 'spendFbm';
  if (normalized === 'спенд на fbm') return 'spendFbm';

  // Revenue Priemka (Local) - must have "доход" and "sol" and "приемка/приёмка"
  if (normalized.includes('доход') && normalized.includes('sol') &&
      (normalized.includes('приемка') || normalized.includes('приёмка'))) {
    return 'revenueLocalPriemka';
  }

  // Revenue Priemka (USDT) - must have "доход" and "usdt" and "приемка/приёмка"
  if (normalized.includes('доход') && normalized.includes('usdt') &&
      (normalized.includes('приемка') || normalized.includes('приёмка'))) {
    return 'revenueUsdtPriemka';
  }

  // Revenue Own (Local) - must have "доход" and "sol" and "наш"
  if (normalized.includes('доход') && normalized.includes('sol') && normalized.includes('наш')) {
    return 'revenueLocalOwn';
  }

  // Revenue Own (USDT) - must have "доход" and "usdt" and "наш"
  if (normalized.includes('доход') && normalized.includes('usdt') && normalized.includes('наш')) {
    return 'revenueUsdtOwn';
  }

  // FD Count - must NOT start with "н" (нФД)
  if ((normalized === 'фд кол-во' || normalized === 'фд количество') && !normalized.startsWith('н')) {
    return 'fdCount';
  }

  // FD Sum Local - must NOT start with "н" (нФД)
  if ((normalized === 'фд сумма sol' || normalized === 'фд сумма') && !normalized.startsWith('н')) {
    return 'fdSumLocal';
  }

  // Chatterfy
  if (normalized.includes('chatterfy') || normalized.includes('чаттерф')) {
    return 'chatterfyCost';
  }

  // Additional expenses - but not "Общие расходы"
  if ((normalized === 'доп расходы' || normalized.startsWith('доп расход') ||
       normalized.startsWith('дополн')) && !normalized.includes('общ')) {
    return 'additionalExpenses';
  }

  // Exchange rate own
  if (normalized.includes('курс') && normalized.includes('наш')) return 'exchangeRateOwn';

  return null;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  // Handle Excel serial date
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }

  // Handle string date
  const str = String(value);
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try DD.MM.YYYY format
  const parts = str.split(/[./-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

interface ParsedRow {
  date: Date;
  spendTrust: number;
  spendCrossgif: number;
  spendFbm: number;
  revenueLocalPriemka: number;
  revenueUsdtPriemka: number;
  revenueLocalOwn: number;
  revenueUsdtOwn: number;
  fdCount: number;
  fdSumLocal: number;
  chatterfyCost: number;
  additionalExpenses: number;
  exchangeRateOwn: number;
}

function parseSheet(worksheet: XLSX.WorkSheet, sheetName: string): ParsedRow[] {
  // Use raw array format to capture all columns including those with null values
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as unknown[][];
  const parsedRows: ParsedRow[] = [];

  if (rawData.length < 2) {
    console.log(`  Sheet "${sheetName}" has no data rows`);
    return [];
  }

  // Build column mapping from header row
  const headers = rawData[0] as string[];
  const columnMap: Record<number, string> = {};

  console.log(`  Processing sheet "${sheetName}" with ${rawData.length - 1} data rows`);

  for (let i = 0; i < headers.length; i++) {
    const col = headers[i];
    if (!col) continue;

    const mapped = matchColumn(col);
    if (mapped) {
      columnMap[i] = mapped;
    }
  }

  // Log mapped columns
  const mappedCols: Record<string, string> = {};
  for (const [idx, field] of Object.entries(columnMap)) {
    mappedCols[headers[parseInt(idx)]] = field;
  }
  console.log(`  Mapped columns:`, Object.entries(mappedCols).map(([k, v]) => `"${k}" -> ${v}`).join(', '));

  // Track processed dates to avoid duplicates (keep first occurrence)
  const processedDates = new Set<string>();

  // Parse each data row (skip header)
  for (let rowIdx = 1; rowIdx < rawData.length; rowIdx++) {
    const row = rawData[rowIdx];
    if (!row || !row[0]) continue; // Skip empty rows

    // Initialize with defaults
    const parsed: Partial<ParsedRow> = {
      spendTrust: 0,
      spendCrossgif: 0,
      spendFbm: 0,
      revenueLocalPriemka: 0,
      revenueUsdtPriemka: 0,
      revenueLocalOwn: 0,
      revenueUsdtOwn: 0,
      fdCount: 0,
      fdSumLocal: 0,
      chatterfyCost: 0,
      additionalExpenses: 0,
      exchangeRateOwn: 0,
    };

    // Map values from columns
    for (const [idxStr, field] of Object.entries(columnMap)) {
      const idx = parseInt(idxStr);
      const value = row[idx];

      if (field === 'date') {
        const date = parseDate(value);
        if (date) {
          parsed.date = date;
        }
      } else {
        const num = parseNumber(value);
        if (field === 'fdCount') {
          (parsed as Record<string, number>)[field] = Math.round(num);
        } else {
          (parsed as Record<string, number>)[field] = num;
        }
      }
    }

    // Skip rows without valid date
    if (!parsed.date) {
      continue;
    }

    // Skip duplicate dates (keep first occurrence only)
    const dateStr = parsed.date.toISOString().split('T')[0];
    if (processedDates.has(dateStr)) {
      continue;
    }
    processedDates.add(dateStr);

    // Skip rows with no meaningful data (all zeros)
    const hasData = parsed.spendTrust! > 0 || parsed.spendCrossgif! > 0 || parsed.spendFbm! > 0 ||
                    parsed.revenueLocalPriemka! > 0 || parsed.revenueUsdtPriemka! > 0 ||
                    parsed.revenueLocalOwn! > 0 || parsed.revenueUsdtOwn! > 0 ||
                    parsed.fdCount! > 0 || parsed.fdSumLocal! > 0;

    if (!hasData) {
      continue;
    }

    parsedRows.push(parsed as ParsedRow);
  }

  console.log(`  Valid rows parsed: ${parsedRows.length}`);

  // Show sample data
  if (parsedRows.length > 0) {
    const sample = parsedRows[0];
    console.log(`  Sample row: date=${sample.date.toISOString().split('T')[0]}, spendCrossgif=${sample.spendCrossgif}, revenueLocalOwn=${sample.revenueLocalOwn}, revenueUsdtOwn=${sample.revenueUsdtOwn}, fdCount=${sample.fdCount}`);
  }

  return parsedRows;
}

// Calculate all derived metrics
function calculateMetrics(input: ParsedRow) {
  const totalSpend = input.spendTrust + input.spendCrossgif + input.spendFbm;
  const agencyFee = input.spendTrust * 0.09 + input.spendCrossgif * 0.08 + input.spendFbm * 0.08;

  const exchangeRatePriemka = input.revenueUsdtPriemka > 0 ? input.revenueLocalPriemka / input.revenueUsdtPriemka : 0;
  const exchangeRateOwn = input.revenueUsdtOwn > 0 ? input.revenueLocalOwn / input.revenueUsdtOwn : (input.exchangeRateOwn || 0);

  const commissionPriemka = input.revenueUsdtPriemka * 0.15;
  const totalRevenueUsdt = input.revenueUsdtPriemka + input.revenueUsdtOwn;

  const fdSumUsdt = exchangeRateOwn > 0 ? input.fdSumLocal / exchangeRateOwn : 0;
  const rdSumLocal = input.revenueLocalOwn - input.fdSumLocal;
  const rdSumUsdt = exchangeRateOwn > 0 ? rdSumLocal / exchangeRateOwn : 0;

  const payrollRdHandler = rdSumUsdt * 0.04;

  let fdRate: number;
  if (input.fdCount < 5) fdRate = 3;
  else if (input.fdCount < 10) fdRate = 4;
  else fdRate = 5;
  const fdBonus = input.fdCount >= 5 ? 15 : 0;
  const payrollFdHandler = (input.fdCount * fdRate + fdBonus) * 1.2;

  const payrollBuyer = totalSpend * 0.12;
  const payrollHeadDesigner = 10;
  const totalPayroll = payrollRdHandler + payrollFdHandler + payrollBuyer + payrollHeadDesigner;

  const totalExpensesUsdt = commissionPriemka + totalSpend + agencyFee + totalPayroll + input.chatterfyCost + input.additionalExpenses;
  const expensesWithoutSpend = totalExpensesUsdt - totalSpend;

  const netProfitMath = input.revenueUsdtOwn - commissionPriemka - agencyFee - totalSpend - totalPayroll - input.additionalExpenses - input.chatterfyCost;
  const roi = totalExpensesUsdt > 0 ? (totalRevenueUsdt - totalExpensesUsdt) / totalExpensesUsdt : 0;

  return {
    totalSpend,
    agencyFee,
    exchangeRatePriemka,
    exchangeRateOwn,
    commissionPriemka,
    totalRevenueUsdt,
    fdSumUsdt,
    rdSumLocal,
    rdSumUsdt,
    payrollRdHandler,
    payrollFdHandler,
    payrollBuyer,
    payrollHeadDesigner,
    totalPayroll,
    totalExpensesUsdt,
    expensesWithoutSpend,
    netProfitMath,
    roi,
  };
}

async function main() {
  console.log('=== D7 TEAM Direct Import Script ===\n');

  const excelPath = path.join(process.cwd(), 'D7 TEAM (1).xlsx');
  console.log(`Reading Excel file: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath, { cellDates: true });
  console.log(`Found ${workbook.SheetNames.length} sheets\n`);

  // Open database
  console.log(`Opening database: ${DB_PATH}`);
  const db = new Database(DB_PATH);

  // Ensure tables exist
  console.log('Ensuring database tables exist...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS Country (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS DailyMetrics (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      countryId TEXT NOT NULL,
      totalSpend REAL NOT NULL DEFAULT 0,
      agencyFee REAL NOT NULL DEFAULT 0,
      revenueLocalPriemka REAL NOT NULL DEFAULT 0,
      revenueUsdtPriemka REAL NOT NULL DEFAULT 0,
      exchangeRatePriemka REAL NOT NULL DEFAULT 0,
      commissionPriemka REAL NOT NULL DEFAULT 0,
      revenueLocalOwn REAL NOT NULL DEFAULT 0,
      revenueUsdtOwn REAL NOT NULL DEFAULT 0,
      exchangeRateOwn REAL NOT NULL DEFAULT 0,
      totalRevenueUsdt REAL NOT NULL DEFAULT 0,
      totalExpensesUsdt REAL NOT NULL DEFAULT 0,
      expensesWithoutSpend REAL NOT NULL DEFAULT 0,
      fdCount INTEGER NOT NULL DEFAULT 0,
      fdSumLocal REAL NOT NULL DEFAULT 0,
      fdSumUsdt REAL NOT NULL DEFAULT 0,
      rdSumLocal REAL NOT NULL DEFAULT 0,
      rdSumUsdt REAL NOT NULL DEFAULT 0,
      payrollRdHandler REAL NOT NULL DEFAULT 0,
      payrollFdHandler REAL NOT NULL DEFAULT 0,
      payrollBuyer REAL NOT NULL DEFAULT 0,
      payrollHeadDesigner REAL NOT NULL DEFAULT 10,
      totalPayroll REAL NOT NULL DEFAULT 0,
      chatterfyCost REAL NOT NULL DEFAULT 0,
      additionalExpenses REAL NOT NULL DEFAULT 0,
      netProfitMath REAL NOT NULL DEFAULT 0,
      roi REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (countryId) REFERENCES Country(id),
      UNIQUE(date, countryId)
    )
  `);

  // Create countries
  console.log('\nCreating countries...');
  const countries = [
    { id: 'peru', name: 'Peru', code: 'PE', currency: 'SOL' },
    { id: 'italy_f', name: 'Italy (Women)', code: 'IT_F', currency: 'EUR' },
    { id: 'italy_m', name: 'Italy (Men)', code: 'IT_M', currency: 'EUR' },
    { id: 'argentina', name: 'Argentina', code: 'AR', currency: 'ARS' },
    { id: 'chile', name: 'Chile', code: 'CL', currency: 'CLP' },
  ];

  const insertCountry = db.prepare(`
    INSERT OR REPLACE INTO Country (id, name, code, currency, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  for (const country of countries) {
    insertCountry.run(country.id, country.name, country.code, country.currency);
    console.log(`  Created/updated country: ${country.name} (${country.code})`);
  }

  // Clear existing metrics for fresh import
  console.log('\nClearing existing metrics...');
  db.exec('DELETE FROM DailyMetrics');

  // Prepare insert statement for metrics
  const insertMetric = db.prepare(`
    INSERT OR REPLACE INTO DailyMetrics (
      id, date, countryId, totalSpend, agencyFee,
      revenueLocalPriemka, revenueUsdtPriemka, exchangeRatePriemka, commissionPriemka,
      revenueLocalOwn, revenueUsdtOwn, exchangeRateOwn,
      totalRevenueUsdt, totalExpensesUsdt, expensesWithoutSpend,
      fdCount, fdSumLocal, fdSumUsdt, rdSumLocal, rdSumUsdt,
      payrollRdHandler, payrollFdHandler, payrollBuyer, payrollHeadDesigner, totalPayroll,
      chatterfyCost, additionalExpenses, netProfitMath, roi,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      datetime('now'), datetime('now')
    )
  `);

  // Process each data sheet
  console.log('\nProcessing data sheets...');
  let totalImported = 0;

  for (const sheetName of workbook.SheetNames) {
    const countryInfo = SHEET_COUNTRY_MAP[sheetName];
    if (!countryInfo) {
      continue; // Skip non-data sheets silently
    }

    console.log(`\nProcessing sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const parsedRows = parseSheet(worksheet, sheetName);

    for (const row of parsedRows) {
      const metrics = calculateMetrics(row);
      const dateStr = row.date.toISOString().split('T')[0];
      const id = uuidv4();

      insertMetric.run(
        id,
        dateStr,
        countryInfo.countryId,
        metrics.totalSpend,
        metrics.agencyFee,
        row.revenueLocalPriemka,
        row.revenueUsdtPriemka,
        metrics.exchangeRatePriemka,
        metrics.commissionPriemka,
        row.revenueLocalOwn,
        row.revenueUsdtOwn,
        metrics.exchangeRateOwn,
        metrics.totalRevenueUsdt,
        metrics.totalExpensesUsdt,
        metrics.expensesWithoutSpend,
        row.fdCount,
        row.fdSumLocal,
        metrics.fdSumUsdt,
        metrics.rdSumLocal,
        metrics.rdSumUsdt,
        metrics.payrollRdHandler,
        metrics.payrollFdHandler,
        metrics.payrollBuyer,
        metrics.payrollHeadDesigner,
        metrics.totalPayroll,
        row.chatterfyCost,
        row.additionalExpenses,
        metrics.netProfitMath,
        metrics.roi
      );

      totalImported++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total imported: ${totalImported}`);

  // Show counts by country
  console.log('\nRecords by country:');
  const countQuery = db.prepare('SELECT countryId, COUNT(*) as count FROM DailyMetrics GROUP BY countryId');
  const counts = countQuery.all() as Array<{ countryId: string; count: number }>;
  for (const { countryId, count } of counts) {
    console.log(`  ${countryId}: ${count} records`);
  }

  // Show revenue totals
  console.log('\nTotals by country:');
  const revenueQuery = db.prepare(`
    SELECT countryId,
           SUM(totalRevenueUsdt) as totalRevenue,
           SUM(totalSpend) as totalSpend,
           SUM(netProfitMath) as totalProfit
    FROM DailyMetrics
    GROUP BY countryId
  `);
  const revenues = revenueQuery.all() as Array<{ countryId: string; totalRevenue: number; totalSpend: number; totalProfit: number }>;
  for (const { countryId, totalRevenue, totalSpend, totalProfit } of revenues) {
    console.log(`  ${countryId}: Revenue $${totalRevenue.toFixed(2)}, Spend $${totalSpend.toFixed(2)}, Profit $${totalProfit.toFixed(2)}`);
  }

  // Show date range
  console.log('\nDate range:');
  const dateQuery = db.prepare(`
    SELECT countryId, MIN(date) as minDate, MAX(date) as maxDate
    FROM DailyMetrics
    GROUP BY countryId
  `);
  const dates = dateQuery.all() as Array<{ countryId: string; minDate: string; maxDate: string }>;
  for (const { countryId, minDate, maxDate } of dates) {
    console.log(`  ${countryId}: ${minDate} to ${maxDate}`);
  }

  db.close();
  console.log('\nDone!');
}

main().catch(console.error);
