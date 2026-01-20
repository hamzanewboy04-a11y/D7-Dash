import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAllMetrics } from "@/lib/calculations";
import { getCurrentUser, canEdit } from "@/lib/auth";

// GET /api/metrics - Get metrics with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const date = searchParams.get("date"); // Single date filter
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");
    const filterZeroSpend = searchParams.get("filterZeroSpend") !== "false";

    const where: Record<string, unknown> = {};

    if (countryId) {
      where.countryId = countryId;
    }

    // Only include active countries
    where.country = {
      isActive: true,
    };

    // Filter out days with zero spend (project wasn't working)
    if (filterZeroSpend) {
      where.totalSpend = { gt: 0 };
    }

    // Always filter to today or earlier to avoid showing future dates with no data
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    where.date = {};

    // If specific date is provided, filter for that exact day
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      (where.date as Record<string, unknown>).gte = targetDate;
      (where.date as Record<string, unknown>).lt = nextDay;
    } else {
      // Otherwise use startDate/endDate range
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      // Use the earlier of endDate or today
      const endDateValue = endDate ? new Date(endDate) : today;
      (where.date as Record<string, unknown>).lte = endDateValue > today ? today : endDateValue;
    }

    const metrics = await prisma.dailyMetrics.findMany({
      where,
      include: {
        country: true,
        dailyAdSpends: {
          include: { adAccount: true },
        },
      },
      orderBy: { date: "desc" },
      take: limit ? parseInt(limit) : 100,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

// POST /api/metrics - Create daily metrics
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canEdit(user)) {
      return NextResponse.json(
        { error: "Недостаточно прав для выполнения операции" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      date,
      countryId,
      // Ad spends by account
      adSpends, // Array of { adAccountId, spend, deposit, balance }
      // Revenue
      revenueLocalPriemka,
      revenueUsdtPriemka,
      revenueLocalOwn,
      revenueUsdtOwn,
      // FD data
      fdCount,
      fdSumLocal,
      // Manual payroll
      payrollContent,
      payrollReviews,
      payrollDesigner,
      payrollHeadDesigner,
      // Additional
      chatterfyCost,
      additionalExpenses,
      // Balance facts (manual input)
      adAccountBalanceFact,
      balancePriemkaFact,
      balanceOwnFact,
    } = body;

    if (!date || !countryId) {
      return NextResponse.json(
        { error: "Date and countryId are required" },
        { status: 400 }
      );
    }

    // Calculate spends from ad accounts
    let spendTrust = 0;
    let spendCrossgif = 0;
    let spendFbm = 0;

    if (adSpends && Array.isArray(adSpends)) {
      for (const adSpend of adSpends) {
        const account = await prisma.adAccount.findUnique({
          where: { id: adSpend.adAccountId },
        });
        if (account) {
          if (account.name.toUpperCase().includes("TRUST")) {
            spendTrust += adSpend.spend || 0;
          } else if (account.name.toUpperCase().includes("CROSSGIF") || account.name.toUpperCase().includes("КРОСГИФ")) {
            spendCrossgif += adSpend.spend || 0;
          } else if (account.name.toUpperCase().includes("FBM")) {
            spendFbm += adSpend.spend || 0;
          }
        }
      }
    }

    // Calculate all derived metrics
    const calculated = calculateAllMetrics({
      spendTrust,
      spendCrossgif,
      spendFbm,
      revenueLocalPriemka: revenueLocalPriemka || 0,
      revenueUsdtPriemka: revenueUsdtPriemka || 0,
      revenueLocalOwn: revenueLocalOwn || 0,
      revenueUsdtOwn: revenueUsdtOwn || 0,
      fdCount: fdCount || 0,
      fdSumLocal: fdSumLocal || 0,
      payrollContent,
      payrollReviews,
      payrollDesigner,
      payrollHeadDesigner,
      chatterfyCost,
      additionalExpenses,
    });

    // Create the daily metrics record
    const metrics = await prisma.dailyMetrics.create({
      data: {
        date: new Date(date),
        countryId,
        // Balances
        adAccountBalanceFact: adAccountBalanceFact || 0,
        adAccountDeposit: adSpends?.reduce((sum: number, s: { deposit?: number }) => sum + (s.deposit || 0), 0) || 0,
        // Spend
        totalSpend: calculated.totalSpend,
        agencyFee: calculated.agencyFee,
        // Revenue Priemka
        revenueLocalPriemka: revenueLocalPriemka || 0,
        revenueUsdtPriemka: revenueUsdtPriemka || 0,
        exchangeRatePriemka: calculated.exchangeRatePriemka,
        commissionPriemka: calculated.commissionPriemka,
        // Revenue Own
        revenueLocalOwn: revenueLocalOwn || 0,
        revenueUsdtOwn: revenueUsdtOwn || 0,
        exchangeRateOwn: calculated.exchangeRateOwn,
        // Totals
        totalRevenueUsdt: calculated.totalRevenueUsdt,
        totalExpensesUsdt: calculated.totalExpensesUsdt,
        expensesWithoutSpend: calculated.expensesWithoutSpend,
        // Balances
        balancePriemkaFact: balancePriemkaFact || 0,
        balanceOwnFact: balanceOwnFact || 0,
        // FD/RD
        fdCount: fdCount || 0,
        fdSumLocal: fdSumLocal || 0,
        fdSumUsdt: calculated.fdSumUsdt,
        rdSumLocal: calculated.rdSumLocal,
        rdSumUsdt: calculated.rdSumUsdt,
        // Payroll
        payrollRdHandler: calculated.payrollRdHandler,
        payrollFdHandler: calculated.payrollFdHandler,
        payrollContent: payrollContent || 0,
        payrollReviews: payrollReviews || 0,
        payrollDesigner: payrollDesigner || 0,
        payrollBuyer: calculated.payrollBuyer,
        payrollHeadDesigner: payrollHeadDesigner || 10,
        totalPayroll: calculated.totalPayroll,
        // Additional
        chatterfyCost: chatterfyCost || 0,
        additionalExpenses: additionalExpenses || 0,
        // Profit
        netProfitMath: calculated.netProfitMath,
        roi: calculated.roi,
        // Create ad spend records
        dailyAdSpends: adSpends
          ? {
              create: adSpends.map((s: { adAccountId: string; spend?: number; deposit?: number; balance?: number }) => ({
                date: new Date(date),
                adAccountId: s.adAccountId,
                spend: s.spend || 0,
                deposit: s.deposit || 0,
                balance: s.balance || 0,
              })),
            }
          : undefined,
      },
      include: {
        country: true,
        dailyAdSpends: true,
      },
    });

    return NextResponse.json(metrics, { status: 201 });
  } catch (error) {
    console.error("Error creating metrics:", error);
    return NextResponse.json(
      { error: "Failed to create metrics" },
      { status: 500 }
    );
  }
}
