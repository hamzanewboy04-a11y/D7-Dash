import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";

// TronGrid API (free, no auth required)
const TRONGRID_BASE_URL = "https://api.trongrid.io";
// TronScan API for transactions
const TRONSCAN_BASE_URL = "https://apilist.tronscanapi.com";
// USDT TRC20 contract address
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

interface TronGridAccountResponse {
  data?: Array<{
    balance?: number;
    trc20?: Array<Record<string, string>>;
  }>;
  success?: boolean;
}

interface TronGridTransfer {
  transaction_id?: string;
  from?: string;
  to?: string;
  value?: string;
  block_timestamp?: number;
  token_info?: {
    symbol?: string;
    decimals?: number;
    address?: string;
  };
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

async function updateBalanceAmount(balanceId: string, amount: number, type: string) {
  let amountChange = amount;
  
  if (type === "expense" || type === "transfer") {
    amountChange = -Math.abs(amount);
  } else if (type === "top_up") {
    amountChange = Math.abs(amount);
  }

  await prisma.balance.update({
    where: { id: balanceId },
    data: {
      currentAmount: {
        increment: amountChange,
      },
    },
  });
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

    // Fetch balance using TronGrid API (free, no auth required)
    try {
      const balanceUrl = `${TRONGRID_BASE_URL}/v1/accounts/${mainAddress}`;
      const balanceResponse = await fetchWithTimeout(balanceUrl);
      
      if (balanceResponse.ok) {
        const balanceData: TronGridAccountResponse = await balanceResponse.json();
        
        if (balanceData.data && balanceData.data.length > 0) {
          const account = balanceData.data[0];
          
          // TRX balance (in sun, 1 TRX = 1,000,000 sun)
          if (account.balance) {
            balanceTrx = account.balance / 1e6;
          }
          
          // TRC20 tokens (including USDT)
          if (account.trc20 && Array.isArray(account.trc20)) {
            for (const tokenObj of account.trc20) {
              // Check if this is USDT by contract address
              const usdtBalance = tokenObj[USDT_CONTRACT];
              if (usdtBalance) {
                balanceUsdt = parseFloat(usdtBalance) / 1e6;
                break;
              }
            }
          }
        }
      }
    } catch (balanceError) {
      console.error("Error fetching balance from TronGrid:", balanceError);
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

    const agencyWallets = await prisma.agencyWallet.findMany({
      where: { isActive: true },
      include: {
        balance: true,
      },
    });

    const addressToAgency: Map<string, { balanceId: string; balanceCode: string; walletId: string }> = new Map();
    for (const wallet of agencyWallets) {
      addressToAgency.set(wallet.address.toLowerCase(), {
        balanceId: wallet.balanceId,
        balanceCode: wallet.balance.code,
        walletId: wallet.id,
      });
    }

    let newTransactionsCount = 0;
    let processedCount = 0;
    let outgoingTransactionsCount = 0;
    let processedOutgoingCount = 0;

    // Fetch incoming TRC20 transfers using TronGrid API
    try {
      const trc20TxUrl = `${TRONGRID_BASE_URL}/v1/accounts/${mainAddress}/transactions/trc20?only_to=true&limit=50&contract_address=${USDT_CONTRACT}`;
      const trc20Response = await fetchWithTimeout(trc20TxUrl);
      
      if (trc20Response.ok) {
        const trc20Data = await trc20Response.json();
        const trc20Transfers = trc20Data.token_transfers || trc20Data.data || [];
        
        for (const tx of trc20Transfers) {
          const txId = tx.transaction_id || tx.hash || tx.txHash || tx.transactionHash;
          if (!txId) continue;

          const fromAddress = tx.from_address || tx.ownerAddress || tx.from || tx.fromAddress || "";
          const toAddress = tx.to_address || tx.toAddress || tx.to || mainAddress;
          const tokenAbbr = "USDT";
          const tokenDecimals = 6;
          
          let amount = 0;
          const rawAmount = tx.quant || tx.amount || tx.value || tx.contractData?.amount || "0";
          amount = parseFloat(rawAmount) / Math.pow(10, tokenDecimals);

          const timestamp = tx.block_timestamp || tx.timestamp || tx.block_ts || Date.now();
          const txDate = new Date(timestamp);

          const countryMatch = addressToCountry.get(fromAddress.toLowerCase());
          
          let isNewTransaction = false;
          let walletTx;
          
          try {
            walletTx = await prisma.walletTransaction.create({
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
            isNewTransaction = true;
            newTransactionsCount++;
          } catch (createError: unknown) {
            if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 'P2002') {
              walletTx = await prisma.walletTransaction.findUnique({
                where: { txId },
              });
            } else {
              throw createError;
            }
          }

          if (!walletTx) continue;

          if (countryMatch && !walletTx.isProcessed) {
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
      console.error("Error fetching incoming TRC20 transfers:", txError);
    }

    try {
      // Fetch outgoing TRC20 transfers using TronGrid API
      const outgoingTxUrl = `${TRONGRID_BASE_URL}/v1/accounts/${mainAddress}/transactions/trc20?only_from=true&limit=50&contract_address=${USDT_CONTRACT}`;
      const outgoingResponse = await fetchWithTimeout(outgoingTxUrl);
      
      if (outgoingResponse.ok) {
        const outgoingData = await outgoingResponse.json();
        const outgoingTransfers = outgoingData.token_transfers || outgoingData.data || [];
        
        for (const tx of outgoingTransfers) {
          const txId = tx.transaction_id || tx.hash || tx.txHash || tx.transactionHash;
          if (!txId) continue;

          const fromAddress = tx.from_address || tx.ownerAddress || tx.from || tx.fromAddress || mainAddress;
          const toAddress = tx.to_address || tx.toAddress || tx.to || "";
          const tokenAbbr = "USDT";
          const tokenDecimals = 6;
          
          let amount = 0;
          const rawAmount = tx.quant || tx.amount || tx.value || tx.contractData?.amount || "0";
          amount = parseFloat(rawAmount) / Math.pow(10, tokenDecimals);

          const timestamp = tx.block_timestamp || tx.timestamp || tx.block_ts || Date.now();
          const txDate = new Date(timestamp);

          let isNewTransaction = false;
          let walletTx;
          
          try {
            walletTx = await prisma.walletTransaction.create({
              data: {
                txId,
                fromAddress,
                toAddress,
                amount,
                tokenSymbol: tokenAbbr,
                tokenDecimals,
                timestamp: txDate,
                isIncoming: false,
                isProcessed: false,
                rawData: tx as object,
              },
            });
            isNewTransaction = true;
            outgoingTransactionsCount++;
          } catch (createError: unknown) {
            if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 'P2002') {
              walletTx = await prisma.walletTransaction.findUnique({
                where: { txId },
              });
            } else {
              throw createError;
            }
          }

          if (!walletTx) continue;

          if (!walletTx.isProcessed) {
            const agencyMatch = addressToAgency.get(toAddress.toLowerCase());
            const dateOnly = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

            if (agencyMatch) {
              const exchangeBalance = await prisma.balance.findUnique({
                where: { code: "EXCHANGE" },
              });

              if (exchangeBalance) {
                await prisma.balanceTransaction.create({
                  data: {
                    balanceId: exchangeBalance.id,
                    type: "transfer",
                    amount: amount,
                    description: `Перевод на ${agencyMatch.balanceCode} (авто, TX: ${txId.slice(0, 8)}...)`,
                    date: txDate,
                  },
                });
                await updateBalanceAmount(exchangeBalance.id, amount, "transfer");
              }

              await prisma.balanceTransaction.create({
                data: {
                  balanceId: agencyMatch.balanceId,
                  type: "top_up",
                  amount: amount,
                  description: `Пополнение с биржи (авто, TX: ${txId.slice(0, 8)}...)`,
                  date: txDate,
                },
              });
              await updateBalanceAmount(agencyMatch.balanceId, amount, "top_up");

              await prisma.walletTransaction.update({
                where: { id: walletTx.id },
                data: {
                  isProcessed: true,
                  processedAt: new Date(),
                },
              });

              processedOutgoingCount++;
            } else {
              const expense = await prisma.expense.create({
                data: {
                  date: dateOnly,
                  amount: amount,
                  description: `Исходящий перевод USDT (TX: ${txId.slice(0, 8)}...) на ${toAddress.slice(0, 8)}...`,
                  category: "wallet_transfer",
                },
              });

              const exchangeBalance = await prisma.balance.findUnique({
                where: { code: "EXCHANGE" },
              });

              if (exchangeBalance) {
                await prisma.balanceTransaction.create({
                  data: {
                    balanceId: exchangeBalance.id,
                    type: "expense",
                    amount: amount,
                    description: `Исходящий перевод (TX: ${txId.slice(0, 8)}...)`,
                    expenseId: expense.id,
                    date: txDate,
                  },
                });
                await updateBalanceAmount(exchangeBalance.id, amount, "expense");
              }

              await prisma.walletTransaction.update({
                where: { id: walletTx.id },
                data: {
                  isProcessed: true,
                  processedAt: new Date(),
                  expenseId: expense.id,
                },
              });

              processedOutgoingCount++;
            }
          }
        }
      }
    } catch (txError) {
      console.error("Error fetching outgoing TRC20 transfers:", txError);
    }

    await prisma.walletSettings.update({
      where: { id: settings.id },
      data: {
        lastBalance: balanceUsdt,
        lastBalanceTrx: balanceTrx,
        lastSyncedAt: new Date(),
      },
    });

    // Синхронизируем баланс биржи с балансом TRON кошелька
    const exchangeBalance = await prisma.balance.findUnique({
      where: { code: "EXCHANGE" },
    });
    
    if (exchangeBalance && balanceUsdt > 0) {
      await prisma.balance.update({
        where: { id: exchangeBalance.id },
        data: {
          currentAmount: balanceUsdt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      balance: {
        usdt: balanceUsdt,
        trx: balanceTrx,
      },
      newTransactions: newTransactionsCount,
      processedTransactions: processedCount,
      outgoingTransactions: outgoingTransactionsCount,
      processedOutgoing: processedOutgoingCount,
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
