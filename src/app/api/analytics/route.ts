import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/analytics - Get analytics data
export async function GET() {
  try {
    // End date is today (don't show future dates)
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Current period: last 30 days
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - 30);

    // Previous period: 30-60 days ago
    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - 60);
    const previousEnd = new Date();
    previousEnd.setDate(previousEnd.getDate() - 31);

    // Get current period metrics (filter out zero spend days and inactive countries)
    const currentMetrics = await prisma.dailyMetrics.findMany({
      where: {
        date: {
          gte: currentStart,
          lte: today,
        },
        totalSpend: { gt: 0 }, // Only days with actual spend
        country: {
          isActive: true,
          status: { not: "disabled" },
        },
      },
      include: {
        country: true,
      },
    });

    // Get previous period metrics
    const previousMetrics = await prisma.dailyMetrics.findMany({
      where: {
        date: {
          gte: previousStart,
          lte: previousEnd,
        },
        totalSpend: { gt: 0 }, // Only days with actual spend
        country: {
          isActive: true,
          status: { not: "disabled" },
        },
      },
    });

    // Calculate current period totals
    const currentTotals = {
      revenue: 0,
      spend: 0,
      profit: 0,
      expenses: 0,
    };

    for (const metric of currentMetrics) {
      currentTotals.revenue += metric.totalRevenueUsdt;
      currentTotals.spend += metric.totalSpend;
      currentTotals.profit += metric.netProfitMath;
      currentTotals.expenses += metric.totalExpensesUsdt;
    }

    // Calculate previous period totals
    const previousTotals = {
      revenue: 0,
      spend: 0,
      profit: 0,
      expenses: 0,
    };

    for (const metric of previousMetrics) {
      previousTotals.revenue += metric.totalRevenueUsdt;
      previousTotals.spend += metric.totalSpend;
      previousTotals.profit += metric.netProfitMath;
      previousTotals.expenses += metric.totalExpensesUsdt;
    }

    // Period comparison
    const periodComparison = {
      current: {
        revenue: Math.round(currentTotals.revenue * 100) / 100,
        spend: Math.round(currentTotals.spend * 100) / 100,
        profit: Math.round(currentTotals.profit * 100) / 100,
        roi: currentTotals.expenses > 0
          ? (currentTotals.revenue - currentTotals.expenses) / currentTotals.expenses
          : 0,
      },
      previous: {
        revenue: Math.round(previousTotals.revenue * 100) / 100,
        spend: Math.round(previousTotals.spend * 100) / 100,
        profit: Math.round(previousTotals.profit * 100) / 100,
        roi: previousTotals.expenses > 0
          ? (previousTotals.revenue - previousTotals.expenses) / previousTotals.expenses
          : 0,
      },
    };

    // Top days by profit
    const dailyData: Record<string, { date: string; revenue: number; profit: number; spend: number }> = {};

    for (const metric of currentMetrics) {
      const dateStr = metric.date.toISOString().split("T")[0];
      if (!dailyData[dateStr]) {
        dailyData[dateStr] = { date: dateStr, revenue: 0, profit: 0, spend: 0 };
      }
      dailyData[dateStr].revenue += metric.totalRevenueUsdt;
      dailyData[dateStr].profit += metric.netProfitMath;
      dailyData[dateStr].spend += metric.totalSpend;
    }

    const topDays = Object.values(dailyData)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map(day => ({
        date: day.date,
        revenue: Math.round(day.revenue * 100) / 100,
        profit: Math.round(day.profit * 100) / 100,
        roi: day.spend > 0 ? (day.revenue - day.spend) / day.spend : 0,
      }));

    // Country performance
    const byCountry: Record<string, {
      name: string;
      revenue: number;
      spend: number;
      profit: number;
    }> = {};

    for (const metric of currentMetrics) {
      const countryName = metric.country.name;
      if (!byCountry[countryName]) {
        byCountry[countryName] = {
          name: countryName,
          revenue: 0,
          spend: 0,
          profit: 0,
        };
      }
      byCountry[countryName].revenue += metric.totalRevenueUsdt;
      byCountry[countryName].spend += metric.totalSpend;
      byCountry[countryName].profit += metric.netProfitMath;
    }

    const countryPerformance = Object.values(byCountry)
      .sort((a, b) => b.revenue - a.revenue)
      .map(c => ({
        name: c.name,
        revenue: Math.round(c.revenue * 100) / 100,
        spend: Math.round(c.spend * 100) / 100,
        profit: Math.round(c.profit * 100) / 100,
        roi: c.spend > 0 ? Math.round(((c.revenue - c.spend) / c.spend) * 10000) / 10000 : 0,
      }));

    // Weekly trend (last 8 weeks)
    const weeklyData: Record<string, { week: string; revenue: number; spend: number; profit: number }> = {};

    // Get all metrics from last 60 days for weekly trends (filter zero spend)
    const allRecentMetrics = await prisma.dailyMetrics.findMany({
      where: {
        date: {
          gte: previousStart,
          lte: today,
        },
        totalSpend: { gt: 0 },
        country: {
          isActive: true,
          status: { not: "disabled" },
        },
      },
    });

    for (const metric of allRecentMetrics) {
      const date = new Date(metric.date);
      // Get ISO week
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      const weekKey = `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { week: weekKey, revenue: 0, spend: 0, profit: 0 };
      }
      weeklyData[weekKey].revenue += metric.totalRevenueUsdt;
      weeklyData[weekKey].spend += metric.totalSpend;
      weeklyData[weekKey].profit += metric.netProfitMath;
    }

    const weeklyTrend = Object.values(weeklyData)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8)
      .map(w => ({
        week: w.week,
        revenue: Math.round(w.revenue * 100) / 100,
        spend: Math.round(w.spend * 100) / 100,
        profit: Math.round(w.profit * 100) / 100,
      }));

    // ROI distribution
    const roiRanges = [
      { range: "< -50%", min: -Infinity, max: -0.5, count: 0 },
      { range: "-50% to 0%", min: -0.5, max: 0, count: 0 },
      { range: "0% to 50%", min: 0, max: 0.5, count: 0 },
      { range: "50% to 100%", min: 0.5, max: 1, count: 0 },
      { range: "> 100%", min: 1, max: Infinity, count: 0 },
    ];

    for (const day of Object.values(dailyData)) {
      const roi = day.spend > 0 ? (day.revenue - day.spend) / day.spend : 0;
      for (const range of roiRanges) {
        if (roi >= range.min && roi < range.max) {
          range.count++;
          break;
        }
      }
    }

    const roiDistribution = roiRanges.map(r => ({
      range: r.range,
      count: r.count,
    }));

    return NextResponse.json({
      periodComparison,
      topDays,
      countryPerformance,
      weeklyTrend,
      roiDistribution,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
