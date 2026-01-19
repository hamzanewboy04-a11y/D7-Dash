import Database from 'better-sqlite3';
import XLSX from 'xlsx';
import { randomUUID } from 'crypto';

const db = new Database('./prisma/dev.db');

function excelDateToJSDate(serial) {
  if (typeof serial === 'string') {
    const parts = serial.split(/[./-]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }
    return new Date(serial);
  }
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

function parseNum(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseInt2(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.round(val);
  const num = parseInt(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Column patterns
const COLUMN_PATTERNS = {
  date: [/^дата$/i],
  balanceRkFact: [/баланс\s*рк\s*факт/i],
  balanceRkMath: [/баланс\s*рк\s*математик/i],
  depositRk: [/внесли\s*на\s*рк$/i],
  totalSpend: [/спенд\s*за\s*день/i, /^спенд$/i],
  spendTrust: [/спенд\s*trust/i],
  spendCrossgif: [/спенд\s*крос/i],
  spendFbm: [/спенд\s*на?\s*fbm/i],
  agencyFee: [/процент\s*агент/i],
  revenueLocalPriemka: [/доход\s*в\s*(sol|euro)\s*при[её]мк/i],
  revenueUsdtPriemka: [/доход\s*в\s*usdt\s*при[её]мк/i],
  exchangeRatePriemka: [/курс\s*обмена\s*при[её]мк/i],
  commissionPriemka: [/комиссия\s*при[её]мк/i],
  revenueLocalOwn: [/доход\s*в\s*(sol|euro)\s*наш/i],
  revenueUsdtOwn: [/доход\s*в\s*usdt\s*наш/i],
  exchangeRateOwn: [/курс\s*обмена\s*наш/i],
  totalRevenueUsdt: [/общий\s*доход\s*usdt/i],
  totalExpensesUsdt: [/общие\s*расходы\s*usdt/i],
  fdCount: [/фд\s*кол-?во/i],
  nfdCount: [/нфд\s*кол-?во/i],
  fdSumLocal: [/фд\s*сумма\s*(sol|euro)/i],
  nfdSumLocal: [/нфд\s*сумма\s*(sol|euro)/i],
  fdSumUsdt: [/фд\s*сумма\s*usdt/i],
  nfdSumUsdt: [/нфд\s*сумма\s*usdt/i],
  rdCount: [/рд\s*кол-?во/i],
  rdSumLocal: [/^рд\s*сумма$/i],
  rdSumUsdt: [/рд\s*сумма\s*usdt/i],
  payrollBuyer: [/фот\s*баер/i],
  totalPayroll: [/общий\s*фот/i],
  chatterfyCost: [/chatterfy/i],
  additionalExpenses: [/доп\s*расход/i],
  netProfitMath: [/чистая\s*прибыль\s*математик/i],
  netProfitFact: [/чистая\s*прибыль\s*факт/i],
  roi: [/^roi%?$/i],
};

function mapHeaders(headers) {
  const mapping = {};
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] || '').trim();
    if (!header) continue;
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          if (!mapping[field]) {
            mapping[field] = i;
          }
          break;
        }
      }
    }
  }
  return mapping;
}

// Get country IDs
const countryRows = db.prepare('SELECT id, name FROM Country').all();
const countryIds = {};
countryRows.forEach(r => { countryIds[r.name] = r.id; });

console.log('Countries:', Object.keys(countryIds));

// Sheet mapping
const sheetToCountry = {
  'Перу Декабрь': 'Перу',
  'Перу Ноябрь': 'Перу',
  'Италия Ж Декабрь': 'Италия Ж',
  'Италия Ж Ноябрь': 'Италия Ж',
  'Италия М декабрь': 'Италия М',
  'Италия М Ноябрь ': 'Италия М',
  'Аргентина декабрь': 'Аргентина',
  'Аргентина Ноябрь': 'Аргентина',
  'Чили декабрь': 'Чили',
  'Чили Ноябрь': 'Чили',
};

// Clear all data
console.log('Clearing existing data...');
db.exec('DELETE FROM DailyMetrics');

