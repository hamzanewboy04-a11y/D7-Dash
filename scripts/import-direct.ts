import * as XLSX from "xlsx";
import Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

const SHEET_COUNTRY_MAP: Record<string, string> = {
  "Перу Декабрь": "PE", "Перу Ноябрь": "PE", "Перу Январь": "PE", "Перу Январь 2": "PE",
  "Италия Ж Декабрь": "IT_F", "Италия Ж Ноябрь": "IT_F", "Италия Ж Январь": "IT_F",
  "Италия М декабрь": "IT_M", "Италия М Ноябрь": "IT_M", "Италия М Ноябрь ": "IT_M",
  "Аргентина декабрь": "AR", "Аргентина Ноябрь": "AR", "Аргентина январь": "AR",
  "Чили декабрь": "CL", "Чили Ноябрь": "CL",
};

const COLUMN_MAP: Record<string, string> = {
  "дата": "date",
  "спенд trust": "spendTrust", "спенд за день": "totalSpend",
  "баланс рк факт": "adAccountBalanceFact", "баланс рк математика": "adAccountBalanceMath",
  "внесли на рк суммарно": "adAccountDeposit",
  "процент агенства от спенда (траст 9 остальные 8)": "agencyFee",
  "доход в sol приемка": "revenueLocalPriemka", "доход в usdt приемка": "revenueUsdtPriemka",
  "доход в sol наш": "revenueLocalOwn", "доход в usdt наш": "revenueUsdtOwn",
  "курс обмена наш": "exchangeRateOwn", "курс обмена приемка": "exchangeRatePriemka",
  "общий доход usdt": "totalRevenueUsdt", "общие расходы usdt": "totalExpensesUsdt",
  "расходы без спенда": "expensesWithoutSpend",
  "выведено с наших реков": "withdrawnFromOwn", "выведено с приемки": "withdrawnFromPriemka",
  "фд кол-во": "fdCount", "фд сумма sol": "fdSumLocal", "фд сумма usdt": "fdSumUsdt",
  "нфд кол-во": "nfdCount", "нфд сумма sol": "nfdSumLocal",
  "рд кол-во": "rdCount", "рд сумма": "rdSumLocal",
  "чистая прибыль математика": "netProfitMath", "roi%": "roi", "roi": "roi",
  "chatterfy": "chatterfyCost", "доп расходы": "additionalExpenses",
};

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return new Date(date.y, date.m - 1, date.d);
  }
  const str = String(value);
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;
  return null;
}

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

async function main() {
  const db = new Database("data.db");
  console.log("Using SQLite database: data.db");
  
  const countries = db.prepare("SELECT id, code FROM Country").all() as {id: string, code: string}[];
  const countryMap: Record<string, string> = {};
  countries.forEach(c => countryMap[c.code] = c.id);
  console.log("Countries:", Object.keys(countryMap));

  const workbook = XLSX.readFile("D7 TEAM (1).xlsx", { cellDates: true });
  console.log("Found", workbook.SheetNames.length, "sheets");

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO DailyMetrics (
      id, date, countryId, totalSpend, agencyFee, 
      revenueLocalPriemka, revenueUsdtPriemka, exchangeRatePriemka,
      revenueLocalOwn, revenueUsdtOwn, exchangeRateOwn,
      totalRevenueUsdt, totalExpensesUsdt, expensesWithoutSpend,
      withdrawnFromOwn, withdrawnFromPriemka,
      fdCount, fdSumLocal, fdSumUsdt, nfdCount, nfdSumLocal,
      rdCount, rdSumLocal, netProfitMath, roi,
      chatterfyCost, additionalExpenses,
      adAccountBalanceFact, adAccountBalanceMath, adAccountDeposit,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalImported = 0;

  for (const sheetName of workbook.SheetNames) {
    const countryCode = SHEET_COUNTRY_MAP[sheetName];
    if (!countryCode) continue;
    
    const countryId = countryMap[countryCode];
    if (!countryId) {
      console.log("Country not found:", countryCode);
      continue;
    }

    console.log("Processing:", sheetName, "->", countryCode);
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
    
    let imported = 0;
    for (const row of rawData) {
      const data: Record<string, number> = {};
      let date: Date | null = null;

      for (const [colName, value] of Object.entries(row)) {
        const normalizedCol = colName.toLowerCase().trim();
        const field = COLUMN_MAP[normalizedCol];
        if (field === "date") {
          date = parseDate(value);
        } else if (field) {
          data[field] = parseNumber(value);
        }
      }

      if (!date) continue;

      try {
        const id = uuid();
        const dateStr = date.toISOString();
        const now = new Date().toISOString();
        
        insertStmt.run(
          id, dateStr, countryId,
          data.totalSpend || 0, data.agencyFee || 0,
          data.revenueLocalPriemka || 0, data.revenueUsdtPriemka || 0, data.exchangeRatePriemka || 0,
          data.revenueLocalOwn || 0, data.revenueUsdtOwn || 0, data.exchangeRateOwn || 0,
          data.totalRevenueUsdt || 0, data.totalExpensesUsdt || 0, data.expensesWithoutSpend || 0,
          data.withdrawnFromOwn || 0, data.withdrawnFromPriemka || 0,
          Math.round(data.fdCount || 0), data.fdSumLocal || 0, data.fdSumUsdt || 0,
          Math.round(data.nfdCount || 0), data.nfdSumLocal || 0,
          Math.round(data.rdCount || 0), data.rdSumLocal || 0,
          data.netProfitMath || 0, data.roi || 0,
          data.chatterfyCost || 0, data.additionalExpenses || 0,
          data.adAccountBalanceFact || 0, data.adAccountBalanceMath || 0, data.adAccountDeposit || 0,
          now, now
        );
        imported++;
      } catch (e) {
        console.error("  Error:", (e as Error).message);
      }
    }
    console.log("  Imported:", imported);
    totalImported += imported;
  }

  db.close();
  console.log("\nTotal imported:", totalImported);
}

main().catch(console.error);
