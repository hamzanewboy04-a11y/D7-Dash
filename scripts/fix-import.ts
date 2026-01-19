/**
 * Fix Import Script - Re-imports data using Excel's pre-calculated values
 * Handles duplicate dates by keeping only the first occurrence
 */

import * as XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'prisma', 'data.db');

// Mapping sheets to countries
const SHEETS = [
  { sheet: 'Перу Ноябрь', country: 'PE' },
  { sheet: 'Перу Декабрь', country: 'PE' },
  { sheet: 'Перу Январь', country: 'PE' },
  { sheet: 'Италия Ж Ноябрь', country: 'IT_F' },
  { sheet: 'Италия Ж Декабрь', country: 'IT_F' },
  { sheet: 'Италия Ж Январь', country: 'IT_F' },
  { sheet: 'Италия М Ноябрь ', country: 'IT_M' },
  { sheet: 'Италия М декабрь', country: 'IT_M' },
  { sheet: 'Аргентина Ноябрь', country: 'AR' },
  { sheet: 'Аргентина декабрь', country: 'AR' },
  { sheet: 'Аргентина январь', country: 'AR' },
  { sheet: 'Чили Ноябрь', country: 'CL' },
  { sheet: 'Чили декабрь', country: 'CL' },
];

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  return null;
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function findColumn(headers: string[], ...patterns: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] || '').toLowerCase().trim();
    for (const p of patterns) {
      if (h === p.toLowerCase() || h.includes(p.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

async function main() {
  console.log('=== Fixing Import Data ===\n');
  console.log('Database:', DB_PATH);

  const workbook = XLSX.readFile(path.join(process.cwd(), 'D7 TEAM (1).xlsx'));
  const db = new Database(DB_PATH);

  // Get country IDs
  const countries = db.prepare('SELECT id, code FROM Country').all() as Array<{id: string, code: string}>;
  const countryMap: Record<string, string> = {};
  for (const c of countries) {
    countryMap[c.code] = c.id;
  }
  console.log('Countries:', countryMap);

  // Clear existing metrics
  console.log('\nClearing existing metrics...');
  db.exec('DELETE FROM DailyMetrics');

  // Prepare insert statement
  const insertMetric = db.prepare(`
    INSERT INTO DailyMetrics (
      id, date, countryId, totalSpend, spendTrust, spendCrossgif, spendFbm, agencyFee,
      revenueLocalPriemka, revenueUsdtPriemka, exchangeRatePriemka, commissionPriemka,
      revenueLocalOwn, revenueUsdtOwn, exchangeRateOwn,
      totalRevenueUsdt, totalExpensesUsdt, expensesWithoutSpend,
      fdCount, fdSumLocal, fdSumUsdt, rdSumLocal, rdSumUsdt,
      payrollRdHandler, payrollFdHandler, payrollContent, payrollReviews, payrollDesigner,
      payrollBuyer, payrollHeadDesigner, totalPayroll, unpaidPayroll, paidPayroll,
      chatterfyCost, additionalExpenses, netProfitMath, roi,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      datetime('now'), datetime('now')
    )
  `);

  let totalImported = 0;

  // Process each sheet
  for (const sheetInfo of SHEETS) {
    const sheet = workbook.Sheets[sheetInfo.sheet];
    if (!sheet) {
      console.log(`Sheet "${sheetInfo.sheet}" not found`);
      continue;
    }

    const countryId = countryMap[sheetInfo.country];
    if (!countryId) {
      console.log(`Country "${sheetInfo.country}" not found in DB`);
      continue;
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
    if (rawData.length < 2) continue;

    const headers = (rawData[0] as string[]).map(h => h || '');

    // Find column indices
    const cols = {
      date: findColumn(headers, 'дата'),
      spendTotal: findColumn(headers, 'спенд за день'),
      spendTrust: findColumn(headers, 'спенд trust'),
      spendCrossgif: findColumn(headers, 'спенд кросгиф', 'спенд кроссгиф'),
      spendFbm: findColumn(headers, 'спенд на fbm'),
      agencyFee: findColumn(headers, 'процент агенст'),
      revenueLocalPriemka: findColumn(headers, 'доход в sol приемка', 'доход в euro приемка'),
      revenueUsdtPriemka: findColumn(headers, 'доход в usdt приемка'),
      revenueLocalOwn: findColumn(headers, 'доход в sol наш', 'доход в euro наш'),
      revenueUsdtOwn: findColumn(headers, 'доход в usdt наш'),
      exchangeRateOwn: findColumn(headers, 'курс обмена наш'),
      commissionPriemka: findColumn(headers, 'комиссия приемки'),
      totalRevenueUsdt: findColumn(headers, 'общий доход usdt'),
      totalExpensesUsdt: findColumn(headers, 'общие расходы usdt'),
      expensesWithoutSpend: findColumn(headers, 'расходы без спенда'),
      fdCount: findColumn(headers, 'фд кол-во'),
      fdSumLocal: findColumn(headers, 'фд сумма sol', 'фд сумма euro'),
      fdSumUsdt: findColumn(headers, 'фд сумма usdt'),
      rdSumLocal: findColumn(headers, 'рд сумма'),
      rdSumUsdt: findColumn(headers, 'рд сумма usdt'),
      payrollRdHandler: findColumn(headers, 'фот обраб рд'),
      payrollFdHandler: findColumn(headers, 'фот обраб фд'),
      payrollContent: findColumn(headers, 'фот контент'),
      payrollReviews: findColumn(headers, 'фот отзов'),
      payrollDesigner: findColumn(headers, 'фот дизайнер'),
      payrollBuyer: findColumn(headers, 'фот баер'),
      payrollHeadDesigner: findColumn(headers, 'фот хед диз'),
      totalPayroll: findColumn(headers, 'общий фот'),
      unpaidPayroll: findColumn(headers, 'невыплачено фот'),
      paidPayroll: findColumn(headers, 'выплата фот'),
      chatterfy: findColumn(headers, 'chatterfy'),
      additionalExpenses: findColumn(headers, 'доп расходы'),
      netProfit: findColumn(headers, 'чистая прибыль математика'),
      roi: findColumn(headers, 'roi%'),
    };

    console.log(`\nProcessing: ${sheetInfo.sheet} -> ${sheetInfo.country}`);

    // Track processed dates to skip duplicates
    const processedDates = new Set<string>();
    let sheetCount = 0;
    let skippedDuplicates = 0;

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[];
      if (!row || !row[cols.date]) continue;

      const date = parseDate(row[cols.date]);
      if (!date) continue;

      const dateStr = date.toISOString().split('T')[0];

      // Skip duplicate dates - keep first occurrence only
      if (processedDates.has(dateStr)) {
        skippedDuplicates++;
        continue;
      }
      processedDates.add(dateStr);

      // Get values from Excel - prefer pre-calculated columns
      const spendTrust = num(row[cols.spendTrust]);
      const spendCrossgif = num(row[cols.spendCrossgif]);
      const spendFbm = num(row[cols.spendFbm]);
      const totalSpend = num(row[cols.spendTotal]) || (spendTrust + spendCrossgif + spendFbm);

      const revenueUsdtPriemka = num(row[cols.revenueUsdtPriemka]);
      const revenueUsdtOwn = num(row[cols.revenueUsdtOwn]);
      const totalRevenueUsdt = num(row[cols.totalRevenueUsdt]) || (revenueUsdtPriemka + revenueUsdtOwn);
      const totalExpensesUsdt = num(row[cols.totalExpensesUsdt]);
      const netProfit = num(row[cols.netProfit]);
      const roi = num(row[cols.roi]);

      // Skip rows without meaningful data
      if (totalSpend === 0 && totalRevenueUsdt === 0 && netProfit === 0) continue;

      const id = uuidv4();

      insertMetric.run(
        id,
        dateStr,
        countryId,
        totalSpend,
        spendTrust,
        spendCrossgif,
        spendFbm,
        num(row[cols.agencyFee]),
        num(row[cols.revenueLocalPriemka]),
        revenueUsdtPriemka,
        0, // exchangeRatePriemka
        num(row[cols.commissionPriemka]) || revenueUsdtPriemka * 0.15,
        num(row[cols.revenueLocalOwn]),
        revenueUsdtOwn,
        num(row[cols.exchangeRateOwn]),
        totalRevenueUsdt,
        totalExpensesUsdt,
        num(row[cols.expensesWithoutSpend]) || (totalExpensesUsdt - totalSpend),
        Math.round(num(row[cols.fdCount])),
        num(row[cols.fdSumLocal]),
        num(row[cols.fdSumUsdt]),
        num(row[cols.rdSumLocal]),
        num(row[cols.rdSumUsdt]),
        num(row[cols.payrollRdHandler]),
        num(row[cols.payrollFdHandler]),
        num(row[cols.payrollContent]),
        num(row[cols.payrollReviews]),
        num(row[cols.payrollDesigner]),
        num(row[cols.payrollBuyer]),
        num(row[cols.payrollHeadDesigner]) || 10,
        num(row[cols.totalPayroll]),
        num(row[cols.unpaidPayroll]),
        num(row[cols.paidPayroll]),
        num(row[cols.chatterfy]),
        num(row[cols.additionalExpenses]),
        netProfit,
        roi
      );

      sheetCount++;
      totalImported++;
    }

    console.log(`  Imported: ${sheetCount} | Skipped duplicates: ${skippedDuplicates}`);
  }

  // Show results
  console.log('\n=== RESULTS ===');
  console.log(`Total imported: ${totalImported} records\n`);

  // Stats by country
  const stats = db.prepare(`
    SELECT
      c.name,
      c.code,
      COUNT(*) as records,
      ROUND(SUM(m.totalSpend), 2) as spend,
      ROUND(SUM(m.totalRevenueUsdt), 2) as revenue,
      ROUND(SUM(m.netProfitMath), 2) as profit,
      MIN(m.date) as minDate,
      MAX(m.date) as maxDate
    FROM DailyMetrics m
    JOIN Country c ON m.countryId = c.id
    GROUP BY c.id
    ORDER BY revenue DESC
  `).all() as Array<{name: string; code: string; records: number; spend: number; revenue: number; profit: number; minDate: string; maxDate: string}>;

  for (const s of stats) {
    console.log(`${s.name} (${s.code}):`);
    console.log(`  Records: ${s.records}`);
    console.log(`  Spend: $${s.spend.toLocaleString()}`);
    console.log(`  Revenue: $${s.revenue.toLocaleString()}`);
    console.log(`  Profit: $${s.profit.toLocaleString()}`);
    console.log(`  Period: ${s.minDate} - ${s.maxDate}\n`);
  }

  // Overall totals
  const totals = db.prepare(`
    SELECT
      ROUND(SUM(totalSpend), 2) as spend,
      ROUND(SUM(totalRevenueUsdt), 2) as revenue,
      ROUND(SUM(netProfitMath), 2) as profit
    FROM DailyMetrics
  `).get() as {spend: number; revenue: number; profit: number};

  console.log('=== OVERALL TOTALS ===');
  console.log(`Spend: $${totals.spend.toLocaleString()}`);
  console.log(`Revenue: $${totals.revenue.toLocaleString()}`);
  console.log(`Profit: $${totals.profit.toLocaleString()}`);

  db.close();
  console.log('\nDone!');
}

main().catch(console.error);
