import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};
    
    if (countryId) where.countryId = countryId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    const summary = await prisma.buyerMetrics.aggregate({
      where,
      _sum: {
        spend: true,
        payrollAmount: true,
        fdCount: true,
        subscriptions: true,
        dialogs: true,
      },
      _avg: {
        costPerSubscription: true,
        costPerFd: true,
        conversionRate: true,
      },
      _count: true,
    });

    const byCountry = await prisma.buyerMetrics.groupBy({
      by: ["countryId"],
      where,
      _sum: {
        spend: true,
        payrollAmount: true,
        fdCount: true,
      },
    });

    const byBuyer = await prisma.buyerMetrics.groupBy({
      by: ["employeeId"],
      where,
      _sum: {
        spend: true,
        payrollAmount: true,
        fdCount: true,
      },
    });

    const countries = await prisma.country.findMany({
      where: { id: { in: byCountry.map(c => c.countryId) } },
      select: { id: true, name: true },
    });

    const employeeIds = byBuyer.map(b => b.employeeId).filter((id): id is string => id !== null);
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true },
    });

    return NextResponse.json({
      summary: {
        totalSpend: summary._sum.spend || 0,
        totalPayroll: summary._sum.payrollAmount || 0,
        totalFd: summary._sum.fdCount || 0,
        totalSubscriptions: summary._sum.subscriptions || 0,
        totalDialogs: summary._sum.dialogs || 0,
        avgCostPerSubscription: summary._avg.costPerSubscription || 0,
        avgCostPerFd: summary._avg.costPerFd || 0,
        avgConversionRate: summary._avg.conversionRate || 0,
        recordCount: summary._count,
      },
      byCountry: byCountry.map(c => ({
        ...c,
        countryName: countries.find(country => country.id === c.countryId)?.name || "Unknown",
      })),
      byBuyer: byBuyer.map(b => ({
        ...b,
        buyerName: employees.find(emp => emp.id === b.employeeId)?.name || "Unknown",
      })),
    });
  } catch (error) {
    console.error("Error fetching buyer summary:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
