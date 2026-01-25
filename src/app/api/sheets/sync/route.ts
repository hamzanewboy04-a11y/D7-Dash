import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";
import { getCurrentAgencyBalances, getSheetInfo } from "@/lib/google-sheets";

export async function POST(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const body = await request.json();
    const { spreadsheetId, sheetName } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID обязателен" },
        { status: 400 }
      );
    }

    const balances = await getCurrentAgencyBalances(spreadsheetId, sheetName || 'Sheet1');

    const updatedBalances: { code: string; amount: number }[] = [];

    for (const [agencyCode, amount] of Object.entries(balances)) {
      const balance = await prisma.balance.findFirst({
        where: {
          code: {
            in: [agencyCode, agencyCode.toUpperCase(), agencyCode.toLowerCase()]
          }
        }
      });

      if (balance) {
        await prisma.balance.update({
          where: { id: balance.id },
          data: { currentAmount: amount }
        });
        updatedBalances.push({ code: balance.code, amount });
      }
    }

    return NextResponse.json({
      success: true,
      updatedBalances,
      rawBalances: balances,
    });
  } catch (error) {
    console.error("Error syncing from Google Sheets:", error);
    return NextResponse.json(
      { error: "Ошибка синхронизации с Google Sheets: " + String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get("spreadsheetId");

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID обязателен" },
        { status: 400 }
      );
    }

    const sheetInfo = await getSheetInfo(spreadsheetId);

    return NextResponse.json({
      success: true,
      ...sheetInfo,
    });
  } catch (error) {
    console.error("Error getting sheet info:", error);
    return NextResponse.json(
      { error: "Ошибка получения информации о таблице: " + String(error) },
      { status: 500 }
    );
  }
}
