import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function exportData() {
  console.log("Exporting data from PostgreSQL...");

  const countries = await prisma.country.findMany();
  const metrics = await prisma.dailyMetrics.findMany();
  const adAccounts = await prisma.adAccount.findMany();

  const data = {
    countries,
    metrics: metrics.map(m => ({
      ...m,
      date: m.date.toISOString(),
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    adAccounts: adAccounts.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  };

  fs.writeFileSync("data/seed-data.json", JSON.stringify(data, null, 2));
  console.log(`Exported: ${countries.length} countries, ${metrics.length} metrics, ${adAccounts.length} ad accounts`);

  await prisma.$disconnect();
  await pool.end();
}

exportData().catch(console.error);
