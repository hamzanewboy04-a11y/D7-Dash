import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDbPath() {
  const rawUrl = process.env.DATABASE_URL;

  if (rawUrl) {
    const dbPath = rawUrl.replace("file:", "");
    console.log(`[Prisma] DATABASE_URL env: ${rawUrl}`);
    console.log(`[Prisma] Resolved DB path: ${dbPath}`);
    return dbPath;
  }

  // Use pre-populated data.db from repo - resolve absolute path
  // Try multiple possible locations
  const possiblePaths = [
    path.join(process.cwd(), "prisma", "data.db"),
    path.join(__dirname, "..", "..", "prisma", "data.db"),
    path.join(__dirname, "..", "..", "..", "prisma", "data.db"),
    "./prisma/data.db",
  ];

  console.log(`[Prisma] DATABASE_URL env: not set`);
  console.log(`[Prisma] Current working directory: ${process.cwd()}`);
  console.log(`[Prisma] __dirname: ${__dirname}`);

  for (const dbPath of possiblePaths) {
    console.log(`[Prisma] Checking path: ${dbPath}, exists: ${fs.existsSync(dbPath)}`);
    if (fs.existsSync(dbPath)) {
      console.log(`[Prisma] Found database at: ${dbPath}`);
      return dbPath;
    }
  }

  // Fallback to first path (will be created if not exists)
  const fallbackPath = possiblePaths[0];
  console.log(`[Prisma] Using fallback path: ${fallbackPath}`);
  return fallbackPath;
}

