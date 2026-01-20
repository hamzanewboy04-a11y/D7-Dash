import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import seedData from "../../../../data/seed-data.json";

// POST /api/seed - Initialize database with seed data
export async function POST() {
  try {
    const countriesCount = await prisma.country.count();
    
    if (countriesCount > 0) {
      return NextResponse.json({
        message: "Database already seeded",
        countries: countriesCount,
      });
    }

    console.log("Seeding database from JSON...");

    // Create countries
    for (const country of seedData.countries) {
      await prisma.country.upsert({
        where: { code: country.code },
        update: {},
        create: {
          id: country.id,
          name: country.name,
          code: country.code,
          currency: country.currency,
          isActive: country.isActive,
          status: country.status,
        },
      });
    }
    console.log(`Created ${seedData.countries.length} countries`);

    // Create ad accounts
    for (const account of seedData.adAccounts) {
      await prisma.adAccount.upsert({
        where: { id: account.id },
        update: {},
        create: {
          id: account.id,
          name: account.name,
          agencyFeeRate: account.agencyFeeRate,
          countryId: account.countryId,
          isActive: account.isActive,
        },
      });
    }
    console.log(`Created ${seedData.adAccounts.length} ad accounts`);

    // Create daily metrics in batches
    let created = 0;
    for (const metric of seedData.metrics) {
      try {
        await prisma.dailyMetrics.upsert({
          where: {
            date_countryId: {
              date: new Date(metric.date),
              countryId: metric.countryId,
            },
          },
          update: {},
          create: {
            id: metric.id,
            date: new Date(metric.date),
            countryId: metric.countryId,
            adAccountBalanceFact: metric.adAccountBalanceFact,
            adAccountBalanceMath: metric.adAccountBalanceMath,
            adAccountDeposit: metric.adAccountDeposit,
            totalSpend: metric.totalSpend,
            spendTrust: metric.spendTrust,
            spendCrossgif: metric.spendCrossgif,
            spendFbm: metric.spendFbm,
            agencyFee: metric.agencyFee,
            revenueLocalPriemka: metric.revenueLocalPriemka,
            revenueUsdtPriemka: metric.revenueUsdtPriemka,
            exchangeRatePriemka: metric.exchangeRatePriemka,
            commissionPriemka: metric.commissionPriemka,
            revenueLocalOwn: metric.revenueLocalOwn,
            revenueUsdtOwn: metric.revenueUsdtOwn,
            exchangeRateOwn: metric.exchangeRateOwn,
            commissionExchange: metric.commissionExchange,
            totalRevenueUsdt: metric.totalRevenueUsdt,
            totalExpensesUsdt: metric.totalExpensesUsdt,
            expensesWithoutSpend: metric.expensesWithoutSpend,
            withdrawnFromOwn: metric.withdrawnFromOwn,
            withdrawnFromPriemka: metric.withdrawnFromPriemka,
            balancePriemkaMath: metric.balancePriemkaMath,
            balanceOwnMath: metric.balanceOwnMath,
            balancePriemkaFact: metric.balancePriemkaFact,
            balanceOwnFact: metric.balanceOwnFact,
            fdCount: metric.fdCount,
            nfdCount: metric.nfdCount,
            fdSumLocal: metric.fdSumLocal,
            nfdSumLocal: metric.nfdSumLocal,
            fdSumUsdt: metric.fdSumUsdt,
            nfdSumUsdt: metric.nfdSumUsdt,
            rdCount: metric.rdCount,
            rdSumLocal: metric.rdSumLocal,
            rdSumUsdt: metric.rdSumUsdt,
            payrollRdHandler: metric.payrollRdHandler,
            payrollFdHandler: metric.payrollFdHandler,
            payrollContent: metric.payrollContent,
            payrollReviews: metric.payrollReviews,
            payrollDesigner: metric.payrollDesigner,
            payrollBuyer: metric.payrollBuyer,
            payrollHeadDesigner: metric.payrollHeadDesigner,
            totalPayroll: metric.totalPayroll,
            unpaidPayroll: metric.unpaidPayroll,
            paidPayroll: metric.paidPayroll,
            chatterfyCost: metric.chatterfyCost,
            additionalExpenses: metric.additionalExpenses,
            netProfitMath: metric.netProfitMath,
            netProfitFact: metric.netProfitFact,
            roi: metric.roi,
            clicks: metric.clicks,
            costPerClick: metric.costPerClick,
            subscriptions: metric.subscriptions,
            dialogs: metric.dialogs,
          },
        });
        created++;
      } catch (e) {
        console.error(`Error creating metric for ${metric.date}:`, e);
      }
    }
    console.log(`Created ${created} daily metrics`);

    return NextResponse.json({
      message: "Database seeded successfully",
      countries: seedData.countries.length,
      adAccounts: seedData.adAccounts.length,
      metrics: created,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check if database is seeded
export async function GET() {
  try {
    const countriesCount = await prisma.country.count();
    const metricsCount = await prisma.dailyMetrics.count();

    return NextResponse.json({
      seeded: countriesCount > 0 && metricsCount > 0,
      counts: {
        countries: countriesCount,
        metrics: metricsCount,
      },
    });
  } catch (error) {
    console.error("Error checking seed status:", error);
    return NextResponse.json(
      { error: "Failed to check seed status", details: String(error) },
      { status: 500 }
    );
  }
}
