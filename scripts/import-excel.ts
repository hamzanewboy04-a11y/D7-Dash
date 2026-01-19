import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

// Sheet name to country code mapping
const SHEET_COUNTRY_MAP: Record<string, string> = {
  // Peru sheets
  "Перу Декабрь": "PE",
  "Перу Ноябрь": "PE",
  "Перу Октябрь": "PE",
  "Перу Сентябрь": "PE",
  "Перу Август": "PE",
  "Перу Июль": "PE",
  "Перу Июнь": "PE",
  "Перу Май": "PE",
  "Перу Апрель": "PE",
  "Перу Январь": "PE",
  "Перу Январь 2": "PE",
  // Italy Women sheets
  "Италия Декабрь": "IT_F",
  "Италия Ноябрь": "IT_F",
  "Италия Октябрь": "IT_F",
  "Италия Сентябрь": "IT_F",
  "Италия Август": "IT_F",
  "Италия Июль Ж": "IT_F",
  "Италия Ж Декабрь": "IT_F",
  "Италия Ж Январь": "IT_F",
  "Италия Ж Ноябрь": "IT_F",
  // Italy Men sheets
  "Италия Июль М": "IT_M",
  "Италия Август М": "IT_M",
  "Италия Сентябрь М": "IT_M",
  "Италия Октябрь М": "IT_M",
  "Италия Ноябрь М": "IT_M",
  "Италия Декабрь М": "IT_M",
  "Италия М декабрь": "IT_M",
  "Италия М Ноябрь": "IT_M",
  "Италия М Ноябрь ": "IT_M",
  // Argentina sheets
  "Аргентина Август": "AR",
  "Аргентина Сентябрь": "AR",
  "Аргентина Октябрь": "AR",
  "Аргентина Ноябрь": "AR",
  "Аргентина Декабрь": "AR",
  "Аргентина декабрь": "AR",
  "Аргентина январь": "AR",
  // Chile sheets
  "Чили Октябрь": "CL",
  "Чили Ноябрь": "CL",
  "Чили Декабрь": "CL",
  "Чили декабрь": "CL",
};

// Column name mappings (Russian to field name)
const COLUMN_MAP: Record<string, string> = {
  "дата": "date",
  "день": "date",
  "date": "date",
  // Trust spend
  "траст спенд": "spendTrust",
  "trust спенд": "spendTrust",
  "траст": "spendTrust",
  // Crossgif spend
  "кросгиф спенд": "spendCrossgif",
  "crossgif спенд": "spendCrossgif",
  "кросгиф": "spendCrossgif",
  // FBM spend
  "fbm спенд": "spendFbm",
  "фбм спенд": "spendFbm",
  "fbm": "spendFbm",
  // Revenue Priemka
  "доход sol приёмка": "revenueLocalPriemka",
  "доход в sol приёмка": "revenueLocalPriemka",
  "доход sol": "revenueLocalPriemka",
  "доход в sol": "revenueLocalPriemka",
  "доход eur приёмка": "revenueLocalPriemka",
  "доход в eur приёмка": "revenueLocalPriemka",
  "доход ars приёмка": "revenueLocalPriemka",
  "доход clp приёмка": "revenueLocalPriemka",
  "доход usdt приёмка": "revenueUsdtPriemka",
  "доход в usdt приёмка": "revenueUsdtPriemka",
  // Revenue Own
  "доход sol наш": "revenueLocalOwn",
  "доход в sol наш": "revenueLocalOwn",
  "доход eur наш": "revenueLocalOwn",
  "доход usdt наш": "revenueUsdtOwn",
  "доход в usdt наш": "revenueUsdtOwn",
  // FD
  "фд кол-во": "fdCount",
  "фд количество": "fdCount",
  "кол-во фд": "fdCount",
  "фд сумма sol": "fdSumLocal",
  "фд сумма": "fdSumLocal",
  "фд сумма eur": "fdSumLocal",
  // Other
  "chatterfy": "chatterfyCost",
  "чаттерфай": "chatterfyCost",
  "доп расходы": "additionalExpenses",
  "дополнительные расходы": "additionalExpenses",
};

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d);
    }
  }

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

