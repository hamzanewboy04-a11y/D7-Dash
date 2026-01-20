import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const metrics = await prisma.dailyMetrics.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay,
        },
        country: {
          isActive: true,
        },
      },
      include: {
        country: true,
      },
    });

    const metricsMap: Record<string, typeof metrics[0]> = {};
    metrics.forEach((m) => {
      metricsMap[m.countryId] = m;
    });

    return NextResponse.json({
      countries,
      metrics: metricsMap,
      date: date,
    });
  } catch (error) {
    console.error("Error fetching data entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, entries } = body;

    if (!date || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Date and entries array are required" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    const results = [];

    for (const entry of entries) {
      const {
        countryId,
        totalSpend,
        revenueLocalPriemka,
        revenueUsdtPriemka,
        revenueLocalOwn,
        revenueUsdtOwn,
        exchangeRatePriemka,
        exchangeRateOwn,
        fdCount,
        fdSumLocal,
        fdSumUsdt,
        rdCount,
        rdSumLocal,
        rdSumUsdt,
      } = entry;

      if (!countryId) continue;

      const existingMetric = await prisma.dailyMetrics.findFirst({
        where: {
          countryId,
          date: targetDate,
        },
      });

      const totalRevenueUsdt = (revenueUsdtPriemka || 0) + (revenueUsdtOwn || 0);
      const commissionPriemka = (revenueUsdtPriemka || 0) * 0.15;

      const data = {
        totalSpend: totalSpend || 0,
        revenueLocalPriemka: revenueLocalPriemka || 0,
        revenueUsdtPriemka: revenueUsdtPriemka || 0,
        revenueLocalOwn: revenueLocalOwn || 0,
        revenueUsdtOwn: revenueUsdtOwn || 0,
        exchangeRatePriemka: exchangeRatePriemka || 0,
        exchangeRateOwn: exchangeRateOwn || 0,
        totalRevenueUsdt,
        commissionPriemka,
        fdCount: fdCount || 0,
        fdSumLocal: fdSumLocal || 0,
        fdSumUsdt: fdSumUsdt || 0,
        rdCount: rdCount || 0,
        rdSumLocal: rdSumLocal || 0,
        rdSumUsdt: rdSumUsdt || 0,
      };

      let result;
      if (existingMetric) {
        result = await prisma.dailyMetrics.update({
          where: { id: existingMetric.id },
          data,
        });
      } else {
        result = await prisma.dailyMetrics.create({
          data: {
            date: targetDate,
            countryId,
            ...data,
          },
        });
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      saved: results.length,
      results,
    });
  } catch (error) {
    console.error("Error saving data entry:", error);
    return NextResponse.json(
      { error: "Failed to save data" },
      { status: 500 }
    );
  }
}
