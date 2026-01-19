import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get payroll summary with unpaid balances and payment periods
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const bufferWeeks = parseInt(searchParams.get("bufferWeeks") || "1");

    // Calculate the cutoff date for payable amounts (default 1 week buffer)
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - (bufferWeeks * 7));

    // Get all metrics with payroll data
    const metricsWhere: Record<string, unknown> = {
      totalPayroll: { gt: 0 },
    };
    if (countryId) {
      metricsWhere.countryId = countryId;
    }

    const metrics = await prisma.dailyMetrics.findMany({
      where: metricsWhere,
      include: {
        country: true,
      },
      orderBy: { date: "desc" },
    });

    // Group by week
    const weeklyData: Record<string, {
      weekStart: Date;
      weekEnd: Date;
      totalPayroll: number;
      paidPayroll: number;
      unpaidPayroll: number;
      isPayable: boolean;
      countries: Set<string>;
      days: number;
    }> = {};

    for (const m of metrics) {
      const date = new Date(m.date);
      // Get Monday of the week
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyData[weekKey]) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeklyData[weekKey] = {
          weekStart,
          weekEnd,
          totalPayroll: 0,
          paidPayroll: 0,
          unpaidPayroll: 0,
          isPayable: weekEnd < cutoffDate,
          countries: new Set(),
          days: 0,
        };
      }

      weeklyData[weekKey].totalPayroll += m.totalPayroll;
      weeklyData[weekKey].paidPayroll += m.paidPayroll;
      weeklyData[weekKey].unpaidPayroll += m.unpaidPayroll;
      weeklyData[weekKey].countries.add(m.country.code);
      weeklyData[weekKey].days++;
    }

    // Convert to array and format
    const weeks = Object.entries(weeklyData)
      .map(([, data]) => ({
        weekStart: data.weekStart.toISOString().split("T")[0],
        weekEnd: data.weekEnd.toISOString().split("T")[0],
        totalPayroll: Math.round(data.totalPayroll * 100) / 100,
        paidPayroll: Math.round(data.paidPayroll * 100) / 100,
        unpaidPayroll: Math.round(data.unpaidPayroll * 100) / 100,
        isPayable: data.isPayable,
        countries: Array.from(data.countries),
        days: data.days,
      }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

    // Calculate overall totals
    const totals = {
      totalPayroll: weeks.reduce((sum, w) => sum + w.totalPayroll, 0),
      paidPayroll: weeks.reduce((sum, w) => sum + w.paidPayroll, 0),
      unpaidPayroll: weeks.reduce((sum, w) => sum + w.unpaidPayroll, 0),
      payableNow: weeks.filter(w => w.isPayable).reduce((sum, w) => sum + w.unpaidPayroll, 0),
      bufferAmount: weeks.filter(w => !w.isPayable).reduce((sum, w) => sum + w.unpaidPayroll, 0),
    };

    // Group by country
    const byCountry: Record<string, {
      name: string;
      code: string;
      totalPayroll: number;
      paidPayroll: number;
      unpaidPayroll: number;
    }> = {};

    for (const m of metrics) {
      const code = m.country.code;
      if (!byCountry[code]) {
        byCountry[code] = {
          name: m.country.name,
          code,
          totalPayroll: 0,
          paidPayroll: 0,
          unpaidPayroll: 0,
        };
      }
      byCountry[code].totalPayroll += m.totalPayroll;
      byCountry[code].paidPayroll += m.paidPayroll;
      byCountry[code].unpaidPayroll += m.unpaidPayroll;
    }

    const countries = Object.values(byCountry).map(c => ({
      ...c,
      totalPayroll: Math.round(c.totalPayroll * 100) / 100,
      paidPayroll: Math.round(c.paidPayroll * 100) / 100,
      unpaidPayroll: Math.round(c.unpaidPayroll * 100) / 100,
    }));

    return NextResponse.json({
      totals: {
        ...totals,
        totalPayroll: Math.round(totals.totalPayroll * 100) / 100,
        paidPayroll: Math.round(totals.paidPayroll * 100) / 100,
        unpaidPayroll: Math.round(totals.unpaidPayroll * 100) / 100,
        payableNow: Math.round(totals.payableNow * 100) / 100,
        bufferAmount: Math.round(totals.bufferAmount * 100) / 100,
      },
      weeks,
      countries,
      bufferWeeks,
      cutoffDate: cutoffDate.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    return NextResponse.json(
      { error: "Ошибка при получении сводки ФОТ" },
      { status: 500 }
    );
  }
}
