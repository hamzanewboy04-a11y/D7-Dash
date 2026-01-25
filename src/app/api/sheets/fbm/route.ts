import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";
import { getFbmData } from "@/lib/google-sheets";

const FBM_SPREADSHEET_ID = "1mLYrOR0lYe8tWsFhslUhEyhEhRjCr_h4lljPfqzhMvE";

export async function GET(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheetName") || "DailySpend_Jan26";

    const data = await getFbmData(FBM_SPREADSHEET_ID, sheetName);

    return NextResponse.json({
      success: true,
      agency: "FBM",
      ...data,
    });
  } catch (error) {
    console.error("Error fetching FBM data:", error);
    return NextResponse.json(
      { error: "Ошибка получения данных FBM: " + String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheetName") || "DailySpend_Jan26";

    const data = await getFbmData(FBM_SPREADSHEET_ID, sheetName);

    const fbmBalance = await prisma.balance.findFirst({
      where: { code: "FBM" }
    });

    if (fbmBalance) {
      await prisma.balance.update({
        where: { id: fbmBalance.id },
        data: { currentAmount: data.totalBalance }
      });
    }

    return NextResponse.json({
      success: true,
      agency: "FBM",
      updatedBalance: data.totalBalance,
      ...data,
    });
  } catch (error) {
    console.error("Error syncing FBM data:", error);
    return NextResponse.json(
      { error: "Ошибка синхронизации FBM: " + String(error) },
      { status: 500 }
    );
  }
}
