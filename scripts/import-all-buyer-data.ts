import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import xlsx from "xlsx";
import fs from "fs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TableInfo {
  sheetName: string;
  country: string;
  countryId: string;
  month: string;
  startCol: number;
  deskName: string;
  cabinetName: string;
  platform: string;
}

interface MetricRow {
  date: Date;
  spendManual: number | null;
  spend: number;
  subscriptions: number;
  dialogs: number;
  fdCount: number;
  costPerSubscription: number;
  costPerFd: number;
  conversionRate: number;
  payroll: number;
}

const COUNTRY_MAP: Record<string, { name: string; id: string }> = {
  "Перу": { name: "Peru", id: "cmkl84ayd0000u6gkt1xxcvhl" },
  "Италия": { name: "Italy Women", id: "cmkl84azd0002u6gkoml9aboi" },
  "Аргентина": { name: "Argentina", id: "cmkl84azs0003u6gkwgsymoxq" },
  "Чили": { name: "Chile", id: "cmkl84b070004u6gkag39jtlk" },
};

function parseSheetName(name: string): { country: string; month: string } | null {
  const match = name.match(/^(.+)\((.+)\)$/);
  if (!match) return null;
  return { country: match[1], month: match[2] };
}

function parseDeskHeader(header: string): { deskName: string; cabinetName: string } {
  const match = header.match(/^(Desk\d+)\s*-\s*(.+)$/);
  if (match) {
    return { deskName: match[1], cabinetName: match[2].trim() };
  }
  const altMatch = header.match(/^(.+)\s*-\s*(Desk\d+)$/);
  if (altMatch) {
    return { deskName: altMatch[2], cabinetName: altMatch[1].trim() };
  }
  return { deskName: "Default", cabinetName: header.trim() };
}

function excelDateToJS(serial: number): Date | null {
  if (!serial || serial < 1000) return null;
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000);
}

function findAllTables(sheet: xlsx.WorkSheet, data: any[][]): TableInfo[] {
  const tables: TableInfo[] = [];
  const headerRow = data[2] || [];
  
  for (let col = 0; col < headerRow.length; col++) {
    if (headerRow[col] === "Дата") {
      tables.push({
        sheetName: "",
        country: "",
        countryId: "",
        month: "",
        startCol: col,
        deskName: "",
        cabinetName: "",
        platform: "",
      });
    }
  }
  
  return tables;
}

