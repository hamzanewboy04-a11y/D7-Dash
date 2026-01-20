import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  console.log("Starting migration from SQLite to PostgreSQL...");
  
  const pool = new Pool();
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const sqlite = new Database("data.db");
  
  try {
    const countries = sqlite.prepare("SELECT * FROM Country").all() as Array<{
      id: string;
      name: string;
      code: string;
      currency: string;
      isActive: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
    
    console.log(`Found ${countries.length} countries to migrate`);

    for (const country of countries) {
      await prisma.country.upsert({
        where: { id: country.id },
        update: {
          name: country.name,
          code: country.code,
          currency: country.currency || "USDT",
          isActive: Boolean(country.isActive),
          status: country.status || "active",
        },
        create: {
          id: country.id,
          name: country.name,
          code: country.code,
          currency: country.currency || "USDT",
          isActive: Boolean(country.isActive),
          status: country.status || "active",
        },
      });
    }
    console.log(`Migrated ${countries.length} countries`);

    const metrics = sqlite.prepare("SELECT * FROM DailyMetrics").all() as Array<Record<string, unknown>>;
    console.log(`Found ${metrics.length} daily metrics to migrate`);

    let migrated = 0;
    for (const m of metrics) {
      try {
        await prisma.dailyMetrics.upsert({
          where: {
            date_countryId: {
              date: new Date(m.date as string),
              countryId: m.countryId as string,
            }
          },
          update: {
            totalSpend: (m.totalSpend as number) || 0,
            agencyFee: (m.agencyFee as number) || 0,
            revenueLocalPriemka: (m.revenueLocalPriemka as number) || 0,
            revenueUsdtPriemka: (m.revenueUsdtPriemka as number) || 0,
            exchangeRatePriemka: (m.exchangeRatePriemka as number) || 0,
            revenueLocalOwn: (m.revenueLocalOwn as number) || 0,
            revenueUsdtOwn: (m.revenueUsdtOwn as number) || 0,
            exchangeRateOwn: (m.exchangeRateOwn as number) || 0,
            totalRevenueUsdt: (m.totalRevenueUsdt as number) || 0,
            totalExpensesUsdt: (m.totalExpensesUsdt as number) || 0,
            expensesWithoutSpend: (m.expensesWithoutSpend as number) || 0,
            withdrawnFromOwn: (m.withdrawnFromOwn as number) || 0,
            withdrawnFromPriemka: (m.withdrawnFromPriemka as number) || 0,
            fdCount: Math.round((m.fdCount as number) || 0),
            fdSumLocal: (m.fdSumLocal as number) || 0,
            fdSumUsdt: (m.fdSumUsdt as number) || 0,
            nfdCount: Math.round((m.nfdCount as number) || 0),
            nfdSumLocal: (m.nfdSumLocal as number) || 0,
            rdCount: Math.round((m.rdCount as number) || 0),
            rdSumLocal: (m.rdSumLocal as number) || 0,
            rdSumUsdt: (m.rdSumUsdt as number) || 0,
            netProfitMath: (m.netProfitMath as number) || 0,
            roi: (m.roi as number) || 0,
            chatterfyCost: (m.chatterfyCost as number) || 0,
            additionalExpenses: (m.additionalExpenses as number) || 0,
            adAccountBalanceFact: (m.adAccountBalanceFact as number) || 0,
            adAccountBalanceMath: (m.adAccountBalanceMath as number) || 0,
            adAccountDeposit: (m.adAccountDeposit as number) || 0,
            totalPayroll: (m.totalPayroll as number) || 0,
          },
          create: {
            id: m.id as string,
            date: new Date(m.date as string),
            countryId: m.countryId as string,
            totalSpend: (m.totalSpend as number) || 0,
            agencyFee: (m.agencyFee as number) || 0,
            revenueLocalPriemka: (m.revenueLocalPriemka as number) || 0,
            revenueUsdtPriemka: (m.revenueUsdtPriemka as number) || 0,
            exchangeRatePriemka: (m.exchangeRatePriemka as number) || 0,
            revenueLocalOwn: (m.revenueLocalOwn as number) || 0,
            revenueUsdtOwn: (m.revenueUsdtOwn as number) || 0,
            exchangeRateOwn: (m.exchangeRateOwn as number) || 0,
            totalRevenueUsdt: (m.totalRevenueUsdt as number) || 0,
            totalExpensesUsdt: (m.totalExpensesUsdt as number) || 0,
            expensesWithoutSpend: (m.expensesWithoutSpend as number) || 0,
            withdrawnFromOwn: (m.withdrawnFromOwn as number) || 0,
            withdrawnFromPriemka: (m.withdrawnFromPriemka as number) || 0,
            fdCount: Math.round((m.fdCount as number) || 0),
            fdSumLocal: (m.fdSumLocal as number) || 0,
            fdSumUsdt: (m.fdSumUsdt as number) || 0,
            nfdCount: Math.round((m.nfdCount as number) || 0),
            nfdSumLocal: (m.nfdSumLocal as number) || 0,
            rdCount: Math.round((m.rdCount as number) || 0),
            rdSumLocal: (m.rdSumLocal as number) || 0,
            rdSumUsdt: (m.rdSumUsdt as number) || 0,
            netProfitMath: (m.netProfitMath as number) || 0,
            roi: (m.roi as number) || 0,
            chatterfyCost: (m.chatterfyCost as number) || 0,
            additionalExpenses: (m.additionalExpenses as number) || 0,
            adAccountBalanceFact: (m.adAccountBalanceFact as number) || 0,
            adAccountBalanceMath: (m.adAccountBalanceMath as number) || 0,
            adAccountDeposit: (m.adAccountDeposit as number) || 0,
            totalPayroll: (m.totalPayroll as number) || 0,
          },
        });
        migrated++;
      } catch (e) {
        console.error(`Error migrating metric ${m.id}:`, (e as Error).message);
      }
    }
    console.log(`Migrated ${migrated} daily metrics`);

    const adAccounts = sqlite.prepare("SELECT * FROM AdAccount").all() as Array<{
      id: string;
      name: string;
      agencyFeeRate: number;
      countryId: string;
      isActive: number;
    }>;
    
    for (const acc of adAccounts) {
      await prisma.adAccount.upsert({
        where: { id: acc.id },
        update: {
          name: acc.name,
          agencyFeeRate: acc.agencyFeeRate || 0.08,
          countryId: acc.countryId,
          isActive: Boolean(acc.isActive),
        },
        create: {
          id: acc.id,
          name: acc.name,
          agencyFeeRate: acc.agencyFeeRate || 0.08,
          countryId: acc.countryId,
          isActive: Boolean(acc.isActive),
        },
      });
    }
    console.log(`Migrated ${adAccounts.length} ad accounts`);

    console.log("\nMigration completed successfully!");
    
    const countCheck = await prisma.dailyMetrics.count();
    const countryCheck = await prisma.country.count();
    console.log(`PostgreSQL now has: ${countryCheck} countries, ${countCheck} daily metrics`);

  } finally {
    sqlite.close();
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);