// Calculate metrics from raw data
function calculateMetrics(data: Record<string, number>) {
  const spendTrust = data.spendTrust || 0;
  const spendCrossgif = data.spendCrossgif || 0;
  const spendFbm = data.spendFbm || 0;

  const totalSpend = spendTrust + spendCrossgif + spendFbm;
  const agencyFee = spendTrust * 0.09 + spendCrossgif * 0.08 + spendFbm * 0.08;

  const revenueUsdtPriemka = data.revenueUsdtPriemka || 0;
  const revenueUsdtOwn = data.revenueUsdtOwn || 0;
  const commissionPriemka = revenueUsdtPriemka * 0.15;

  const totalRevenueUsdt = revenueUsdtPriemka - commissionPriemka + revenueUsdtOwn;

  const payrollBuyer = totalSpend * 0.12;
  const fdCount = data.fdCount || 0;
  let fdRate = fdCount < 5 ? 3 : fdCount < 10 ? 4 : 5;
  const fdBonus = fdCount >= 5 ? 15 : 0;
  const payrollFdHandler = (fdCount * fdRate + fdBonus) * 1.2;
  const payrollRdHandler = totalRevenueUsdt * 0.04;
  const totalPayroll = payrollBuyer + payrollFdHandler + payrollRdHandler + 10;

  const chatterfyCost = data.chatterfyCost || 0;
  const additionalExpenses = data.additionalExpenses || 0;

  const totalExpensesUsdt = totalSpend + agencyFee + commissionPriemka + totalPayroll + chatterfyCost + additionalExpenses;
  const netProfitMath = totalRevenueUsdt - totalExpensesUsdt;
  const roi = totalExpensesUsdt > 0 ? netProfitMath / totalExpensesUsdt : 0;

  return {
    totalSpend,
    agencyFee,
    commissionPriemka,
    totalRevenueUsdt,
    payrollBuyer,
    payrollFdHandler,
    payrollRdHandler,
    totalPayroll,
    totalExpensesUsdt,
    netProfitMath,
    roi,
  };
}

async function main() {
  const dbPath = path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  console.log("🚀 Starting data import...\n");

  // Step 1: Create countries
  console.log("📍 Creating countries...");
  const countries = [
    { name: "Peru", code: "PE", currency: "SOL" },
    { name: "Italy (Women)", code: "IT_F", currency: "EUR" },
    { name: "Italy (Men)", code: "IT_M", currency: "EUR" },
    { name: "Argentina", code: "AR", currency: "ARS" },
    { name: "Chile", code: "CL", currency: "CLP" },
  ];

  const countryMap: Record<string, string> = {};

  for (const country of countries) {
    const existing = await prisma.country.findFirst({
      where: { code: country.code },
    });

    if (existing) {
      countryMap[country.code] = existing.id;
      console.log(`  ✓ ${country.name} (exists)`);
    } else {
      const created = await prisma.country.create({
        data: country,
      });
      countryMap[country.code] = created.id;
      console.log(`  ✓ ${country.name} (created)`);
    }
  }

  // Step 2: Read Excel file
  const excelPath = path.join(process.cwd(), "D7 TEAM (1).xlsx");
  console.log(`\n📊 Reading Excel file: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath, { cellDates: true });
  console.log(`  Found ${workbook.SheetNames.length} sheets\n`);

  // Step 3: Process each sheet
  let totalImported = 0;
  let totalUpdated = 0;

  for (const sheetName of workbook.SheetNames) {
    const countryCode = SHEET_COUNTRY_MAP[sheetName];
    if (!countryCode) {
      console.log(`⏭️  Skipping sheet: ${sheetName} (no mapping)`);
      continue;
    }

    const countryId = countryMap[countryCode];
    if (!countryId) {
      console.log(`⏭️  Skipping sheet: ${sheetName} (country not found)`);
      continue;
    }

    console.log(`📄 Processing: ${sheetName} → ${countryCode}`);

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    let sheetImported = 0;
    let sheetUpdated = 0;

    for (const row of rawData) {
      // Parse row data
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

      // Calculate metrics
      const metrics = calculateMetrics(data);

      // Upsert record
      try {
        const existing = await prisma.dailyMetrics.findUnique({
          where: {
            date_countryId: { date, countryId },
          },
        });

        const recordData = {
          date,
          countryId,
          totalSpend: metrics.totalSpend,
          agencyFee: metrics.agencyFee,
          revenueLocalPriemka: data.revenueLocalPriemka || 0,
          revenueUsdtPriemka: data.revenueUsdtPriemka || 0,
          commissionPriemka: metrics.commissionPriemka,
          revenueLocalOwn: data.revenueLocalOwn || 0,
          revenueUsdtOwn: data.revenueUsdtOwn || 0,
          totalRevenueUsdt: metrics.totalRevenueUsdt,
          totalExpensesUsdt: metrics.totalExpensesUsdt,
          fdCount: Math.round(data.fdCount || 0),
          fdSumLocal: data.fdSumLocal || 0,
          payrollBuyer: metrics.payrollBuyer,
          payrollFdHandler: metrics.payrollFdHandler,
          payrollRdHandler: metrics.payrollRdHandler,
          payrollHeadDesigner: 10,
          totalPayroll: metrics.totalPayroll,
          chatterfyCost: data.chatterfyCost || 0,
          additionalExpenses: data.additionalExpenses || 0,
          netProfitMath: metrics.netProfitMath,
          roi: metrics.roi,
        };

        if (existing) {
          await prisma.dailyMetrics.update({
            where: { id: existing.id },
            data: recordData,
          });
          sheetUpdated++;
        } else {
          await prisma.dailyMetrics.create({ data: recordData });
          sheetImported++;
        }
      } catch (error) {
        // Skip duplicate or invalid records
      }
    }

    console.log(`  → ${sheetImported} imported, ${sheetUpdated} updated`);
    totalImported += sheetImported;
    totalUpdated += sheetUpdated;
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Total imported: ${totalImported}`);
  console.log(`   Total updated: ${totalUpdated}`);

  await prisma.$disconnect();
}

main().catch(console.error);
