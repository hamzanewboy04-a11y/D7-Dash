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
    const buyingSmmPath = "data/buying-smm-data.json";
    if (!fs.existsSync(buyingSmmPath)) {
      console.log("[Sync] No buying-smm-data.json found, skipping sync");
      return;
    }

    const data = JSON.parse(fs.readFileSync(buyingSmmPath, "utf-8"));
    console.log(`[Sync] Loaded ${data.cabinets?.length || 0} cabinets, ${data.desks?.length || 0} desks, ${data.buyerMetrics?.length || 0} buyer metrics`);

    const currentCabinets = await prisma.cabinet.count();
    const currentDesks = await prisma.desk.count();
    const currentMetrics = await prisma.buyerMetrics.count();

    console.log(`[Sync] Current: ${currentCabinets} cabinets, ${currentDesks} desks, ${currentMetrics} metrics`);

    const needsSync = currentCabinets !== (data.cabinets?.length || 0) ||
                      currentDesks !== (data.desks?.length || 0) ||
                      currentMetrics !== (data.buyerMetrics?.length || 0);

    if (needsSync) {
      console.log("[Sync] Data needs syncing, clearing and reimporting...");

      await prisma.buyerMetrics.deleteMany({});
      await prisma.desk.deleteMany({});
      await prisma.cabinet.deleteMany({});

      for (const cab of data.cabinets || []) {
        await prisma.cabinet.create({
          data: {
            id: cab.id,
            name: cab.name,
            platform: cab.platform,
            platformId: cab.platformId,
            countryId: cab.countryId,
            description: cab.description,
            isActive: cab.isActive ?? true,
          },
        });
      }
      console.log(`[Sync] Created ${data.cabinets?.length || 0} cabinets`);

      for (const desk of data.desks || []) {
        await prisma.desk.create({
          data: {
            id: desk.id,
            name: desk.name,
            cabinetId: desk.cabinetId,
            employeeId: desk.employeeId,
            description: desk.description,
            isActive: desk.isActive ?? true,
          },
        });
      }
      console.log(`[Sync] Created ${data.desks?.length || 0} desks`);

      for (const m of data.buyerMetrics || []) {
        await prisma.buyerMetrics.create({
          data: {
            id: m.id,
            date: new Date(m.date),
            employeeId: m.employeeId,
            countryId: m.countryId,
            cabinetId: m.cabinetId,
            deskId: m.deskId,
            spendManual: m.spendManual,
            spend: m.spend || 0,
            subscriptions: m.subscriptions || 0,
            dialogs: m.dialogs || 0,
            fdCount: m.fdCount || 0,
            costPerSubscription: m.costPerSubscription || 0,
            costPerFd: m.costPerFd || 0,
            conversionRate: m.conversionRate || 0,
            payrollAmount: m.payrollAmount || 0,
            deskName: m.deskName,
            platformName: m.platformName,
          },
        });
      }
      console.log(`[Sync] Created ${data.buyerMetrics?.length || 0} buyer metrics`);
    } else {
      console.log("[Sync] Data is already in sync");
    }

    const summary = await prisma.buyerMetrics.groupBy({
      by: ["countryId"],
      _count: { id: true },
      _sum: { spend: true },
    });

    console.log("\n[Sync] Final summary:");
    for (const row of summary) {
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
