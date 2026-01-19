/**
 * Final Import Script - берет уже посчитанные значения из Excel напрямую
 */

import * as XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = path.join(process.cwd(), 'dev.db');

// Маппинг листов к странам
const SHEETS = [
  { sheet: 'Перу Ноябрь', country: 'peru', name: 'Peru', code: 'PE', currency: 'SOL' },
  { sheet: 'Перу Декабрь', country: 'peru', name: 'Peru', code: 'PE', currency: 'SOL' },
  { sheet: 'Перу Январь', country: 'peru', name: 'Peru', code: 'PE', currency: 'SOL' },
  { sheet: 'Италия Ж Ноябрь', country: 'italy_f', name: 'Italy (Women)', code: 'IT_F', currency: 'EUR' },
  { sheet: 'Италия Ж Декабрь', country: 'italy_f', name: 'Italy (Women)', code: 'IT_F', currency: 'EUR' },
  { sheet: 'Италия Ж Январь', country: 'italy_f', name: 'Italy (Women)', code: 'IT_F', currency: 'EUR' },
  { sheet: 'Италия М Ноябрь ', country: 'italy_m', name: 'Italy (Men)', code: 'IT_M', currency: 'EUR' },
  { sheet: 'Италия М декабрь', country: 'italy_m', name: 'Italy (Men)', code: 'IT_M', currency: 'EUR' },
  { sheet: 'Аргентина Ноябрь', country: 'argentina', name: 'Argentina', code: 'AR', currency: 'ARS' },
  { sheet: 'Аргентина декабрь', country: 'argentina', name: 'Argentina', code: 'AR', currency: 'ARS' },
  { sheet: 'Аргентина январь', country: 'argentina', name: 'Argentina', code: 'AR', currency: 'ARS' },
  { sheet: 'Чили Ноябрь', country: 'chile', name: 'Chile', code: 'CL', currency: 'CLP' },
  { sheet: 'Чили декабрь', country: 'chile', name: 'Chile', code: 'CL', currency: 'CLP' },
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
  console.log('=== Финальный импорт данных ===\n');

  const workbook = XLSX.readFile(path.join(process.cwd(), 'D7 TEAM (1).xlsx'));
  const db = new Database(DB_PATH);

  // Очистка базы
  console.log('Очистка базы данных...');
  db.exec('DELETE FROM DailyMetrics');
  db.exec('DELETE FROM Country');

  // Создание таблиц
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

  // Создание стран
  const countries = new Map<string, { name: string; code: string; currency: string }>();
  for (const s of SHEETS) {
    if (!countries.has(s.country)) {
      countries.set(s.country, { name: s.name, code: s.code, currency: s.currency });
    }
  }

  const insertCountry = db.prepare(`
    INSERT OR REPLACE INTO Country (id, name, code, currency, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  for (const [id, info] of countries) {
    insertCountry.run(id, info.name, info.code, info.currency);
    console.log(`Создана страна: ${info.name}`);
  }

  // Подготовка insert
  const insertMetric = db.prepare(`
    INSERT OR IGNORE INTO DailyMetrics (
      id, date, countryId, totalSpend, agencyFee,
      revenueLocalPriemka, revenueUsdtPriemka, exchangeRatePriemka, commissionPriemka,
      revenueLocalOwn, revenueUsdtOwn, exchangeRateOwn,
      totalRevenueUsdt, totalExpensesUsdt, expensesWithoutSpend,
      fdCount, fdSumLocal, fdSumUsdt, rdSumLocal, rdSumUsdt,
      payrollRdHandler, payrollFdHandler, payrollBuyer, payrollHeadDesigner, totalPayroll,
      chatterfyCost, additionalExpenses, netProfitMath, roi,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  let totalImported = 0;

  // Обработка каждого листа
  for (const sheetInfo of SHEETS) {
    const sheet = workbook.Sheets[sheetInfo.sheet];
    if (!sheet) {
      console.log(`Лист "${sheetInfo.sheet}" не найден`);
      continue;
    }

    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
    if (rawData.length < 2) continue;

    const headers = (rawData[0] as string[]).map(h => h || '');

    // Найти индексы колонок
    const cols = {
      date: findColumn(headers, 'дата'),
      spendTotal: findColumn(headers, 'спенд за день'),
      spendTrust: findColumn(headers, 'спенд trust'),
      spendCrossgif: findColumn(headers, 'спенд кросгиф', 'спенд кроссгиф'),
      spendFbm: findColumn(headers, 'спенд на fbm'),
      agencyFee: findColumn(headers, 'процент агенства'),
      revenueLocalPriemka: findColumn(headers, 'доход в sol приемка'),
      revenueUsdtPriemka: findColumn(headers, 'доход в usdt приемка'),
      revenueLocalOwn: findColumn(headers, 'доход в sol наш'),
      revenueUsdtOwn: findColumn(headers, 'доход в usdt наш'),
      exchangeRateOwn: findColumn(headers, 'курс обмена наш'),
      totalRevenueUsdt: findColumn(headers, 'общий доход usdt'),
      totalExpensesUsdt: findColumn(headers, 'общие расходы usdt'),
      expensesWithoutSpend: findColumn(headers, 'расходы без спенда'),
      fdCount: findColumn(headers, 'фд кол-во'),
      fdSumLocal: findColumn(headers, 'фд сумма sol'),
      fdSumUsdt: findColumn(headers, 'фд сумма usdt'),
      rdSumLocal: findColumn(headers, 'рд сумма'),
      rdSumUsdt: findColumn(headers, 'рд сумма usdt'),
      totalPayroll: findColumn(headers, 'общий фот'),
      chatterfy: findColumn(headers, 'chatterfy'),
      additionalExpenses: findColumn(headers, 'доп расходы'),
      netProfit: findColumn(headers, 'чистая прибыль математика'),
      roi: findColumn(headers, 'roi%'),
    };

    console.log(`\nОбработка: ${sheetInfo.sheet}`);

    const processedDates = new Set<string>();
    let sheetCount = 0;

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[];
      if (!row || !row[cols.date]) continue;

      const date = parseDate(row[cols.date]);
      if (!date) continue;

      const dateStr = date.toISOString().split('T')[0];
      if (processedDates.has(dateStr)) continue;
      processedDates.add(dateStr);

      // Извлекаем готовые значения из Excel
      const totalSpend = num(row[cols.spendTotal]) || (num(row[cols.spendTrust]) + num(row[cols.spendCrossgif]) + num(row[cols.spendFbm]));
      const totalRevenueUsdt = num(row[cols.totalRevenueUsdt]) || (num(row[cols.revenueUsdtPriemka]) + num(row[cols.revenueUsdtOwn]));
      const totalExpensesUsdt = num(row[cols.totalExpensesUsdt]);
      const netProfit = num(row[cols.netProfit]);
      const roi = num(row[cols.roi]);

      // Пропускаем строки без данных
      if (totalSpend === 0 && totalRevenueUsdt === 0 && netProfit === 0) continue;

      const id = uuidv4();

      insertMetric.run(
        id,
        dateStr,
        sheetInfo.country,
        totalSpend,
        num(row[cols.agencyFee]),
        num(row[cols.revenueLocalPriemka]),
        num(row[cols.revenueUsdtPriemka]),
        0, // exchangeRatePriemka
        num(row[cols.revenueUsdtPriemka]) * 0.15, // commissionPriemka
        num(row[cols.revenueLocalOwn]),
        num(row[cols.revenueUsdtOwn]),
        num(row[cols.exchangeRateOwn]),
        totalRevenueUsdt,
        totalExpensesUsdt,
        num(row[cols.expensesWithoutSpend]),
        Math.round(num(row[cols.fdCount])),
        num(row[cols.fdSumLocal]),
        num(row[cols.fdSumUsdt]),
        num(row[cols.rdSumLocal]),
        num(row[cols.rdSumUsdt]),
        0, // payrollRdHandler
        0, // payrollFdHandler
        0, // payrollBuyer
        10, // payrollHeadDesigner
        num(row[cols.totalPayroll]),
        num(row[cols.chatterfy]),
        num(row[cols.additionalExpenses]),
        netProfit,
        roi
      );

      sheetCount++;
      totalImported++;
    }

    console.log(`  Импортировано: ${sheetCount} записей`);
  }

  // Итоги
  console.log('\n=== ИТОГИ ===');
  console.log(`Всего импортировано: ${totalImported} записей\n`);

  // Статистика по странам
  const stats = db.prepare(`
    SELECT
      c.name,
      COUNT(*) as records,
      ROUND(SUM(m.totalRevenueUsdt), 2) as revenue,
      ROUND(SUM(m.totalSpend), 2) as spend,
      ROUND(SUM(m.netProfitMath), 2) as profit,
      MIN(m.date) as minDate,
      MAX(m.date) as maxDate
    FROM DailyMetrics m
    JOIN Country c ON m.countryId = c.id
    GROUP BY c.id
    ORDER BY revenue DESC
  `).all() as Array<{name: string; records: number; revenue: number; spend: number; profit: number; minDate: string; maxDate: string}>;

  for (const s of stats) {
    console.log(`${s.name}:`);
    console.log(`  Записей: ${s.records}`);
    console.log(`  Доход: $${s.revenue}`);
    console.log(`  Спенд: $${s.spend}`);
    console.log(`  Прибыль: $${s.profit}`);
    console.log(`  Период: ${s.minDate} - ${s.maxDate}\n`);
  }

  // Общие итоги
  const totals = db.prepare(`
    SELECT
      ROUND(SUM(totalRevenueUsdt), 2) as revenue,
      ROUND(SUM(totalSpend), 2) as spend,
      ROUND(SUM(netProfitMath), 2) as profit
    FROM DailyMetrics
  `).get() as {revenue: number; spend: number; profit: number};

  console.log('=== ОБЩИЕ ИТОГИ ===');
  console.log(`Доход: $${totals.revenue}`);
  console.log(`Спенд: $${totals.spend}`);
  console.log(`Прибыль: $${totals.profit}`);

  db.close();
  console.log('\nГотово!');
}

main().catch(console.error);