// Insert statement
const insertMetrics = db.prepare(`
  INSERT INTO DailyMetrics (
    id, date, countryId,
    adAccountBalanceFact, adAccountBalanceMath, adAccountDeposit,
    totalSpend, spendTrust, spendCrossgif, spendFbm, agencyFee,
    revenueLocalPriemka, revenueUsdtPriemka, exchangeRatePriemka, commissionPriemka,
    revenueLocalOwn, revenueUsdtOwn, exchangeRateOwn,
    totalRevenueUsdt, totalExpensesUsdt,
    fdCount, nfdCount, fdSumLocal, nfdSumLocal, fdSumUsdt, nfdSumUsdt,
    rdCount, rdSumLocal, rdSumUsdt,
    payrollBuyer, totalPayroll,
    chatterfyCost, additionalExpenses,
    netProfitMath, netProfitFact, roi
  ) VALUES (
    ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?,
    ?, ?,
    ?, ?, ?
  )
`);

// Update statement - only update with non-zero revenue if existing has zero
const checkExisting = db.prepare(`
  SELECT id, totalRevenueUsdt FROM DailyMetrics WHERE date = ? AND countryId = ?
`);

const updateMetrics = db.prepare(`
  UPDATE DailyMetrics SET
    adAccountBalanceFact = ?,
    adAccountBalanceMath = ?,
    adAccountDeposit = ?,
    totalSpend = ?,
    spendTrust = ?,
    spendCrossgif = ?,
    spendFbm = ?,
    agencyFee = ?,
    revenueLocalPriemka = ?,
    revenueUsdtPriemka = ?,
    exchangeRatePriemka = ?,
    commissionPriemka = ?,
    revenueLocalOwn = ?,
    revenueUsdtOwn = ?,
    exchangeRateOwn = ?,
    totalRevenueUsdt = ?,
    totalExpensesUsdt = ?,
    fdCount = ?,
    nfdCount = ?,
    fdSumLocal = ?,
    nfdSumLocal = ?,
    fdSumUsdt = ?,
    nfdSumUsdt = ?,
    rdCount = ?,
    rdSumLocal = ?,
    rdSumUsdt = ?,
    payrollBuyer = ?,
    totalPayroll = ?,
    chatterfyCost = ?,
    additionalExpenses = ?,
    netProfitMath = ?,
    netProfitFact = ?,
    roi = ?,
    updatedAt = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const workbook = XLSX.readFile('./D7 TEAM (1).xlsx');
let totalImported = 0;

for (const [sheetName, countryName] of Object.entries(sheetToCountry)) {
  const countryId = countryIds[countryName];
  if (!countryId) continue;

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) continue;

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) continue;

  const colMap = mapHeaders(data[0]);

  console.log(`\n=== ${sheetName} (${countryName}) ===`);

  if (colMap.date === undefined) {
    console.log('  No date column!');
    continue;
  }

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row[colMap.date] === undefined) continue;

    const dateVal = row[colMap.date];
    const date = excelDateToJSDate(dateVal);
    if (!date || isNaN(date.getTime())) continue;

    const dateStr = date.toISOString().split('T')[0];

    const getValue = (field) => {
      const col = colMap[field];
      return col !== undefined ? row[col] : undefined;
    };

    const revenueUsdtPriemka = parseNum(getValue('revenueUsdtPriemka'));
    const revenueUsdtOwn = parseNum(getValue('revenueUsdtOwn'));
    const totalRevenueUsdt = revenueUsdtPriemka + revenueUsdtOwn;

    // Check if this row has meaningful revenue data
    const hasRevenueData = revenueUsdtOwn > 0 || revenueUsdtPriemka > 0;

    // Check if record exists
    const existing = checkExisting.get(dateStr, countryId);

    if (existing) {
      // Only update if:
      // 1. New data has revenue and existing doesn't, OR
      // 2. New data has revenue
      if (hasRevenueData || existing.totalRevenueUsdt === 0) {
        updateMetrics.run(
          parseNum(getValue('balanceRkFact')),
          parseNum(getValue('balanceRkMath')),
          parseNum(getValue('depositRk')),
          parseNum(getValue('totalSpend')),
          parseNum(getValue('spendTrust')),
          parseNum(getValue('spendCrossgif')),
          parseNum(getValue('spendFbm')),
          parseNum(getValue('agencyFee')),
          parseNum(getValue('revenueLocalPriemka')),
          revenueUsdtPriemka,
          parseNum(getValue('exchangeRatePriemka')),
          parseNum(getValue('commissionPriemka')),
          parseNum(getValue('revenueLocalOwn')),
          revenueUsdtOwn,
          parseNum(getValue('exchangeRateOwn')),
          totalRevenueUsdt,
          parseNum(getValue('totalExpensesUsdt')),
          parseInt2(getValue('fdCount')),
          parseInt2(getValue('nfdCount')),
          parseNum(getValue('fdSumLocal')),
          parseNum(getValue('nfdSumLocal')),
          parseNum(getValue('fdSumUsdt')),
          parseNum(getValue('nfdSumUsdt')),
          parseInt2(getValue('rdCount')),
          parseNum(getValue('rdSumLocal')),
          parseNum(getValue('rdSumUsdt')),
          parseNum(getValue('payrollBuyer')),
          parseNum(getValue('totalPayroll')),
          parseNum(getValue('chatterfyCost')),
          parseNum(getValue('additionalExpenses')),
          parseNum(getValue('netProfitMath')),
          parseNum(getValue('netProfitFact')),
          parseNum(getValue('roi')),
          existing.id
        );
        imported++;
      } else {
        skipped++;
      }
    } else {
      // Insert new
      insertMetrics.run(
        randomUUID(),
        dateStr,
        countryId,
        parseNum(getValue('balanceRkFact')),
        parseNum(getValue('balanceRkMath')),
        parseNum(getValue('depositRk')),
        parseNum(getValue('totalSpend')),
        parseNum(getValue('spendTrust')),
        parseNum(getValue('spendCrossgif')),
        parseNum(getValue('spendFbm')),
        parseNum(getValue('agencyFee')),
        parseNum(getValue('revenueLocalPriemka')),
        revenueUsdtPriemka,
        parseNum(getValue('exchangeRatePriemka')),
        parseNum(getValue('commissionPriemka')),
        parseNum(getValue('revenueLocalOwn')),
        revenueUsdtOwn,
        parseNum(getValue('exchangeRateOwn')),
        totalRevenueUsdt,
        parseNum(getValue('totalExpensesUsdt')),
        parseInt2(getValue('fdCount')),
        parseInt2(getValue('nfdCount')),
        parseNum(getValue('fdSumLocal')),
        parseNum(getValue('nfdSumLocal')),
        parseNum(getValue('fdSumUsdt')),
        parseNum(getValue('nfdSumUsdt')),
        parseInt2(getValue('rdCount')),
        parseNum(getValue('rdSumLocal')),
        parseNum(getValue('rdSumUsdt')),
        parseNum(getValue('payrollBuyer')),
        parseNum(getValue('totalPayroll')),
        parseNum(getValue('chatterfyCost')),
        parseNum(getValue('additionalExpenses')),
        parseNum(getValue('netProfitMath')),
        parseNum(getValue('netProfitFact')),
        parseNum(getValue('roi'))
      );
      imported++;
    }
  }

  console.log(`  Imported: ${imported}, Skipped: ${skipped}`);
  totalImported += imported;
}

console.log(`\n=== TOTAL: ${totalImported} records ===`);

// Verify
console.log('\n=== Verification ===');
const count = db.prepare('SELECT COUNT(*) as count FROM DailyMetrics').get();
console.log('Records in DB:', count.count);

const byCountry = db.prepare(`
  SELECT c.name, COUNT(*) as records, SUM(totalRevenueUsdt) as revenue, SUM(totalSpend) as spend
  FROM DailyMetrics d
  JOIN Country c ON d.countryId = c.id
  GROUP BY c.name
  ORDER BY revenue DESC
`).all();

console.log('\nBy country:');
byCountry.forEach(r => {
  console.log(`  ${r.name}: ${r.records} records, Revenue: $${r.revenue?.toFixed(2) || 0}, Spend: $${r.spend?.toFixed(2) || 0}`);
});

// Sample data with revenue
console.log('\nSample records with revenue:');
const sample = db.prepare(`
  SELECT d.date, c.name, d.totalRevenueUsdt, d.revenueUsdtOwn, d.totalSpend
  FROM DailyMetrics d
  JOIN Country c ON d.countryId = c.id
  WHERE d.totalRevenueUsdt > 0
  ORDER BY d.date
  LIMIT 10
`).all();

sample.forEach(r => {
  console.log(`  ${r.date} | ${r.name} | Rev: $${r.totalRevenueUsdt.toFixed(2)} | Spend: $${r.totalSpend.toFixed(2)}`);
});

db.close();
console.log('\nDone!');