// Create tables using better-sqlite3 directly
export function ensureDatabaseTables() {
  const dbPath = getDbPath();
  console.log("[Prisma] Ensuring database tables exist at:", dbPath);

  // Check if database file exists
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    console.log(`[Prisma] Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

  const dbExists = fs.existsSync(dbPath);
  console.log(`[Prisma] Database file exists: ${dbExists}`);

  const db = new Database(dbPath);

  try {
    // Country table
    db.exec(`
      CREATE TABLE IF NOT EXISTS Country (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        currency TEXT DEFAULT 'USDT',
        isActive INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add status column if it doesn't exist (migration for existing DBs)
    try {
      db.exec(`ALTER TABLE Country ADD COLUMN status TEXT DEFAULT 'active'`);
    } catch {
      // Column already exists, ignore
    }

    // AdAccount table
    db.exec(`
      CREATE TABLE IF NOT EXISTS AdAccount (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agencyFeeRate REAL DEFAULT 0.08,
        countryId TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (countryId) REFERENCES Country(id)
      )
    `);

    // DailyMetrics table
    db.exec(`
      CREATE TABLE IF NOT EXISTS DailyMetrics (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        countryId TEXT NOT NULL,
        adAccountBalanceFact REAL DEFAULT 0,
        adAccountBalanceMath REAL DEFAULT 0,
        adAccountDeposit REAL DEFAULT 0,
        totalSpend REAL DEFAULT 0,
        agencyFee REAL DEFAULT 0,
        revenueLocalPriemka REAL DEFAULT 0,
        revenueUsdtPriemka REAL DEFAULT 0,
        exchangeRatePriemka REAL DEFAULT 0,
        commissionPriemka REAL DEFAULT 0,
        revenueLocalOwn REAL DEFAULT 0,
        revenueUsdtOwn REAL DEFAULT 0,
        exchangeRateOwn REAL DEFAULT 0,
        commissionExchange REAL DEFAULT 0,
        totalRevenueUsdt REAL DEFAULT 0,
        totalExpensesUsdt REAL DEFAULT 0,
        expensesWithoutSpend REAL DEFAULT 0,
        withdrawnFromOwn REAL DEFAULT 0,
        withdrawnFromPriemka REAL DEFAULT 0,
        balancePriemkaMath REAL DEFAULT 0,
        balanceOwnMath REAL DEFAULT 0,
        balancePriemkaFact REAL DEFAULT 0,
        balanceOwnFact REAL DEFAULT 0,
        fdCount INTEGER DEFAULT 0,
        nfdCount INTEGER DEFAULT 0,
        fdSumLocal REAL DEFAULT 0,
        nfdSumLocal REAL DEFAULT 0,
        fdSumUsdt REAL DEFAULT 0,
        nfdSumUsdt REAL DEFAULT 0,
        rdCount INTEGER DEFAULT 0,
        rdSumLocal REAL DEFAULT 0,
        rdSumUsdt REAL DEFAULT 0,
        payrollRdHandler REAL DEFAULT 0,
        payrollFdHandler REAL DEFAULT 0,
        payrollContent REAL DEFAULT 0,
        payrollReviews REAL DEFAULT 0,
        payrollDesigner REAL DEFAULT 0,
        payrollBuyer REAL DEFAULT 0,
        payrollHeadDesigner REAL DEFAULT 0,
        totalPayroll REAL DEFAULT 0,
        unpaidPayroll REAL DEFAULT 0,
        paidPayroll REAL DEFAULT 0,
        chatterfyCost REAL DEFAULT 0,
        additionalExpenses REAL DEFAULT 0,
        netProfitMath REAL DEFAULT 0,
        netProfitFact REAL DEFAULT 0,
        roi REAL DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        costPerClick REAL DEFAULT 0,
        subscriptions INTEGER DEFAULT 0,
        dialogs INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (countryId) REFERENCES Country(id),
        UNIQUE(date, countryId)
      )
    `);

    // DailyAdSpend table
    db.exec(`
      CREATE TABLE IF NOT EXISTS DailyAdSpend (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        adAccountId TEXT NOT NULL,
        dailyMetricsId TEXT NOT NULL,
        spend REAL DEFAULT 0,
        deposit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (adAccountId) REFERENCES AdAccount(id),
        FOREIGN KEY (dailyMetricsId) REFERENCES DailyMetrics(id),
        UNIQUE(date, adAccountId)
      )
    `);

    // Employee table
    db.exec(`
      CREATE TABLE IF NOT EXISTS Employee (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        countryId TEXT,
        fixedRate REAL,
        percentRate REAL,
        paymentType TEXT DEFAULT 'buffer',
        bufferDays INTEGER DEFAULT 7,
        paymentDay1 INTEGER,
        paymentDay2 INTEGER,
        currentBalance REAL DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (countryId) REFERENCES Country(id)
      )
    `);

    // PayrollRecord table
    db.exec(`
      CREATE TABLE IF NOT EXISTS PayrollRecord (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        employeeId TEXT NOT NULL,
        amount REAL NOT NULL,
        isPaid INTEGER DEFAULT 0,
        paidAt TEXT,
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES Employee(id)
      )
    `);

    // Expense table
    db.exec(`
      CREATE TABLE IF NOT EXISTS Expense (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        countryId TEXT,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'other',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (countryId) REFERENCES Country(id)
      )
    `);

    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS Settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // WeeklySummary table
    db.exec(`
      CREATE TABLE IF NOT EXISTS WeeklySummary (
        id TEXT PRIMARY KEY,
        weekStart TEXT NOT NULL,
        weekEnd TEXT NOT NULL,
        countryId TEXT,
        totalSpend REAL DEFAULT 0,
        totalRevenue REAL DEFAULT 0,
        totalPayroll REAL DEFAULT 0,
        additionalExp REAL DEFAULT 0,
        pnlMath REAL DEFAULT 0,
        pnlFact REAL DEFAULT 0,
        totalExpenses REAL DEFAULT 0,
        roi REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(weekStart, countryId)
      )
    `);

    // MonthlySummary table
    db.exec(`
      CREATE TABLE IF NOT EXISTS MonthlySummary (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        countryId TEXT,
        totalSpend REAL DEFAULT 0,
        totalRevenue REAL DEFAULT 0,
        totalPayroll REAL DEFAULT 0,
        additionalExp REAL DEFAULT 0,
        pnlMath REAL DEFAULT 0,
        pnlFact REAL DEFAULT 0,
        totalExpenses REAL DEFAULT 0,
        roi REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month, countryId)
      )
    `);

    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_dailymetrics_date ON DailyMetrics(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_dailymetrics_countryid ON DailyMetrics(countryId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payrollrecord_date ON PayrollRecord(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payrollrecord_employeeid ON PayrollRecord(employeeId)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_expense_date ON Expense(date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_expense_countryid ON Expense(countryId)`);

    // Count existing data
    const countryCount = db.prepare('SELECT COUNT(*) as count FROM Country').get() as { count: number };
    const metricsCount = db.prepare('SELECT COUNT(*) as count FROM DailyMetrics').get() as { count: number };

    console.log(`[Prisma] Database tables created/verified successfully`);
    console.log(`[Prisma] Existing data: ${countryCount.count} countries, ${metricsCount.count} daily metrics`);
  } finally {
    db.close();
  }
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // PRIORITY 1: Use Turso if credentials are available (CLOUD)
  if (tursoUrl && tursoToken) {
    console.log('[Prisma] ☁️  Using Turso cloud database (PRODUCTION)');
    console.log(`[Prisma] 🌐 Turso URL: ${tursoUrl}`);
    console.log('[Prisma] ✅ Data will persist across deployments');

    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    const adapter = new PrismaLibSql(libsql as any);

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  // PRIORITY 2: Fallback to local SQLite (DEVELOPMENT)
  console.log('[Prisma] 📁 Using local SQLite database (DEVELOPMENT)');
  console.log('[Prisma] ⚠️  WARNING: Data will be lost on redeploy!');
  console.log('[Prisma] 💡 TIP: Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to use cloud storage');

  const dbPath = getDbPath();
  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
