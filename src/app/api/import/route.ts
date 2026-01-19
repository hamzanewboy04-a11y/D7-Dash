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

// Flexible column mapping with multiple variations
// Based on actual Excel columns from D7 TEAM (1).xlsx:
// - Перу: "Доход в sol Приемка", "Доход в USDT Приемка", "Доход в sol Наш", "Доход в USDT Наш"
// - Италия: "Доход в euro Приемка", "Доход в euro Наш", "Доход в USDT Наш"
// - Спенд: "Спенд TRUST", "Спенд Кросгиф", "Спенд на FBM"
const COLUMN_PATTERNS: Array<{ pattern: RegExp; field: keyof ParsedRow }> = [
  // Date
  { pattern: /^дата$/i, field: "date" },
  { pattern: /^date$/i, field: "date" },
  { pattern: /^день$/i, field: "date" },

  // Trust Spend - match "Спенд TRUST" or "ТРАСТ"
  { pattern: /спенд\s*trust/i, field: "spendTrust" },
  { pattern: /спенд\s*траст/i, field: "spendTrust" },
  { pattern: /траст.*спенд/i, field: "spendTrust" },
  { pattern: /trust.*spend/i, field: "spendTrust" },
  { pattern: /^траст$/i, field: "spendTrust" },
  { pattern: /^trust$/i, field: "spendTrust" },

  // Crossgif Spend - match "Спенд Кросгиф" or "Кроссгиф"
  { pattern: /спенд\s*кросс?гиф/i, field: "spendCrossgif" },
  { pattern: /кросс?гиф.*спенд/i, field: "spendCrossgif" },
  { pattern: /crossgif.*spend/i, field: "spendCrossgif" },
  { pattern: /^кросс?гиф$/i, field: "spendCrossgif" },
  { pattern: /^crossgif$/i, field: "spendCrossgif" },

  // FBM Spend - match "Спенд на FBM" or "Спенд FBM"
  { pattern: /спенд.*fbm/i, field: "spendFbm" },
  { pattern: /fbm.*спенд/i, field: "spendFbm" },
  { pattern: /спенд\s*на\s*fbm/i, field: "spendFbm" },
  { pattern: /fbm.*spend/i, field: "spendFbm" },
  { pattern: /^fbm$/i, field: "spendFbm" },

  // Revenue Priemka (Local currency: SOL for Peru, EUR for Italy)
  // Match: "Доход в sol Приемка", "Доход в euro Приемка", "Доход в euro приемка"
  // Excludes columns with "Наш" (Own revenue) or numbered suffixes like "Приемка 2"
  { pattern: /^доход\s+в\s+(sol|euro)\s+при[её]мк?а?\s*$/i, field: "revenueLocalPriemka" },
  { pattern: /доход.*(?:sol|euro).*при[её]мк?а(?!\s*\d)/i, field: "revenueLocalPriemka" },
  { pattern: /revenue.*(sol|eur).*priemka/i, field: "revenueLocalPriemka" },

  // Revenue Priemka (USDT)
  // Match: "Доход в USDT Приемка"
  { pattern: /^доход\s+в\s+usdt\s+при[её]мк?а?\s*$/i, field: "revenueUsdtPriemka" },
  { pattern: /доход.*usdt.*при[её]мк?а(?!\s*\d)/i, field: "revenueUsdtPriemka" },
  { pattern: /revenue.*usdt.*priemka/i, field: "revenueUsdtPriemka" },

  // Revenue Own (Local currency: SOL, EUR)
  // Match: "Доход в sol Наш", "Доход в euro Наш"
  { pattern: /^доход\s+в\s+(sol|euro)\s+наш/i, field: "revenueLocalOwn" },
  { pattern: /доход.*(?:sol|euro).*наш/i, field: "revenueLocalOwn" },

  // Revenue Own (USDT)
  // Match: "Доход в USDT Наш"
  { pattern: /^доход\s+в\s+usdt\s+наш/i, field: "revenueUsdtOwn" },
  { pattern: /доход.*usdt.*наш/i, field: "revenueUsdtOwn" },

  // FD Count - match "ФД КОЛ-ВО" (exclude "нФД")
  { pattern: /^фд\s*кол/i, field: "fdCount" },
  { pattern: /^фд\s*кол-во$/i, field: "fdCount" },

  // FD Sum - match "ФД СУММА SOL", "ФД СУММА USDT", "ФД СУММА EURO"
  { pattern: /^фд\s*сумм/i, field: "fdSumLocal" },
  { pattern: /^фд\s*сумма\s*(sol|usdt|euro)?$/i, field: "fdSumLocal" },

  // Chatterfy
  { pattern: /^chatterf/i, field: "chatterfyCost" },
  { pattern: /^чаттерф/i, field: "chatterfyCost" },

  // Additional expenses - "ДОП РАСХОДЫ"
  { pattern: /^доп\s*расход/i, field: "additionalExpenses" },
  { pattern: /^дополн.*расход/i, field: "additionalExpenses" },
];

