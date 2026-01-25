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

    const whereClause: Record<string, unknown> = {};
    if (countryFilter) {
      whereClause.countryId = countryFilter;
      whereClause.type = "deposit";
    } else if (typeFilter === "deposit" || typeFilter === "withdraw") {
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
        country: null,
      }));

    const totalStats = await prisma.htxTransaction.groupBy({
      by: ['type'],
      _sum: { amount: true },
    });

    const totalDeposits = totalStats.find(s => s.type === 'deposit')?._sum.amount || 0;
    const totalWithdrawals = totalStats.find(s => s.type === 'withdraw')?._sum.amount || 0;

    const countries = await prisma.country.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      deposits,
      withdrawals,
      totalDeposits,
      totalWithdrawals,
      totalCount: allTransactions.length,
      countries,
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

export async function POST() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const apiKey = process.env.HTX_API_KEY;
    const secretKey = process.env.HTX_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({
        error: "HTX API ключи не настроены",
        synced: 0,
      }, { status: 400 });
    }

    await prisma.htxTransaction.updateMany({
      where: {
        type: "withdraw",
        OR: [
          { countryId: { not: null } },
          { countryName: { not: null } },
          { countryCode: { not: null } },
        ],
      },
      data: {
        countryId: null,
        countryName: null,
        countryCode: null,
      },
    });

    const countryWallets = await prisma.countryWallet.findMany({
      where: { isActive: true },
      include: { country: { select: { id: true, name: true, code: true } } },
    });

    const addressToCountry = new Map<string, { id: string; name: string; code: string }>();
    for (const wallet of countryWallets) {
      addressToCountry.set(wallet.address.toLowerCase(), wallet.country);
    }

    const { deposits, withdrawals } = await getHTXUSDTTransactions(apiKey, secretKey);

    let synced = 0;

    for (const tx of deposits) {
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
          type: "deposit",
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
      synced++;
    }

    for (const tx of withdrawals) {
      await prisma.htxTransaction.upsert({
        where: { htxId: tx.id },
        update: {
          state: tx.state,
          htxUpdatedAt: new Date(tx['updated-at']),
        },
        create: {
          htxId: tx.id,
          type: "withdraw",
          currency: tx.currency.toUpperCase(),
          txHash: tx['tx-hash'] || null,
          chain: tx.chain,
          amount: tx.amount,
          address: tx.address || null,
          fee: tx.fee || 0,
          state: tx.state,
          htxCreatedAt: new Date(tx['created-at']),
          htxUpdatedAt: new Date(tx['updated-at']),
          countryId: null,
          countryName: null,
          countryCode: null,
        },
      });
      synced++;
    }

    return NextResponse.json({
      success: true,
      synced,
      deposits: deposits.length,
      withdrawals: withdrawals.length,
    });
  } catch (error) {
    console.error("Error syncing HTX transactions:", error);
    return NextResponse.json(
      { 
        error: "Ошибка синхронизации HTX: " + String(error),
        synced: 0,
      },
      { status: 500 }
    );
  }
}
