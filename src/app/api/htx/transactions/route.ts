import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getHTXUSDTTransactions, HTXDepositWithdraw } from "@/lib/htx-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const countryFilter = searchParams.get("countryId") || "";
    const typeFilter = searchParams.get("type") || "";

    const apiKey = process.env.HTX_API_KEY;
    const secretKey = process.env.HTX_SECRET_KEY;

    const countryWallets = await prisma.countryWallet.findMany({
      where: { isActive: true },
      include: { country: { select: { id: true, name: true, code: true } } },
    });

    const addressToCountry = new Map<string, { id: string; name: string; code: string }>();
    for (const wallet of countryWallets) {
      addressToCountry.set(wallet.address.toLowerCase(), wallet.country);
    }

    let apiDeposits: HTXDepositWithdraw[] = [];
    let apiWithdrawals: HTXDepositWithdraw[] = [];

    if (apiKey && secretKey) {
      try {
        const result = await getHTXUSDTTransactions(apiKey, secretKey);
        apiDeposits = result.deposits;
        apiWithdrawals = result.withdrawals;

        for (const tx of [...apiDeposits, ...apiWithdrawals]) {
          const address = tx.address?.toLowerCase() || "";
          const matchedCountry = addressToCountry.get(address) || null;
          
          await prisma.htxTransaction.upsert({
            where: { htxId: tx.id },
            update: {
              state: tx.state,
              htxUpdatedAt: new Date(tx['updated-at']),
              countryId: matchedCountry?.id || null,
              countryName: matchedCountry?.name || null,
              countryCode: matchedCountry?.code || null,
            },
            create: {
              htxId: tx.id,
              type: tx.type,
              currency: tx.currency.toUpperCase(),
              txHash: tx['tx-hash'] || null,
              chain: tx.chain,
              amount: tx.amount,
              address: tx.address || null,
              fee: tx.fee || 0,
              state: tx.state,
              htxCreatedAt: new Date(tx['created-at']),
              htxUpdatedAt: new Date(tx['updated-at']),
              countryId: matchedCountry?.id || null,
              countryName: matchedCountry?.name || null,
              countryCode: matchedCountry?.code || null,
            },
          });
        }
      } catch (apiError) {
        console.error("HTX API error (will use cached data):", apiError);
      }
    }

    const whereClause: Record<string, unknown> = {};
    if (countryFilter) {
      whereClause.countryId = countryFilter;
    }
    if (typeFilter === "deposit" || typeFilter === "withdraw") {
      whereClause.type = typeFilter;
    }

    const allTransactions = await prisma.htxTransaction.findMany({
      where: whereClause,
      orderBy: { htxCreatedAt: "desc" },
    });

    const deposits = allTransactions
      .filter(tx => tx.type === "deposit")
      .map(tx => ({
        id: tx.htxId,
        type: tx.type as "deposit",
        currency: tx.currency,
        txHash: tx.txHash,
        chain: tx.chain,
        amount: tx.amount,
        address: tx.address,
        fee: tx.fee,
        state: tx.state,
        createdAt: tx.htxCreatedAt.toISOString(),
        country: tx.countryId ? { id: tx.countryId, name: tx.countryName!, code: tx.countryCode! } : null,
      }));

    const withdrawals = allTransactions
      .filter(tx => tx.type === "withdraw")
      .map(tx => ({
        id: tx.htxId,
        type: tx.type as "withdraw",
        currency: tx.currency,
        txHash: tx.txHash,
        chain: tx.chain,
        amount: tx.amount,
        address: tx.address,
        fee: tx.fee,
        state: tx.state,
        createdAt: tx.htxCreatedAt.toISOString(),
        country: tx.countryId ? { id: tx.countryId, name: tx.countryName!, code: tx.countryCode! } : null,
      }));

    const allDeposits = await prisma.htxTransaction.findMany({ where: { type: "deposit" } });
    const allWithdrawals = await prisma.htxTransaction.findMany({ where: { type: "withdraw" } });

    const countries = await prisma.country.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      deposits,
      withdrawals,
      totalDeposits: allDeposits.reduce((sum, tx) => sum + tx.amount, 0),
      totalWithdrawals: allWithdrawals.reduce((sum, tx) => sum + tx.amount, 0),
      totalCount: allTransactions.length,
      countries,
      fetchedAt: new Date().toISOString(),
      apiConnected: !!(apiKey && secretKey),
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