function matchColumn(colName: string): keyof ParsedRow | null {
  const normalized = colName.toLowerCase().trim();

  for (const { pattern, field } of COLUMN_PATTERNS) {
    if (pattern.test(normalized)) {
      return field;
    }
  }

  return null;
}

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

function parseRow(row: Record<string, unknown>, logColumns = false): ParsedRow | null {
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

  const matchedFields: Record<string, string> = {};

  for (const [colName, value] of Object.entries(row)) {
    const field = matchColumn(colName);

    if (logColumns) {
      console.log(`Column "${colName}" -> field: ${field || "NOT MATCHED"}, value: ${value}`);
    }

    if (field === "date") {
      const date = parseDate(value);
      if (date) {
        result.date = date.toISOString();
        matchedFields["date"] = colName;
      }
    } else if (field) {
      const num = parseNumber(value);
      if (field === "fdCount") {
        (result as Record<string, number>)[field] = Math.round(num);
      } else {
        (result as Record<string, number>)[field] = num;
      }
      matchedFields[field] = colName;
    }
  }

  if (logColumns) {
    console.log("Matched fields:", matchedFields);
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

    // Collect column mapping info
    const columnInfo: { matched: Record<string, string>; unmatched: string[] } = {
      matched: {},
      unmatched: [],
    };

    // Log first row columns for debugging
    if (rawData.length > 0) {
      const firstRow = rawData[0] as Record<string, unknown>;
      const columns = Object.keys(firstRow);
      console.log("Excel columns found:", columns);

      // Check which columns are matched
      for (const col of columns) {
        const field = matchColumn(col);
        if (field) {
          columnInfo.matched[col] = field;
        } else {
          columnInfo.unmatched.push(col);
        }
      }
      console.log("Column mapping:", columnInfo);
    }

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as Record<string, unknown>;
      // Log columns only for first data row
      const parsed = parseRow(row, i === 0);

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

        // Log parsed row values for debugging
        console.log(`[Import] Processing date ${date.toISOString().split('T')[0]}:`, {
          revenueLocalPriemka: row.revenueLocalPriemka,
          revenueUsdtPriemka: row.revenueUsdtPriemka,
          revenueLocalOwn: row.revenueLocalOwn,
          revenueUsdtOwn: row.revenueUsdtOwn,
          totalSpend: row.spendTrust + row.spendCrossgif + row.spendFbm,
        });

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

        // Log calculated metrics
        console.log(`[Import] Calculated metrics for ${date.toISOString().split('T')[0]}:`, {
          totalRevenueUsdt: calculated.totalRevenueUsdt,
          totalSpend: calculated.totalSpend,
          netProfitMath: calculated.netProfitMath,
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

        let savedRecord;
        if (existing) {
          savedRecord = await prisma.dailyMetrics.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          savedRecord = await prisma.dailyMetrics.create({ data });
          imported++;
        }

        // Verify saved data
        console.log(`[Import] Saved record ${savedRecord.id}:`, {
          totalRevenueUsdt: savedRecord.totalRevenueUsdt,
          revenueUsdtOwn: savedRecord.revenueUsdtOwn,
          revenueUsdtPriemka: savedRecord.revenueUsdtPriemka,
        });
      } catch (error) {
        const dateStr = new Date(row.date).toLocaleDateString();
        importErrors.push(`${dateStr}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Fetch a sample of saved metrics to verify
    const savedMetrics = await prisma.dailyMetrics.findMany({
      where: { countryId },
      orderBy: { date: "desc" },
      take: 3,
      select: {
        date: true,
        totalRevenueUsdt: true,
        revenueUsdtOwn: true,
        totalSpend: true,
      },
    });
    console.log("[Import] Sample of saved metrics:", savedMetrics);

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: parsedRows.length,
      columnMapping: columnInfo,
      sampleData: savedMetrics, // Include sample data in response
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
