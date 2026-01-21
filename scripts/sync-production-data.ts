import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "fs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function syncData() {
  console.log("[Sync] Checking production database...");
  
  try {
    // Load correct data from JSON
    const buyingSmmPath = "data/buying-smm-data.json";
    if (!fs.existsSync(buyingSmmPath)) {
      console.log("[Sync] No buying-smm-data.json found, skipping sync");
      return;
    }

    const buyingSmmData = JSON.parse(fs.readFileSync(buyingSmmPath, "utf-8"));
    console.log(`[Sync] Loaded ${buyingSmmData.employees?.length || 0} employees, ${buyingSmmData.buyerMetrics?.length || 0} buyer metrics`);

    // Summary of correct data
    const correctByCountry: Record<string, { count: number; spend: number }> = {};
    for (const m of buyingSmmData.buyerMetrics || []) {
      if (!correctByCountry[m.countryId]) correctByCountry[m.countryId] = { count: 0, spend: 0 };
      correctByCountry[m.countryId].count++;
      correctByCountry[m.countryId].spend += m.spend || 0;
    }
    
    console.log("[Sync] Correct data summary:");
    for (const [k, v] of Object.entries(correctByCountry)) {
      console.log(`  ${k}: ${v.count} records, $${v.spend.toFixed(2)}`);
    }

    // Check current database state
    const currentMetrics = await prisma.buyerMetrics.groupBy({
      by: ["countryId"],
      _count: { id: true },
      _sum: { spend: true },
    });

    console.log("\n[Sync] Current database state:");
    for (const row of currentMetrics) {
      console.log(`  ${row.countryId}: ${row._count.id} records, $${row._sum.spend?.toFixed(2)}`);
    }

    // Check if data needs fixing
    const currentTotal = currentMetrics.reduce((sum, r) => sum + r._count.id, 0);
    const correctTotal = buyingSmmData.buyerMetrics?.length || 0;

    // Check for wrong data (e.g., Chile data that shouldn't exist)
    const invalidCountries = ["cmkl84b070004u6gkag39jtlk"]; // Chile shouldn't have buyer data
    const hasInvalidData = currentMetrics.some(r => invalidCountries.includes(r.countryId));
    
    // Check for incorrect counts per country
    let hasIncorrectCounts = false;
    for (const row of currentMetrics) {
      const correct = correctByCountry[row.countryId];
      if (!correct && row._count.id > 0) {
        console.log(`[Sync] Found ${row._count.id} records for country ${row.countryId} that shouldn't exist`);
        hasIncorrectCounts = true;
      } else if (correct && Math.abs(row._count.id - correct.count) > 0) {
        console.log(`[Sync] Country ${row.countryId}: has ${row._count.id}, should have ${correct.count}`);
        hasIncorrectCounts = true;
      }
    }

    if (hasInvalidData || hasIncorrectCounts || currentTotal !== correctTotal) {
      console.log("\n[Sync] Data needs fixing, clearing and re-importing...");
      
      // Clear all buyer metrics
      await prisma.buyerMetrics.deleteMany({});
      console.log("[Sync] Cleared all BuyerMetrics");

      // Ensure employees exist
      for (const emp of buyingSmmData.employees || []) {
        await prisma.employee.upsert({
          where: { id: emp.id },
          update: { name: emp.name, role: emp.role, countryId: emp.countryId, percentRate: emp.percentRate, percentageBase: emp.percentageBase },
          create: emp,
        });
      }
      console.log(`[Sync] Upserted ${buyingSmmData.employees?.length || 0} employees`);

      // Insert correct buyer metrics
      let inserted = 0;
      for (const metric of buyingSmmData.buyerMetrics || []) {
        try {
          await prisma.buyerMetrics.create({
            data: {
              id: metric.id,
              date: new Date(metric.date),
              employeeId: metric.employeeId,
              countryId: metric.countryId,
              spend: metric.spend || 0,
              subscriptions: metric.subscriptions || 0,
              dialogs: metric.dialogs || 0,
              fdCount: metric.fdCount || 0,
              costPerSubscription: metric.costPerSubscription || 0,
              costPerFd: metric.costPerFd || 0,
              conversionRate: metric.conversionRate || 0,
              payrollAmount: metric.payrollAmount || 0,
              deskName: metric.deskName,
            },
          });
          inserted++;
        } catch (e) {
          // Record might already exist with same unique constraint
        }
      }
      console.log(`[Sync] Inserted ${inserted} BuyerMetrics`);
    } else {
      console.log("\n[Sync] Data is correct, no changes needed");
    }

    const finalCount = await prisma.buyerMetrics.count();
    console.log(`\n[Sync] Final buyer metrics count: ${finalCount}`);

    const finalSummary = await prisma.buyerMetrics.groupBy({
      by: ["countryId"],
      _count: { id: true },
      _sum: { spend: true },
    });
    console.log("[Sync] Final summary:");
    for (const row of finalSummary) {
      console.log(`  ${row.countryId}: ${row._count.id} records, $${row._sum.spend?.toFixed(2)}`);
    }

  } catch (error) {
    console.error("[Sync] Error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

syncData();
