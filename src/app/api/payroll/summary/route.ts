import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAllEmployeesPayroll, EmployeePayrollResult } from "@/lib/payroll-calculator";

export interface PayrollSummaryResponse {
  totals: {
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
    payableNow: number;
    bufferAmount: number;
    calculatedTotal: number;
  };
  weeks: {
    weekStart: string;
    weekEnd: string;
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
    isPayable: boolean;
    countries: string[];
    days: number;
  }[];
  countries: {
    name: string;
    code: string;
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
  }[];
  employees: EmployeePayrollResult[];
  bufferWeeks: number;
  cutoffDate: string;
  periodStart: string;
  periodEnd: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const bufferWeeks = parseInt(searchParams.get("bufferWeeks") || "1");
    
    const periodStartParam = searchParams.get("periodStart");
    const periodEndParam = searchParams.get("periodEnd");
    
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - (bufferWeeks * 7));
    
    const periodEnd = periodEndParam ? new Date(periodEndParam) : today;
    const periodStart = periodStartParam 
      ? new Date(periodStartParam) 
      : new Date(today.getFullYear(), today.getMonth(), 1);

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

    const totals = {
      totalPayroll: weeks.reduce((sum, w) => sum + w.totalPayroll, 0),
      paidPayroll: weeks.reduce((sum, w) => sum + w.paidPayroll, 0),
      unpaidPayroll: weeks.reduce((sum, w) => sum + w.unpaidPayroll, 0),
      payableNow: weeks.filter(w => w.isPayable).reduce((sum, w) => sum + w.unpaidPayroll, 0),
      bufferAmount: weeks.filter(w => !w.isPayable).reduce((sum, w) => sum + w.unpaidPayroll, 0),
      calculatedTotal: 0,
    };

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

    let employees: EmployeePayrollResult[] = [];
    try {
      employees = await calculateAllEmployeesPayroll(periodStart, periodEnd);
      totals.calculatedTotal = employees.reduce((sum, e) => sum + e.calculatedAmount, 0);
    } catch (err) {
      console.error("Error calculating employee payroll:", err);
    }

    return NextResponse.json({
      totals: {
        ...totals,
        totalPayroll: Math.round(totals.totalPayroll * 100) / 100,
        paidPayroll: Math.round(totals.paidPayroll * 100) / 100,
        unpaidPayroll: Math.round(totals.unpaidPayroll * 100) / 100,
        payableNow: Math.round(totals.payableNow * 100) / 100,
        bufferAmount: Math.round(totals.bufferAmount * 100) / 100,
        calculatedTotal: Math.round(totals.calculatedTotal * 100) / 100,
      },
      weeks,
      countries,
      employees,
      bufferWeeks,
      cutoffDate: cutoffDate.toISOString().split("T")[0],
      periodStart: periodStart.toISOString().split("T")[0],
      periodEnd: periodEnd.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    return NextResponse.json(
      { error: "Ошибка при получении сводки ФОТ" },
      { status: 500 }
    );
  }
}
