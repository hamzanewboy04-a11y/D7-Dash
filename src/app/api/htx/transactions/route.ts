import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getHTXUSDTTransactions, HTXDepositWithdraw } from "@/lib/htx-api";

export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const apiKey = process.env.HTX_API_KEY;
    const secretKey = process.env.HTX_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({
        error: "HTX API ключи не настроены",
        deposits: [],
        withdrawals: [],
      });
    }

    const { deposits, withdrawals } = await getHTXUSDTTransactions(apiKey, secretKey);

    // Format transactions for display
    const formatTx = (tx: HTXDepositWithdraw) => ({
      id: tx.id,
      type: tx.type,
      currency: tx.currency.toUpperCase(),
      txHash: tx['tx-hash'],
      chain: tx.chain,
      amount: tx.amount,
      address: tx.address,
      fee: tx.fee,
      state: tx.state,
      createdAt: new Date(tx['created-at']).toISOString(),
      updatedAt: new Date(tx['updated-at']).toISOString(),
    });

    return NextResponse.json({
      deposits: deposits.map(formatTx),
      withdrawals: withdrawals.map(formatTx),
      totalDeposits: deposits.reduce((sum, tx) => sum + tx.amount, 0),
      totalWithdrawals: withdrawals.reduce((sum, tx) => sum + tx.amount, 0),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching HTX transactions:", error);
    return NextResponse.json(
      { 
        error: "Ошибка получения транзакций HTX: " + String(error),
        deposits: [],
        withdrawals: [],
      },
      { status: 500 }
    );
  }
}
