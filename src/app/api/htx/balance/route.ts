import { NextResponse } from "next/server";
import { getHTXUSDTBalance, getHTXAllBalances } from "@/lib/htx-api";

export async function GET() {
  try {
    const apiKey = process.env.HTX_API_KEY;
    const secretKey = process.env.HTX_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: "HTX API keys not configured" },
        { status: 400 }
      );
    }

    const allBalances = await getHTXAllBalances(apiKey, secretKey);
    const usdtBalance = allBalances['USDT'] || 0;

    return NextResponse.json({
      success: true,
      usdt: usdtBalance,
      balances: allBalances,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("HTX API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch HTX balance" },
      { status: 500 }
    );
  }
}
