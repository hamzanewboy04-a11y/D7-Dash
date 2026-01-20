import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  const isDeployment = !!process.env.REPLIT_DEPLOYMENT;
  
  console.log('[Prisma] Environment:', isDeployment ? 'PRODUCTION' : 'DEVELOPMENT');
  console.log('[Prisma] DATABASE_URL available:', !!databaseUrl);
  
  if (!databaseUrl) {
    console.error('[Prisma] ERROR: DATABASE_URL is not set!');
    console.error('[Prisma] This usually means the production database is not linked.');
    console.error('[Prisma] Go to Database tab in Replit and link the production database.');
    
    // Return a mock client that throws helpful errors
    return new Proxy({} as PrismaClient, {
      get: () => {
        return () => Promise.reject(new Error('Database not configured. Please link production database in Replit.'));
      }
    });
  }
  
  console.log('[Prisma] Using PostgreSQL database (CLOUD)');
  console.log('[Prisma] Data will persist across deployments');

  const pool = globalForPrisma.pool ?? new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('ssl=') ? undefined : { rejectUnauthorized: false },
  });
  
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
