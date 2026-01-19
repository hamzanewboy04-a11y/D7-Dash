import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { calculateAllMetrics } from "@/lib/calculations";

interface ParsedRow {
  date: string;
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
}

// Map column names to our fields
const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  // Date variations
  "дата": "date",
  "date": "date",
  "день": "date",
  // Spend variations
  "траст спенд": "spendTrust",
  "trust": "spendTrust",
  "траст": "spendTrust",
  "кросгиф спенд": "spendCrossgif",
  "кросгиф": "spendCrossgif",
  "crossgif": "spendCrossgif",
  "fbm спенд": "spendFbm",
  "fbm": "spendFbm",
  // Revenue Priemka
  "доход sol приёмка": "revenueLocalPriemka",
  "доход sol": "revenueLocalPriemka",
  "доход в sol приёмка": "revenueLocalPriemka",
  "доход usdt приёмка": "revenueUsdtPriemka",
  "доход в usdt приёмка": "revenueUsdtPriemka",
  // Revenue Own
  "доход sol наш": "revenueLocalOwn",
  "доход в sol наш": "revenueLocalOwn",
  "доход usdt наш": "revenueUsdtOwn",
  "доход в usdt наш": "revenueUsdtOwn",
  // FD
  "фд кол-во": "fdCount",
  "фд количество": "fdCount",
  "fd count": "fdCount",
  "фд сумма sol": "fdSumLocal",
  "фд сумма": "fdSumLocal",
  // Other
  "chatterfy": "chatterfyCost",
  "чаттерфай": "chatterfyCost",
  "доп расходы": "additionalExpenses",
  "дополнительные расходы": "additionalExpenses",
};

function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[^\d.-]/g, "");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  // Handle Excel serial date
  if (typeof value === "number") {
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

function parseRow(row: Record<string, unknown>): ParsedRow | null {
  const result: Partial<ParsedRow> = {
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
  };

  for (const [colName, value] of Object.entries(row)) {
    const normalizedCol = colName.toLowerCase().trim();
    const field = COLUMN_MAP[normalizedCol];

    if (field === "date") {
      const date = parseDate(value);
      if (date) {
        result.date = date.toISOString();
      }
    } else if (field) {
      const num = parseNumber(value);
      if (field === "fdCount") {
        (result as Record<string, number>)[field] = Math.round(num);
      } else {
        (result as Record<string, number>)[field] = num;
      }
    }
  }

  if (!result.date) {
    return null;
  }

  return result as ParsedRow;
}

// POST /api/import - Import Excel file
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const countryId = formData.get("countryId") as string;
    const sheetName = formData.get("sheetName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!countryId) {
      return NextResponse.json({ error: "Country ID is required" }, { status: 400 });
    }

    // Verify country exists
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    // Get sheet
    const targetSheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheet];

    if (!worksheet) {
      return NextResponse.json({ error: "Sheet not found" }, { status: 404 });
    }

    // Parse data
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    const parsedRows: ParsedRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as Record<string, unknown>;
      const parsed = parseRow(row);

      if (parsed) {
        parsedRows.push(parsed);
      } else if (Object.keys(row).length > 0) {
        errors.push(`Row ${i + 2}: Could not parse date`);
      }
    }

    if (parsedRows.length === 0) {
      return NextResponse.json({
        error: "No valid data found in file",
        details: errors,
      }, { status: 400 });
    }

    // Import data
    let imported = 0;
    let updated = 0;
    const importErrors: string[] = [];

    for (const row of parsedRows) {
      try {
        const date = new Date(row.date);

        // Calculate metrics
        const calculated = calculateAllMetrics({
          spendTrust: row.spendTrust,
          spendCrossgif: row.spendCrossgif,
          spendFbm: row.spendFbm,
          revenueLocalPriemka: row.revenueLocalPriemka,
          revenueUsdtPriemka: row.revenueUsdtPriemka,
          revenueLocalOwn: row.revenueLocalOwn,
          revenueUsdtOwn: row.revenueUsdtOwn,
          fdCount: row.fdCount,
          fdSumLocal: row.fdSumLocal,
          chatterfyCost: row.chatterfyCost,
          additionalExpenses: row.additionalExpenses,
        });

        // Check if record exists
        const existing = await prisma.dailyMetrics.findUnique({
          where: {
            date_countryId: {
              date,
              countryId,
            },
          },
        });

        const data = {
          date,
          countryId,
          totalSpend: calculated.totalSpend,
          agencyFee: calculated.agencyFee,
          revenueLocalPriemka: row.revenueLocalPriemka,
          revenueUsdtPriemka: row.revenueUsdtPriemka,
          exchangeRatePriemka: calculated.exchangeRatePriemka,
          commissionPriemka: calculated.commissionPriemka,
          revenueLocalOwn: row.revenueLocalOwn,
          revenueUsdtOwn: row.revenueUsdtOwn,
          exchangeRateOwn: calculated.exchangeRateOwn,
          totalRevenueUsdt: calculated.totalRevenueUsdt,
          totalExpensesUsdt: calculated.totalExpensesUsdt,
          expensesWithoutSpend: calculated.expensesWithoutSpend,
          fdCount: row.fdCount,
          fdSumLocal: row.fdSumLocal,
          fdSumUsdt: calculated.fdSumUsdt,
          rdSumLocal: calculated.rdSumLocal,
          rdSumUsdt: calculated.rdSumUsdt,
          payrollRdHandler: calculated.payrollRdHandler,
          payrollFdHandler: calculated.payrollFdHandler,
          payrollBuyer: calculated.payrollBuyer,
          payrollHeadDesigner: 10,
          totalPayroll: calculated.totalPayroll,
          chatterfyCost: row.chatterfyCost,
          additionalExpenses: row.additionalExpenses,
          netProfitMath: calculated.netProfitMath,
          roi: calculated.roi,
        };

        if (existing) {
          await prisma.dailyMetrics.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await prisma.dailyMetrics.create({ data });
          imported++;
        }
      } catch (error) {
        const dateStr = new Date(row.date).toLocaleDateString();
        importErrors.push(`${dateStr}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: parsedRows.length,
      errors: importErrors.length > 0 ? importErrors : undefined,
      parseErrors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error importing file:", error);
    return NextResponse.json(
      { error: "Failed to import file" },
      { status: 500 }
    );
  }
}

// GET /api/import - Get available sheets from Excel file
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get("preview");

  if (fileUrl) {
    return NextResponse.json({ error: "Preview not supported via GET" }, { status: 400 });
  }

  return NextResponse.json({
    supportedFormats: [".xlsx", ".xls"],
    requiredColumns: [
      "Date (Дата)",
      "Trust spend (Траст спенд)",
      "Crossgif spend (Кросгиф спенд)",
      "FBM spend",
      "Revenue SOL Priemka (Доход SOL Приёмка)",
      "Revenue USDT Priemka (Доход USDT Приёмка)",
      "FD Count (ФД кол-во)",
      "FD Sum (ФД сумма)",
    ],
    optionalColumns: [
      "Revenue SOL Own (Доход SOL Наш)",
      "Revenue USDT Own (Доход USDT Наш)",
      "Chatterfy",
      "Additional Expenses (Доп расходы)",
    ],
  });
}
