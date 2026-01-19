import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Create database tables if they don't exist
async function ensureTablesExist() {
  try {
    // Try to query a table - if it fails, tables don't exist
    await prisma.$queryRawUnsafe("SELECT 1 FROM Country LIMIT 1");
    return true; // Tables exist
  } catch {
    // Tables don't exist, create them
    console.log("Creating database tables...");

    const createTablesSql = `
      -- Country table
      CREATE TABLE IF NOT EXISTS Country (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        currency TEXT DEFAULT 'USDT',
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- AdAccount table
      CREATE TABLE IF NOT EXISTS AdAccount (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agencyFeeRate REAL DEFAULT 0.08,
        countryId TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (countryId) REFERENCES Country(id)
      );

      -- DailyMetrics table
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
      );

      -- DailyAdSpend table
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
      );

      -- Employee table
      CREATE TABLE IF NOT EXISTS Employee (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        countryId TEXT,
        fixedRate REAL,
        percentRate REAL,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (countryId) REFERENCES Country(id)
      );

      -- PayrollRecord table
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
      );

      -- Settings table
      CREATE TABLE IF NOT EXISTS Settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- WeeklySummary table
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
      );

      -- MonthlySummary table
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
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_dailymetrics_date ON DailyMetrics(date);
      CREATE INDEX IF NOT EXISTS idx_dailymetrics_countryid ON DailyMetrics(countryId);
      CREATE INDEX IF NOT EXISTS idx_payrollrecord_date ON PayrollRecord(date);
      CREATE INDEX IF NOT EXISTS idx_payrollrecord_employeeid ON PayrollRecord(employeeId);
    `;

    // Execute each statement separately (SQLite doesn't support multiple statements in one query)
    const statements = createTablesSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (err) {
        console.error("Error executing statement:", statement.substring(0, 50), err);
      }
    }

    console.log("Database tables created successfully");
    return true;
  }
}

// POST /api/seed - Initialize database with default data
export async function POST() {
  try {
    // Ensure tables exist before seeding
    await ensureTablesExist();
    // Create countries
    const countries = [
      { name: "Peru", code: "PE", currency: "SOL" },
      { name: "Italy (Women)", code: "IT_F", currency: "EUR" },
      { name: "Italy (Men)", code: "IT_M", currency: "EUR" },
      { name: "Argentina", code: "AR", currency: "ARS" },
      { name: "Chile", code: "CL", currency: "CLP" },
    ];

    const createdCountries = [];
    for (const countryData of countries) {
      const country = await prisma.country.upsert({
        where: { code: countryData.code },
        update: {},
        create: countryData,
      });
      createdCountries.push(country);
    }

    // Create ad accounts for each country
    const adAccountTypes = [
      { name: "TRUST", agencyFeeRate: 0.09 },
      { name: "CROSSGIF", agencyFeeRate: 0.08 },
      { name: "FBM", agencyFeeRate: 0.08 },
    ];

    const createdAdAccounts = [];
    for (const country of createdCountries) {
      for (const accountType of adAccountTypes) {
        const existingAccount = await prisma.adAccount.findFirst({
          where: {
            countryId: country.id,
            name: accountType.name,
          },
        });

        if (!existingAccount) {
          const account = await prisma.adAccount.create({
            data: {
              name: accountType.name,
              agencyFeeRate: accountType.agencyFeeRate,
              countryId: country.id,
            },
          });
          createdAdAccounts.push(account);
        }
      }
    }

    // Create default settings
    const settings = [
      { key: "trust_agency_fee", value: "0.09", description: "TRUST agency fee rate (9%)" },
      { key: "crossgif_agency_fee", value: "0.08", description: "CROSSGIF agency fee rate (8%)" },
      { key: "fbm_agency_fee", value: "0.08", description: "FBM agency fee rate (8%)" },
      { key: "priemka_commission", value: "0.15", description: "Partner (Priemka) commission rate (15%)" },
      { key: "buyer_rate", value: "0.12", description: "Buyer payroll rate (12% of spend)" },
      { key: "rd_handler_rate", value: "0.04", description: "RD Handler payroll rate (4%)" },
      { key: "head_designer_fixed", value: "10", description: "Head Designer fixed rate ($10)" },
      { key: "fd_tier1_rate", value: "3", description: "FD Handler tier 1 rate (count < 5)" },
      { key: "fd_tier2_rate", value: "4", description: "FD Handler tier 2 rate (5-10)" },
      { key: "fd_tier3_rate", value: "5", description: "FD Handler tier 3 rate (10+)" },
      { key: "fd_bonus_threshold", value: "5", description: "FD bonus threshold (count >= 5)" },
      { key: "fd_bonus", value: "15", description: "FD bonus amount ($15)" },
      { key: "fd_multiplier", value: "1.2", description: "FD payroll multiplier" },
    ];

    for (const setting of settings) {
      await prisma.settings.upsert({
        where: { key: setting.key },
        update: { value: setting.value, description: setting.description },
        create: setting,
      });
    }

    // Create sample employees
    const employees = [
      { name: "Buyer Peru 1", role: "buyer", countryCode: "PE", percentRate: 0.12 },
      { name: "Buyer Peru 2", role: "buyer", countryCode: "PE", percentRate: 0.12 },
      { name: "Buyer Italy 1", role: "buyer", countryCode: "IT_F", percentRate: 0.12 },
      { name: "FD Handler 1", role: "fd_handler", countryCode: "PE" },
      { name: "FD Handler 2", role: "fd_handler", countryCode: "IT_F" },
      { name: "RD Handler 1", role: "rd_handler", countryCode: "PE", percentRate: 0.04 },
      { name: "Content Manager", role: "content", countryCode: null },
      { name: "Designer 1", role: "designer", countryCode: null },
      { name: "Head Designer", role: "head_designer", countryCode: null, fixedRate: 10 },
      { name: "Reviewer 1", role: "reviewer", countryCode: null },
    ];

    for (const emp of employees) {
      const country = emp.countryCode
        ? createdCountries.find(c => c.code === emp.countryCode)
        : null;

      const existingEmployee = await prisma.employee.findFirst({
        where: { name: emp.name },
      });

      if (!existingEmployee) {
        await prisma.employee.create({
          data: {
            name: emp.name,
            role: emp.role,
            countryId: country?.id || null,
            fixedRate: emp.fixedRate || null,
            percentRate: emp.percentRate || null,
          },
        });
      }
    }

    return NextResponse.json({
      message: "Database seeded successfully",
      countries: createdCountries.length,
      adAccounts: createdAdAccounts.length,
      settings: settings.length,
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
    // Ensure tables exist before checking
    await ensureTablesExist();

    const countriesCount = await prisma.country.count();
    const adAccountsCount = await prisma.adAccount.count();
    const settingsCount = await prisma.settings.count();
    const employeesCount = await prisma.employee.count();

    return NextResponse.json({
      seeded: countriesCount > 0,
      counts: {
        countries: countriesCount,
        adAccounts: adAccountsCount,
        settings: settingsCount,
        employees: employeesCount,
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
