-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "agencyFeeRate" REAL NOT NULL DEFAULT 0.08,
    "countryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdAccount_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "countryId" TEXT NOT NULL,
    "adAccountBalanceFact" REAL NOT NULL DEFAULT 0,
    "adAccountBalanceMath" REAL NOT NULL DEFAULT 0,
    "adAccountDeposit" REAL NOT NULL DEFAULT 0,
    "totalSpend" REAL NOT NULL DEFAULT 0,
    "agencyFee" REAL NOT NULL DEFAULT 0,
    "revenueLocalPriemka" REAL NOT NULL DEFAULT 0,
    "revenueUsdtPriemka" REAL NOT NULL DEFAULT 0,
    "exchangeRatePriemka" REAL NOT NULL DEFAULT 0,
    "commissionPriemka" REAL NOT NULL DEFAULT 0,
    "revenueLocalOwn" REAL NOT NULL DEFAULT 0,
    "revenueUsdtOwn" REAL NOT NULL DEFAULT 0,
    "exchangeRateOwn" REAL NOT NULL DEFAULT 0,
    "commissionExchange" REAL NOT NULL DEFAULT 0,
    "totalRevenueUsdt" REAL NOT NULL DEFAULT 0,
    "totalExpensesUsdt" REAL NOT NULL DEFAULT 0,
    "expensesWithoutSpend" REAL NOT NULL DEFAULT 0,
    "withdrawnFromOwn" REAL NOT NULL DEFAULT 0,
    "withdrawnFromPriemka" REAL NOT NULL DEFAULT 0,
    "balancePriemkaMath" REAL NOT NULL DEFAULT 0,
    "balanceOwnMath" REAL NOT NULL DEFAULT 0,
    "balancePriemkaFact" REAL NOT NULL DEFAULT 0,
    "balanceOwnFact" REAL NOT NULL DEFAULT 0,
    "fdCount" INTEGER NOT NULL DEFAULT 0,
    "nfdCount" INTEGER NOT NULL DEFAULT 0,
    "fdSumLocal" REAL NOT NULL DEFAULT 0,
    "nfdSumLocal" REAL NOT NULL DEFAULT 0,
    "fdSumUsdt" REAL NOT NULL DEFAULT 0,
    "nfdSumUsdt" REAL NOT NULL DEFAULT 0,
    "rdCount" INTEGER NOT NULL DEFAULT 0,
    "rdSumLocal" REAL NOT NULL DEFAULT 0,
    "rdSumUsdt" REAL NOT NULL DEFAULT 0,
    "payrollRdHandler" REAL NOT NULL DEFAULT 0,
    "payrollFdHandler" REAL NOT NULL DEFAULT 0,
    "payrollContent" REAL NOT NULL DEFAULT 0,
    "payrollReviews" REAL NOT NULL DEFAULT 0,
    "payrollDesigner" REAL NOT NULL DEFAULT 0,
    "payrollBuyer" REAL NOT NULL DEFAULT 0,
    "payrollHeadDesigner" REAL NOT NULL DEFAULT 0,
    "totalPayroll" REAL NOT NULL DEFAULT 0,
    "unpaidPayroll" REAL NOT NULL DEFAULT 0,
    "paidPayroll" REAL NOT NULL DEFAULT 0,
    "chatterfyCost" REAL NOT NULL DEFAULT 0,
    "additionalExpenses" REAL NOT NULL DEFAULT 0,
    "netProfitMath" REAL NOT NULL DEFAULT 0,
    "netProfitFact" REAL NOT NULL DEFAULT 0,
    "roi" REAL NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "costPerClick" REAL NOT NULL DEFAULT 0,
    "subscriptions" INTEGER NOT NULL DEFAULT 0,
    "dialogs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyMetrics_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyAdSpend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "dailyMetricsId" TEXT NOT NULL,
    "spend" REAL NOT NULL DEFAULT 0,
    "deposit" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyAdSpend_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyAdSpend_dailyMetricsId_fkey" FOREIGN KEY ("dailyMetricsId") REFERENCES "DailyMetrics" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "countryId" TEXT,
    "fixedRate" REAL,
    "percentRate" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekStart" DATETIME NOT NULL,
    "weekEnd" DATETIME NOT NULL,
    "countryId" TEXT,
    "totalSpend" REAL NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "totalPayroll" REAL NOT NULL DEFAULT 0,
    "additionalExp" REAL NOT NULL DEFAULT 0,
    "pnlMath" REAL NOT NULL DEFAULT 0,
    "pnlFact" REAL NOT NULL DEFAULT 0,
    "totalExpenses" REAL NOT NULL DEFAULT 0,
    "roi" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MonthlySummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "countryId" TEXT,
    "totalSpend" REAL NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "totalPayroll" REAL NOT NULL DEFAULT 0,
    "additionalExp" REAL NOT NULL DEFAULT 0,
    "pnlMath" REAL NOT NULL DEFAULT 0,
    "pnlFact" REAL NOT NULL DEFAULT 0,
    "totalExpenses" REAL NOT NULL DEFAULT 0,
    "roi" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_idx" ON "DailyMetrics"("date");

-- CreateIndex
CREATE INDEX "DailyMetrics_countryId_idx" ON "DailyMetrics"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_date_countryId_key" ON "DailyMetrics"("date", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAdSpend_date_adAccountId_key" ON "DailyAdSpend"("date", "adAccountId");

-- CreateIndex
CREATE INDEX "PayrollRecord_date_idx" ON "PayrollRecord"("date");

-- CreateIndex
CREATE INDEX "PayrollRecord_employeeId_idx" ON "PayrollRecord"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySummary_weekStart_countryId_key" ON "WeeklySummary"("weekStart", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySummary_year_month_countryId_key" ON "MonthlySummary"("year", "month", "countryId");
