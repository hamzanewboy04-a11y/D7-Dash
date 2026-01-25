import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";
import { getCrossgifData, getSheetInfo } from "@/lib/google-sheets";

const CROSSGIF_SPREADSHEET_ID = "1juk7449zs4jpNuI-o5X7XCsKjbIAXWPjQAMji4MmS2g";

export async function GET(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheetName") || "1/2026";

    const data = await getCrossgifData(CROSSGIF_SPREADSHEET_ID, sheetName);

    return NextResponse.json({
      success: true,
      agency: "CROSSGIF",
      ...data,
    });
  } catch (error) {
    console.error("Error fetching Crossgif data:", error);
    return NextResponse.json(
      { error: "Ошибка получения данных Crossgif: " + String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheetName") || "1/2026";

    const data = await getCrossgifData(CROSSGIF_SPREADSHEET_ID, sheetName);

    const crossgifBalance = await prisma.balance.findFirst({
      where: { code: "CROSSGIF" }
    });

    if (crossgifBalance) {
      await prisma.balance.update({
        where: { id: crossgifBalance.id },
        data: { currentAmount: data.canUseBalance }
      });
    }

    return NextResponse.json({
      success: true,
      agency: "CROSSGIF",
      updatedBalance: data.canUseBalance,
      ...data,
    });
  } catch (error) {
    console.error("Error syncing Crossgif data:", error);
    return NextResponse.json(
      { error: "Ошибка синхронизации Crossgif: " + String(error) },
      { status: 500 }
    );
  }
}