async function importExcel() {
  const excelPath = "attached_assets/D7_TEAM___баеры__1768937180912.xlsx";
  if (!fs.existsSync(excelPath)) {
    console.error("Excel file not found:", excelPath);
    return;
  }

  const wb = xlsx.readFile(excelPath);
  console.log("=== ПОЛНЫЙ ИМПОРТ ДАННЫХ ИЗ EXCEL ===\n");
  console.log("Листы:", wb.SheetNames);

  await prisma.buyerMetrics.deleteMany({});
  await prisma.desk.deleteMany({});
  await prisma.cabinet.deleteMany({});
  console.log("\nОчищены старые данные\n");

  const cabinetsMap = new Map<string, string>();
  const desksMap = new Map<string, string>();
  let totalMetrics = 0;

  for (const sheetName of wb.SheetNames) {
    const parsed = parseSheetName(sheetName);
    if (!parsed) {
      console.log(`Пропуск листа: ${sheetName} (неизвестный формат)`);
      continue;
    }

    const countryInfo = COUNTRY_MAP[parsed.country];
    if (!countryInfo) {
      console.log(`Пропуск листа: ${sheetName} (неизвестная страна: ${parsed.country})`);
      continue;
    }

    console.log(`\n=== ${sheetName} (${countryInfo.name}, ${parsed.month}) ===`);

    const sheet = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const deskHeaders = data[0] || [];
    const platformRow = data[1] || [];
    const headerRow = data[2] || [];

    const tableStarts: number[] = [];
    for (let col = 0; col < headerRow.length; col++) {
      if (headerRow[col] === "Дата") {
        tableStarts.push(col);
      }
    }

    console.log(`Найдено таблиц: ${tableStarts.length}`);

    for (let t = 0; t < tableStarts.length; t++) {
      const startCol = tableStarts[t];
      const endCol = tableStarts[t + 1] ? tableStarts[t + 1] - 1 : headerRow.length - 1;

      const deskHeader = deskHeaders[startCol] || `Table${t + 1}`;
      const platform = String(platformRow[startCol] || "");
      const { deskName, cabinetName } = parseDeskHeader(String(deskHeader));

      console.log(`  Таблица ${t + 1}: ${deskName} - ${cabinetName} (${platform})`);

      const cabinetKey = `${cabinetName}|${countryInfo.id}`;
      let cabinetId = cabinetsMap.get(cabinetKey);
      if (!cabinetId) {
        const cabinet = await prisma.cabinet.create({
          data: {
            name: cabinetName,
            platform: platform || null,
            countryId: countryInfo.id,
          },
        });
        cabinetId = cabinet.id;
        cabinetsMap.set(cabinetKey, cabinetId);
        console.log(`    Создан кабинет: ${cabinetName}`);
      }

      const deskKey = `${deskName}|${cabinetId}`;
      let deskId = desksMap.get(deskKey);
      if (!deskId) {
        const desk = await prisma.desk.create({
          data: {
            name: deskName,
            cabinetId: cabinetId,
          },
        });
        deskId = desk.id;
        desksMap.set(deskKey, deskId);
        console.log(`    Создан деск: ${deskName}`);
      }

      const headers: string[] = [];
      for (let col = startCol; col <= endCol && col < headerRow.length; col++) {
        headers.push(String(headerRow[col] || ""));
      }

      const spendManualIdx = headers.indexOf("Общий спенд(вручную)");
      const spendIdx = headers.indexOf("Общий спенд");
      const spendAltIdx = spendIdx === -1 ? headers.findIndex((h) => h.includes("спенд") && !h.includes("вручную")) : spendIdx;
      const subsIdx = headers.indexOf("Подписки");
      const dialogsIdx = headers.indexOf("Диалоги");
      const fdIdx = headers.indexOf("ФД");
      const costSubIdx = headers.indexOf("Цена подписки");
      const costFdIdx = headers.indexOf("Цена ФД");
      const convIdx = headers.findIndex((h) => h.includes("Конверсия"));
      const zpIdx = headers.indexOf("ЗП");

      let tableMetrics = 0;
      let tableSpend = 0;

      for (let row = 3; row < data.length; row++) {
        const rowData = data[row];
        if (!rowData) continue;

        const dateVal = rowData[startCol];
        if (!dateVal || String(dateVal).includes("ИТОГО") || String(dateVal).includes("Итого")) continue;

        let date: Date | null = null;
        if (typeof dateVal === "number") {
          date = excelDateToJS(dateVal);
        } else if (typeof dateVal === "string") {
          const parts = dateVal.split(".");
          if (parts.length >= 2) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parts.length > 2 ? parseInt(parts[2]) : 2026;
            date = new Date(year, month - 1, day);
          }
        }

        if (!date || isNaN(date.getTime())) continue;

        const getVal = (idx: number): number => {
          if (idx === -1) return 0;
          const val = rowData[startCol + idx];
          if (val === undefined || val === null || val === "") return 0;
          const num = parseFloat(String(val).replace(",", ".").replace(/\s/g, ""));
          return isNaN(num) ? 0 : num;
        };

        const spendManual = spendManualIdx !== -1 ? getVal(spendManualIdx) : null;
        let spend = getVal(spendAltIdx !== -1 ? spendAltIdx : 1);
        if (spend === 0 && spendManual) spend = spendManual;

        const subs = Math.round(getVal(subsIdx));
        const dialogs = Math.round(getVal(dialogsIdx));
        const fd = Math.round(getVal(fdIdx));
        const costSub = getVal(costSubIdx);
        const costFd = getVal(costFdIdx);
        const conv = getVal(convIdx);
        const zp = getVal(zpIdx);

        if (spend === 0 && subs === 0 && dialogs === 0 && fd === 0) continue;

        try {
          await prisma.buyerMetrics.create({
            data: {
              date,
              countryId: countryInfo.id,
              cabinetId,
              deskId,
              spendManual,
              spend,
              subscriptions: subs,
              dialogs,
              fdCount: fd,
              costPerSubscription: costSub,
              costPerFd: costFd,
              conversionRate: conv,
              payrollAmount: zp,
              deskName: `${deskName} - ${cabinetName}`,
              platformName: platform || null,
            },
          });
          tableMetrics++;
          tableSpend += spend;
        } catch (e: any) {
          console.error(`    Ошибка записи: ${date.toISOString().split("T")[0]}`, e.message);
        }
      }

      console.log(`    Записей: ${tableMetrics}, Spend: $${tableSpend.toFixed(2)}`);
      totalMetrics += tableMetrics;
    }
  }

  console.log(`\n=== ИТОГО ===`);
  console.log(`Кабинетов: ${cabinetsMap.size}`);
  console.log(`Десков: ${desksMap.size}`);
  console.log(`Метрик: ${totalMetrics}`);

  const summary = await prisma.buyerMetrics.groupBy({
    by: ["countryId"],
    _count: { id: true },
    _sum: { spend: true },
  });

  console.log("\nПо странам:");
  for (const row of summary) {
    const countryName = Object.entries(COUNTRY_MAP).find(([, v]) => v.id === row.countryId)?.[1]?.name || row.countryId;
    console.log(`  ${countryName}: ${row._count.id} записей, $${row._sum.spend?.toFixed(2)}`);
  }

  const cabinets = await prisma.cabinet.findMany({ include: { desks: true } });
  console.log("\nКабинеты и дески:");
  for (const cab of cabinets) {
    console.log(`  ${cab.name}: ${cab.desks.map((d) => d.name).join(", ")}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

importExcel().catch(console.error);
