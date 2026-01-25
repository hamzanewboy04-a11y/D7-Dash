import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";
import { getCrossgifData, getFbmData } from "@/lib/google-sheets";

const CROSSGIF_SPREADSHEET_ID = "1juk7449zs4jpNuI-o5X7XCsKjbIAXWPjQAMji4MmS2g";
const FBM_SPREADSHEET_ID = "1mLYrOR0lYe8tWsFhslUhEyhEhRjCr_h4lljPfqzhMvE";

export async function POST(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const results: {
      agency: string;
      success: boolean;
      balance?: number;
      perMonth?: number;
      error?: string;
    }[] = [];

    try {
      const crossgifData = await getCrossgifData(CROSSGIF_SPREADSHEET_ID, "1/2026");
      
      const crossgifBalance = await prisma.balance.findFirst({
        where: { code: "CROSSGIF" }
      });

      if (crossgifBalance) {
        await prisma.balance.update({
          where: { id: crossgifBalance.id },
          data: { currentAmount: crossgifData.remainingBalance }
        });
      }

      results.push({
        agency: "CROSSGIF",
        success: true,
        balance: crossgifData.remainingBalance,
        perMonth: crossgifData.totalSpend,
      });
    } catch (error) {
      results.push({
        agency: "CROSSGIF",
        success: false,
        error: String(error),
      });
    }

    try {
      const fbmData = await getFbmData(FBM_SPREADSHEET_ID, "DailySpend_Jan26");
      
      const fbmBalance = await prisma.balance.findFirst({
        where: { code: "FBM" }
      });

      if (fbmBalance) {
        await prisma.balance.update({
          where: { id: fbmBalance.id },
          data: { currentAmount: fbmData.totalBalance }
        });
      }

      results.push({
        agency: "FBM",
        success: true,
        balance: fbmData.totalBalance,
        perMonth: fbmData.perMonth,
      });
    } catch (error) {
      results.push({
        agency: "FBM",
        success: false,
        error: String(error),
      });
    }

    const allSuccess = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccess,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing all agencies:", error);
    return NextResponse.json(
      { error: "Ошибка синхронизации агентств: " + String(error) },
      { status: 500 }
    );
  }
}
