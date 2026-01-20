import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";

async function seedProduction() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("DATABASE_URL not set, skipping seed");
    process.exit(0);
  }

  console.log("Connecting to database...");
  
  const pool = new pg.Pool({ 
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('ssl=') ? undefined : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const countriesCount = await prisma.country.count();
    console.log(`Current countries count: ${countriesCount}`);
    
    if (countriesCount > 0) {
      console.log("Database already seeded, skipping");
      await prisma.$disconnect();
      await pool.end();
      process.exit(0);
    }

    console.log("Seeding production database...");

    const seedDataPath = "data/seed-data.json";
    if (!fs.existsSync(seedDataPath)) {
      console.error("Seed data file not found:", seedDataPath);
      process.exit(1);
    }

    const seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf-8"));
    console.log(`Loaded seed data: ${seedData.countries.length} countries, ${seedData.metrics.length} metrics`);

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

    // Create daily metrics
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
        console.error(`Error creating metric:`, e);
      }
    }
    console.log(`Created ${created} daily metrics`);

    // Seed Buying and SMM data
    const buyingSmmPath = "data/buying-smm-data.json";
    if (fs.existsSync(buyingSmmPath)) {
      const buyingSmmData = JSON.parse(fs.readFileSync(buyingSmmPath, "utf-8"));
      console.log(`Loading buying/smm data: ${buyingSmmData.employees?.length || 0} employees, ${buyingSmmData.buyerMetrics?.length || 0} buyer metrics, ${buyingSmmData.smmMetrics?.length || 0} smm metrics`);

      // Create employees first
      for (const emp of buyingSmmData.employees || []) {
        try {
          await prisma.employee.upsert({
            where: { id: emp.id },
            update: {},
            create: {
              id: emp.id,
              name: emp.name,
              role: emp.role,
              percentRate: emp.percentRate,
              percentageBase: emp.percentageBase,
              countryId: emp.countryId,
              isActive: emp.isActive,
            },
          });
        } catch (e) {
          // Ignore duplicates
        }
      }
      console.log(`Created ${buyingSmmData.employees?.length || 0} employees`);

      // Create buyer metrics
      let buyerCreated = 0;
      for (const metric of buyingSmmData.buyerMetrics || []) {
        try {
          await prisma.buyerMetrics.upsert({
            where: {
              date_employeeId_countryId: {
                date: new Date(metric.date),
                employeeId: metric.employeeId,
                countryId: metric.countryId,
              },
            },
            update: {},
            create: {
              date: new Date(metric.date),
              employeeId: metric.employeeId,
              countryId: metric.countryId,
              spendManual: metric.spendManual,
              spend: metric.spend,
              subscriptions: metric.subscriptions,
              dialogs: metric.dialogs,
              fdCount: metric.fdCount,
              costPerSubscription: metric.costPerSubscription,
              costPerFd: metric.costPerFd,
              conversionRate: metric.conversionRate,
              payrollAmount: metric.payrollAmount,
              deskName: metric.deskName,
              platformName: metric.platformName,
            },
          });
          buyerCreated++;
        } catch (e) {
          // Ignore errors
        }
      }
      console.log(`Created ${buyerCreated} buyer metrics`);

      // Create SMM metrics
      let smmCreated = 0;
      for (const metric of buyingSmmData.smmMetrics || []) {
        try {
          await prisma.smmMetrics.upsert({
            where: {
              date_countryId: {
                date: new Date(metric.date),
                countryId: metric.countryId,
              },
            },
            update: {},
            create: {
              date: new Date(metric.date),
              countryId: metric.countryId,
              postsPlan: metric.postsPlan,
              postsFact: metric.postsFact,
              storiesPlan: metric.storiesPlan,
              storiesFact: metric.storiesFact,
              miniReviewsPlan: metric.miniReviewsPlan,
              miniReviewsFact: metric.miniReviewsFact,
              bigReviewsPlan: metric.bigReviewsPlan,
              bigReviewsFact: metric.bigReviewsFact,
              notes: metric.notes,
            },
          });
          smmCreated++;
        } catch (e) {
          // Ignore errors
        }
      }
      console.log(`Created ${smmCreated} smm metrics`);
    }

    console.log("Production database seeded successfully!");
    
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

seedProduction();
