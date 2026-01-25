import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";

const TRONSCAN_BASE_URL = "https://apilist.tronscanapi.com";

interface TronScanToken {
  token_abbr?: string;
  tokenInfo?: {
    tokenAbbr?: string;
  };
  balance?: string;
  amount?: string;
}

interface TronScanWalletResponse {
  data?: TronScanToken[];
}

interface TronScanTransaction {
  hash?: string;
  txHash?: string;
  transactionHash?: string;
  ownerAddress?: string;
  from?: string;
  fromAddress?: string;
  toAddress?: string;
  to?: string;
  amount?: string;
  contractData?: {
    amount?: string;
  };
  tokenInfo?: {
    tokenAbbr?: string;
    tokenDecimal?: number;
  };
  block_timestamp?: number;
  timestamp?: number;
  confirmed?: boolean;
}

interface TronScanTransactionResponse {
  data?: TronScanTransaction[];
  token_transfers?: TronScanTransaction[];
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST() {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const settings = await prisma.walletSettings.findFirst({
      where: { isActive: true },
    });

    if (!settings || !settings.mainAddress) {
      return NextResponse.json(
        { error: "Настройки кошелька не найдены. Сначала добавьте адрес кошелька." },
        { status: 400 }
      );
    }

    const mainAddress = settings.mainAddress;
    let balanceUsdt = 0;
    let balanceTrx = 0;

    try {
      const balanceUrl = `${TRONSCAN_BASE_URL}/api/account/wallet?address=${mainAddress}&asset_type=1`;
      const balanceResponse = await fetchWithTimeout(balanceUrl);
      
      if (balanceResponse.ok) {
        const balanceData: TronScanWalletResponse = await balanceResponse.json();
        
        if (balanceData.data && Array.isArray(balanceData.data)) {
          for (const token of balanceData.data) {
            const abbr = (token.token_abbr || token.tokenInfo?.tokenAbbr || "").toLowerCase();
            const rawBalance = token.balance || token.amount || "0";
            
            if (abbr === "usdt") {
              balanceUsdt = parseFloat(rawBalance) / 1e6;
            } else if (abbr === "trx") {
              balanceTrx = parseFloat(rawBalance) / 1e6;
            }
          }
        }
      }
    } catch (balanceError) {
      console.error("Error fetching balance:", balanceError);
    }

    const countryWallets = await prisma.countryWallet.findMany({
      where: { isActive: true },
      include: {
        country: true,
      },
    });

    const addressToCountry: Map<string, { countryId: string; walletId: string }> = new Map();
    for (const wallet of countryWallets) {
      addressToCountry.set(wallet.address.toLowerCase(), {
        countryId: wallet.countryId,
        walletId: wallet.id,
      });
    }

    let newTransactionsCount = 0;
    let processedCount = 0;

    try {
      const txUrl = `${TRONSCAN_BASE_URL}/api/transaction?sort=-timestamp&limit=50&toAddress=${mainAddress}`;
      const txResponse = await fetchWithTimeout(txUrl);
      
      if (txResponse.ok) {
        const txData: TronScanTransactionResponse = await txResponse.json();
        const transactions = txData.data || txData.token_transfers || [];
        
        for (const tx of transactions) {
          const txId = tx.hash || tx.txHash || tx.transactionHash;
          if (!txId) continue;

          const existingTx = await prisma.walletTransaction.findUnique({
            where: { txId },
          });
          if (existingTx) continue;

          const fromAddress = tx.ownerAddress || tx.from || tx.fromAddress || "";
          const toAddress = tx.toAddress || tx.to || mainAddress;
          const tokenAbbr = tx.tokenInfo?.tokenAbbr?.toUpperCase() || "TRX";
          const tokenDecimals = tx.tokenInfo?.tokenDecimal || 6;
          
          let amount = 0;
          const rawAmount = tx.amount || tx.contractData?.amount || "0";
          amount = parseFloat(rawAmount) / Math.pow(10, tokenDecimals);

          const timestamp = tx.block_timestamp || tx.timestamp || Date.now();
          const txDate = new Date(timestamp);

          const countryMatch = addressToCountry.get(fromAddress.toLowerCase());
          
          const walletTx = await prisma.walletTransaction.create({
            data: {
              txId,
              fromAddress,
              toAddress,
              amount,
              tokenSymbol: tokenAbbr,
              tokenDecimals,
              timestamp: txDate,
              countryWalletId: countryMatch?.walletId || null,
              countryId: countryMatch?.countryId || null,
              isIncoming: true,
              isProcessed: false,
              rawData: tx as object,
            },
          });

          newTransactionsCount++;

          if (countryMatch && tokenAbbr === "USDT" && !walletTx.isProcessed) {
            const dateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
            
            await prisma.dailyMetrics.upsert({
              where: {
                date_countryId: {
                  date: dateOnly,
                  countryId: countryMatch.countryId,
                },
              },
              update: {
                totalRevenueUsdt: { increment: amount },
                revenueUsdtOwn: { increment: amount },
              },
              create: {
                date: dateOnly,
                countryId: countryMatch.countryId,
                totalRevenueUsdt: amount,
                revenueUsdtOwn: amount,
              },
            });

            await prisma.walletTransaction.update({
              where: { id: walletTx.id },
              data: {
                isProcessed: true,
                processedAt: new Date(),
              },
            });

            processedCount++;
          }
        }
      }
    } catch (txError) {
      console.error("Error fetching transactions:", txError);
    }

    await prisma.walletSettings.update({
      where: { id: settings.id },
      data: {
        lastBalance: balanceUsdt,
        lastBalanceTrx: balanceTrx,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      balance: {
        usdt: balanceUsdt,
        trx: balanceTrx,
      },
      newTransactions: newTransactionsCount,
      processedTransactions: processedCount,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing wallet:", error);
    return NextResponse.json(
      { error: "Ошибка при синхронизации кошелька" },
      { status: 500 }
    );
  }
}
