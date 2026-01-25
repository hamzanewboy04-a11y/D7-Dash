import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";
import { getHTXUSDTBalance } from "@/lib/htx-api";
import { getBscUsdtTransfers, getBnbBalance } from "@/lib/bsc-api";

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
    let balanceBnb = 0;
    let balanceSource = "none";

    // Try to fetch balance from HTX API first (if API keys are configured)
    const htxApiKey = process.env.HTX_API_KEY;
    const htxSecretKey = process.env.HTX_SECRET_KEY;
    
    if (htxApiKey && htxSecretKey) {
      try {
        balanceUsdt = await getHTXUSDTBalance(htxApiKey, htxSecretKey);
        balanceSource = "htx";
        console.log("Fetched USDT balance from HTX:", balanceUsdt);
      } catch (htxError) {
        console.error("Error fetching balance from HTX API:", htxError);
      }
    }

    // Try to get BNB balance for gas tracking
    try {
      balanceBnb = await getBnbBalance(mainAddress);
    } catch (bnbError) {
      console.error("Error fetching BNB balance:", bnbError);
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

    // Fetch incoming BEP20 USDT transfers using BSC API
    try {
      const bscTransfers = await getBscUsdtTransfers(mainAddress, 'incoming');
      
      for (const tx of bscTransfers) {
        const txId = tx.hash;
        if (!txId) continue;

        const fromAddress = tx.from;
        const toAddress = tx.to;
        const tokenAbbr = "USDT";
        const tokenDecimals = parseInt(tx.tokenDecimal) || 18;
        
        const amount = parseFloat(tx.value) / Math.pow(10, tokenDecimals);
        const timestamp = parseInt(tx.timeStamp) * 1000;
        const txDate = new Date(timestamp);

        const countryMatch = addressToCountry.get(fromAddress.toLowerCase());
        
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
    } catch (txError) {
      console.error("Error fetching incoming BEP20 transfers:", txError);
    }

    // Fetch outgoing BEP20 USDT transfers using BSC API
    try {
      const outgoingTransfers = await getBscUsdtTransfers(mainAddress, 'outgoing');
      
      for (const tx of outgoingTransfers) {
        const txId = tx.hash;
        if (!txId) continue;

        const fromAddress = tx.from;
        const toAddress = tx.to;
        const tokenAbbr = "USDT";
        const tokenDecimals = parseInt(tx.tokenDecimal) || 18;
        
        const amount = parseFloat(tx.value) / Math.pow(10, tokenDecimals);
        const timestamp = parseInt(tx.timeStamp) * 1000;
        const txDate = new Date(timestamp);

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
    } catch (txError) {
      console.error("Error fetching outgoing BEP20 transfers:", txError);
    }

    await prisma.walletSettings.update({
      where: { id: settings.id },
      data: {
        lastBalance: balanceUsdt,
        lastBalanceTrx: balanceBnb,
        lastSyncedAt: new Date(),
      },
    });

    // Синхронизируем баланс биржи с HTX балансом
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
        bnb: balanceBnb,
        source: balanceSource,
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
