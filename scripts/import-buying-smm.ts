import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('ssl=') ? undefined : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function excelDateToJSDate(excelDate: number): Date {
  const startDate = new Date(1899, 11, 30);
  const date = new Date(startDate.getTime() + excelDate * 24 * 60 * 60 * 1000);
  return date;
}

async function getOrCreateCountry(name: string, code: string) {
  let country = await prisma.country.findFirst({
    where: { OR: [{ name }, { code }] },
  });

  if (!country) {
    country = await prisma.country.create({
      data: { name, code },
    });
    console.log(`Created country: ${name} (${code})`);
  }

  return country;
}

async function getOrCreateEmployee(name: string, role: string, countryId?: string) {
  let employee = await prisma.employee.findFirst({
    where: { name, role },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        name,
        role,
        countryId,
        percentRate: role === "buyer" ? 10 : undefined,
        percentageBase: role === "buyer" ? "spend" : undefined,
      },
    });
    console.log(`Created employee: ${name} (${role})`);
  }

  return employee;
}

async function importBuyerMetrics() {
  console.log("\n=== Importing Buyer Metrics ===\n");

  const workbook = XLSX.readFile("attached_assets/D7_TEAM___баеры__1768937180912.xlsx");

  const countryMappings: Record<string, { name: string; code: string }> = {
    "Перу(январь)": { name: "Перу", code: "PE" },
    "Перу(декабрь)": { name: "Перу", code: "PE" },
    "Перу(ноябрь)": { name: "Перу", code: "PE" },
    "Аргентина(январь)": { name: "Аргентина", code: "AR" },
    "Италия(январь)": { name: "Италия", code: "IT" },
    "Италия(декабрь)": { name: "Италия", code: "IT" },
    "Италия": { name: "Италия", code: "IT" },
  };

  const buyerMappings: Record<string, string> = {
    "Corie": "Corie",
    "Desk3 - Corie": "Corie",
    "Cabrera": "Cabrera",
    "Cabrera (итальянец)": "Cabrera",
  };

  let totalImported = 0;

  for (const sheetName of workbook.SheetNames) {
    const countryInfo = countryMappings[sheetName];
    if (!countryInfo) {
      console.log(`Skipping sheet: ${sheetName} (no country mapping)`);
      continue;
    }

    console.log(`\nProcessing sheet: ${sheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

    const country = await getOrCreateCountry(countryInfo.name, countryInfo.code);

    let currentBuyer: string | null = null;
    let currentDeskName: string | null = null;
    let currentPlatform: string | null = null;
    let headerRowIndex = -1;
    let colMapping: Record<string, number> = {};

    for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || "").trim();

      for (const [pattern, buyerName] of Object.entries(buyerMappings)) {
        if (firstCell.includes(pattern) || firstCell === pattern) {
          currentBuyer = buyerName;
          currentDeskName = firstCell;
          break;
        }
      }

      if (firstCell.toLowerCase().includes("crossgif") || firstCell.toLowerCase().includes("fbm")) {
        currentPlatform = firstCell;
        continue;
      }

      if (firstCell === "Дата") {
        headerRowIndex = rowIdx;
        colMapping = {};
        row.forEach((cell, idx) => {
          const header = String(cell).trim();
          if (header === "Дата") colMapping.date = idx;
          if (header.includes("спенд") && header.includes("вручную")) colMapping.spendManual = idx;
          if (header === "Общий спенд" || (header.includes("спенд") && !header.includes("вручную"))) {
            if (!colMapping.spend) colMapping.spend = idx;
          }
          if (header === "Подписки") colMapping.subscriptions = idx;
          if (header === "Диалоги") colMapping.dialogs = idx;
          if (header === "ФД") colMapping.fd = idx;
          if (header === "ЗП") colMapping.payroll = idx;
        });
        continue;
      }

      if (!currentBuyer || headerRowIndex < 0 || !colMapping.date) continue;

      const dateVal = row[colMapping.date];
      if (typeof dateVal !== "number" || dateVal < 40000 || dateVal > 50000) continue;

      const date = excelDateToJSDate(dateVal);
      const spendManual = typeof row[colMapping.spendManual] === "number" ? row[colMapping.spendManual] as number : null;
      const spend = typeof row[colMapping.spend] === "number" ? row[colMapping.spend] as number : (spendManual || 0);
      const subscriptions = typeof row[colMapping.subscriptions] === "number" ? Math.round(row[colMapping.subscriptions] as number) : 0;
      const dialogs = typeof row[colMapping.dialogs] === "number" ? Math.round(row[colMapping.dialogs] as number) : 0;
      const fdCount = typeof row[colMapping.fd] === "number" ? Math.round(row[colMapping.fd] as number) : 0;

      if (spend === 0 && subscriptions === 0 && dialogs === 0 && fdCount === 0) continue;

      const employee = await getOrCreateEmployee(currentBuyer, "buyer", country.id);

      const costPerSubscription = subscriptions > 0 ? spend / subscriptions : 0;
      const costPerFd = fdCount > 0 ? spend / fdCount : 0;
      const conversionRate = subscriptions > 0 ? (dialogs / subscriptions) * 100 : 0;
      const payrollAmount = spend * 0.10;

      try {
        await prisma.buyerMetrics.upsert({
          where: {
            date_employeeId_countryId: {
              date,
              employeeId: employee.id,
              countryId: country.id,
            },
          },
          update: {
            spendManual,
            spend,
            subscriptions,
            dialogs,
            fdCount,
            costPerSubscription,
            costPerFd,
            conversionRate,
            payrollAmount,
            deskName: currentDeskName,
            platformName: currentPlatform,
          },
          create: {
            date,
            employeeId: employee.id,
            countryId: country.id,
            spendManual,
            spend,
            subscriptions,
            dialogs,
            fdCount,
            costPerSubscription,
            costPerFd,
            conversionRate,
            payrollAmount,
            deskName: currentDeskName,
            platformName: currentPlatform,
          },
        });
        totalImported++;
      } catch (error) {
        console.error(`Error importing row:`, error);
      }
    }
  }

  console.log(`\nTotal buyer metrics imported: ${totalImported}`);
}

async function importSmmMetrics() {
  console.log("\n=== Importing SMM Metrics ===\n");

  const workbook = XLSX.readFile("attached_assets/D7_TEAM___SMM_1768937218310.xlsx");

  const countryMappings: Record<string, { name: string; code: string }> = {
    "Перу": { name: "Перу", code: "PE" },
    "Перу (2)": { name: "Перу 2", code: "PE2" },
    "Италия Ж": { name: "Италия Ж", code: "IT_F" },
    "Аргентина": { name: "Аргентина", code: "AR" },
    "Агентство": { name: "Агентство", code: "AGENCY" },
  };

  let totalImported = 0;

  for (const sheetName of workbook.SheetNames) {
    const countryInfo = countryMappings[sheetName];
    if (!countryInfo) {
      console.log(`Skipping sheet: ${sheetName} (no country mapping)`);
      continue;
    }

    console.log(`\nProcessing sheet: ${sheetName}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

    const country = await getOrCreateCountry(countryInfo.name, countryInfo.code);

    const headerRow = data[0] as string[];
    if (!headerRow) continue;

    const colMapping: Record<string, number> = {};
    headerRow.forEach((cell, idx) => {
      const header = String(cell).trim().toLowerCase();
      if (header === "дата") colMapping.date = idx;
      if (header === "план посты") colMapping.postsPlan = idx;
      if (header === "план в день" && !colMapping.postsPlanDaily) colMapping.postsPlanDaily = idx;
      if (header === "факт в день" && !colMapping.postsFactDaily) colMapping.postsFactDaily = idx;
      if (header === "итого шт" && !colMapping.postsTotal) colMapping.postsTotal = idx;
      if (header === "остаток" && !colMapping.postsRemaining) colMapping.postsRemaining = idx;
      if (header === "план сторис") colMapping.storiesPlan = idx;
      if (header === "план мини-отзывы") colMapping.miniReviewsPlan = idx;
      if (header === "план большие отзывы") colMapping.bigReviewsPlan = idx;
    });

    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.length === 0) continue;

      const dateVal = row[colMapping.date ?? 0];
      if (typeof dateVal !== "number" || dateVal < 40000 || dateVal > 50000) continue;

      const date = excelDateToJSDate(dateVal);

      const postsPlan = typeof row[colMapping.postsPlan] === "number" ? row[colMapping.postsPlan] as number : 0;
      const postsPlanDaily = typeof row[colMapping.postsPlanDaily] === "number" ? row[colMapping.postsPlanDaily] as number : 0;
      const postsFactDaily = typeof row[colMapping.postsFactDaily] === "number" ? row[colMapping.postsFactDaily] as number : 0;
      const postsTotal = typeof row[colMapping.postsTotal] === "number" ? row[colMapping.postsTotal] as number : 0;
      const postsRemaining = typeof row[colMapping.postsRemaining] === "number" ? row[colMapping.postsRemaining] as number : 0;

      const storiesPlan = typeof row[colMapping.storiesPlan] === "number" ? row[colMapping.storiesPlan] as number : 0;
      const storiesIdx = colMapping.storiesPlan ? colMapping.storiesPlan + 1 : 7;
      const storiesPlanDaily = typeof row[storiesIdx + 1] === "number" ? row[storiesIdx + 1] as number : 0;
      const storiesFactDaily = typeof row[storiesIdx + 2] === "number" ? row[storiesIdx + 2] as number : 0;
      const storiesTotal = typeof row[storiesIdx + 3] === "number" ? row[storiesIdx + 3] as number : 0;
      const storiesRemaining = typeof row[storiesIdx + 4] === "number" ? row[storiesIdx + 4] as number : 0;

      const miniIdx = colMapping.miniReviewsPlan || 13;
      const miniReviewsPlan = typeof row[miniIdx] === "number" ? row[miniIdx] as number : 0;
      const miniReviewsPlanDaily = typeof row[miniIdx + 1] === "number" ? row[miniIdx + 1] as number : 0;
      const miniReviewsFactDaily = typeof row[miniIdx + 2] === "number" ? row[miniIdx + 2] as number : 0;
      const miniReviewsTotal = typeof row[miniIdx + 3] === "number" ? row[miniIdx + 3] as number : 0;
      const miniReviewsRemaining = typeof row[miniIdx + 4] === "number" ? row[miniIdx + 4] as number : 0;

      const bigIdx = colMapping.bigReviewsPlan || 19;
      const bigReviewsPlan = typeof row[bigIdx] === "number" ? row[bigIdx] as number : 0;
      const bigReviewsPlanDaily = typeof row[bigIdx + 1] === "number" ? row[bigIdx + 1] as number : 0;
      const bigReviewsFactDaily = typeof row[bigIdx + 2] === "number" ? row[bigIdx + 2] as number : 0;
      const bigReviewsTotal = typeof row[bigIdx + 3] === "number" ? row[bigIdx + 3] as number : 0;
      const bigReviewsRemaining = typeof row[bigIdx + 4] === "number" ? row[bigIdx + 4] as number : 0;

      const totalPlan = postsPlan + storiesPlan + miniReviewsPlan + bigReviewsPlan;
      const totalFact = postsTotal + storiesTotal + miniReviewsTotal + bigReviewsTotal;
      if (totalPlan === 0 && totalFact === 0) continue;

      const completionRate = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;

      try {
        await prisma.smmMetrics.upsert({
          where: {
            date_countryId: {
              date,
              countryId: country.id,
            },
          },
          update: {
            postsPlan,
            postsPlanDaily,
            postsFactDaily,
            postsTotal,
            postsRemaining,
            storiesPlan,
            storiesPlanDaily,
            storiesFactDaily,
            storiesTotal,
            storiesRemaining,
            miniReviewsPlan,
            miniReviewsPlanDaily,
            miniReviewsFactDaily,
            miniReviewsTotal,
            miniReviewsRemaining,
            bigReviewsPlan,
            bigReviewsPlanDaily,
            bigReviewsFactDaily,
            bigReviewsTotal,
            bigReviewsRemaining,
            completionRate,
          },
          create: {
            date,
            countryId: country.id,
            postsPlan,
            postsPlanDaily,
            postsFactDaily,
            postsTotal,
            postsRemaining,
            storiesPlan,
            storiesPlanDaily,
            storiesFactDaily,
            storiesTotal,
            storiesRemaining,
            miniReviewsPlan,
            miniReviewsPlanDaily,
            miniReviewsFactDaily,
            miniReviewsTotal,
            miniReviewsRemaining,
            bigReviewsPlan,
            bigReviewsPlanDaily,
            bigReviewsFactDaily,
            bigReviewsTotal,
            bigReviewsRemaining,
            completionRate,
          },
        });
        totalImported++;
      } catch (error) {
        console.error(`Error importing SMM row:`, error);
      }
    }
  }

  console.log(`\nTotal SMM metrics imported: ${totalImported}`);
}

async function main() {
  console.log("Starting data import from Excel files...\n");

  try {
    await importBuyerMetrics();
    await importSmmMetrics();

    console.log("\n=== Import Complete ===");

    const buyerCount = await prisma.buyerMetrics.count();
    const smmCount = await prisma.smmMetrics.count();
    const employeeCount = await prisma.employee.count();
    const countryCount = await prisma.country.count();

    console.log(`\nDatabase Summary:`);
    console.log(`- Buyer Metrics: ${buyerCount}`);
    console.log(`- SMM Metrics: ${smmCount}`);
    console.log(`- Employees: ${employeeCount}`);
    console.log(`- Countries: ${countryCount}`);
  } catch (error) {
    console.error("Import failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
