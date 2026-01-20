import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/dashboard - Get dashboard summary data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const filterZeroSpend = searchParams.get("filterZeroSpend") !== "false";

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // End date is today (don't show future dates)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Build where clause
    const where: Record<string, unknown> = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      // Only include active countries
      country: {
        isActive: true,
      },
    };

    // Filter out days with zero spend (project wasn't working)
    if (filterZeroSpend) {
      where.totalSpend = { gt: 0 };
    }

    // Get metrics for the period (only up to today)
    const metrics = await prisma.dailyMetrics.findMany({
      where,
      include: {
        country: true,
      },
      orderBy: { date: "asc" },
    });

    // Calculate totals
    const totals = {
      totalRevenue: 0,
      totalExpenses: 0,
      totalSpend: 0,
      expensesWithoutSpend: 0,
      totalPayroll: 0,
      totalProfit: 0,
    };

    const byCountry: Record<string, {
      name: string;
      code: string;
      revenue: number;
      spend: number;
      expenses: number;
      profit: number;
      roi: number;
      daysCount: number;
    }> = {};

    const dailyData: Array<{
      date: string;
      revenue: number;
      expenses: number;
      profit: number;
    }> = [];

    // Process metrics
    for (const metric of metrics) {
      totals.totalRevenue += metric.totalRevenueUsdt;
      totals.totalExpenses += metric.totalExpensesUsdt;
      totals.totalSpend += metric.totalSpend;
      totals.expensesWithoutSpend += metric.expensesWithoutSpend;
      totals.totalPayroll += metric.totalPayroll;
      totals.totalProfit += metric.netProfitMath;

      // By country
      const countryCode = metric.country.code;
      if (!byCountry[countryCode]) {
        byCountry[countryCode] = {
          name: metric.country.name,
          code: countryCode,
          revenue: 0,
          spend: 0,
          expenses: 0,
          profit: 0,
          roi: 0,
          daysCount: 0,
        };
      }
      byCountry[countryCode].revenue += metric.totalRevenueUsdt;
      byCountry[countryCode].spend += metric.totalSpend;
      byCountry[countryCode].expenses += metric.totalExpensesUsdt;
      byCountry[countryCode].profit += metric.netProfitMath;
      byCountry[countryCode].daysCount += 1;
    }

    // Calculate ROI for each country
    for (const code of Object.keys(byCountry)) {
      const country = byCountry[code];
      country.roi = country.expenses > 0
        ? (country.revenue - country.expenses) / country.expenses
        : 0;
    }

    // Group by date for chart
    const dateGroups: Record<string, { revenue: number; expenses: number; profit: number }> = {};
    for (const metric of metrics) {
      const dateStr = metric.date.toISOString().split("T")[0];
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = { revenue: 0, expenses: 0, profit: 0 };
      }
      dateGroups[dateStr].revenue += metric.totalRevenueUsdt;
      dateGroups[dateStr].expenses += metric.totalExpensesUsdt;
      dateGroups[dateStr].profit += metric.netProfitMath;
    }

    for (const [date, data] of Object.entries(dateGroups)) {
      dailyData.push({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round(data.profit * 100) / 100,
      });
    }

    // Get all countries for reference
    const countries = await prisma.country.findMany({
      where: { isActive: true },
    });

    return NextResponse.json({
      totals: {
        revenue: Math.round(totals.totalRevenue * 100) / 100,
        expenses: Math.round(totals.totalExpenses * 100) / 100,
        spend: Math.round(totals.totalSpend * 100) / 100,
        expensesWithoutSpend: Math.round(totals.expensesWithoutSpend * 100) / 100,
        payroll: Math.round(totals.totalPayroll * 100) / 100,
        profit: Math.round(totals.totalProfit * 100) / 100,
        roi: totals.totalExpenses > 0
          ? Math.round(((totals.totalRevenue - totals.totalExpenses) / totals.totalExpenses) * 10000) / 100
          : 0,
      },
      byCountry: Object.values(byCountry).map(c => ({
        ...c,
        revenue: Math.round(c.revenue * 100) / 100,
        spend: Math.round(c.spend * 100) / 100,
        expenses: Math.round(c.expenses * 100) / 100,
        profit: Math.round(c.profit * 100) / 100,
        roi: Math.round(c.roi * 10000) / 10000,
      })),
      dailyData,
      countries,
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
