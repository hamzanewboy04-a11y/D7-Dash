import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isProcessed = searchParams.get("isProcessed");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (countryId) {
      where.OR = [
        { countryId: countryId },
        { countryWallet: { countryId: countryId } }
      ];
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        (where.timestamp as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.timestamp as Record<string, unknown>).lte = end;
      }
    }

    if (isProcessed !== null && isProcessed !== undefined && isProcessed !== "") {
      where.isProcessed = isProcessed === "true";
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        include: {
          countryWallet: {
            include: {
              country: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map((tx) => {
      const country = tx.countryWallet?.country || null;
      return {
        id: tx.id,
        txId: tx.txId,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        amount: tx.amount,
        tokenSymbol: tx.tokenSymbol,
        timestamp: tx.timestamp,
        isIncoming: tx.isIncoming,
        isProcessed: tx.isProcessed,
        processedAt: tx.processedAt,
        country: country,
        countryId: tx.countryId || country?.id || null,
        countryWalletName: tx.countryWallet?.name || null,
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json(
      { error: "Ошибка при получении транзакций кошелька" },
      { status: 500 }
    );
  }
}
