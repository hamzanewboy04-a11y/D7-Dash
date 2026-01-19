// D7 Team Dashboard - Calculation Functions
// Based on Google Sheets formulas

export interface DailyMetricsInput {
  // Ad Account Spends
  spendTrust: number;
  spendCrossgif: number;
  spendFbm: number;

  // Revenue Priemka (Partner)
  revenueLocalPriemka: number;
  revenueUsdtPriemka: number;

  // Revenue Own
  revenueLocalOwn: number;
  revenueUsdtOwn: number;

  // FD/RD counts
  fdCount: number;
  fdSumLocal: number;

  // Optional manual inputs
  payrollContent?: number;
  payrollReviews?: number;
  payrollDesigner?: number;
  payrollHeadDesigner?: number;
  chatterfyCost?: number;
  additionalExpenses?: number;
}

export interface CalculatedMetrics {
  // Spend
  totalSpend: number;
  agencyFee: number;

  // Exchange rates
  exchangeRatePriemka: number;
  exchangeRateOwn: number;

  // Commissions
  commissionPriemka: number; // 15%

  // Revenue
  totalRevenueUsdt: number;

  // FD/RD calculations
  fdSumUsdt: number;
  rdSumLocal: number;
  rdSumUsdt: number;

  // Payroll (ФОТ)
  payrollRdHandler: number;  // 4% of RD
  payrollFdHandler: number;  // Tiered based on FD count
  payrollBuyer: number;      // 12% of spend
  totalPayroll: number;

  // Expenses
  totalExpensesUsdt: number;
  expensesWithoutSpend: number;

  // Profit
  netProfitMath: number;
  roi: number;
}

// Комиссия агентства: ТРАСТ 9%, остальные 8%
export function calculateAgencyFee(spendTrust: number, spendCrossgif: number, spendFbm: number): number {
  return spendTrust * 0.09 + spendCrossgif * 0.08 + spendFbm * 0.08;
}

// Общий спенд
export function calculateTotalSpend(spendTrust: number, spendCrossgif: number, spendFbm: number): number {
  return spendTrust + spendCrossgif + spendFbm;
}

// Курс обмена: Local / USDT
export function calculateExchangeRate(local: number, usdt: number): number {
  return usdt > 0 ? local / usdt : 0;
}

// Комиссия приёмки: 15%
export function calculatePriemkaCommission(revenueUsdtPriemka: number): number {
  return revenueUsdtPriemka * 0.15;
}

// Общий доход USDT
export function calculateTotalRevenue(revenueUsdtPriemka: number, revenueUsdtOwn: number): number {
  return revenueUsdtPriemka + revenueUsdtOwn;
}

// ФД сумма в USDT
export function calculateFdSumUsdt(fdSumLocal: number, exchangeRateOwn: number): number {
  return exchangeRateOwn > 0 ? fdSumLocal / exchangeRateOwn : 0;
}

// РД сумма = Доход наш - ФД сумма
export function calculateRdSum(revenueLocalOwn: number, fdSumLocal: number): number {
  return revenueLocalOwn - fdSumLocal;
}

// ФОТ обраб РД: 4% от суммы
export function calculatePayrollRdHandler(rdSumUsdt: number): number {
  return rdSumUsdt * 0.04;
}

// ФОТ обраб ФД: тиры по количеству
// До 5 → $3, 5-10 → $4, 10+ → $5, + бонус $15 если >= 5
// Формула: (fdCount * IF(fdCount < 5, 3, IF(fdCount < 10, 4, 5)) + IF(fdCount >= 5, 15, 0)) * multiplier
export function calculatePayrollFdHandler(fdCount: number, multiplier: number = 1.2): number {
  let rate: number;
  if (fdCount < 5) {
    rate = 3;
  } else if (fdCount < 10) {
    rate = 4;
  } else {
    rate = 5;
  }

  const bonus = fdCount >= 5 ? 15 : 0;
  return (fdCount * rate + bonus) * multiplier;
}

// ФОТ баер: 12% от спенда
export function calculatePayrollBuyer(totalSpend: number): number {
  return totalSpend * 0.12;
}

// ROI%
export function calculateRoi(totalRevenue: number, totalExpenses: number): number {
  return totalExpenses > 0 ? (totalRevenue - totalExpenses) / totalExpenses : 0;
}

// Главная функция расчёта всех метрик
export function calculateAllMetrics(input: DailyMetricsInput): CalculatedMetrics {
  // Basic calculations
  const totalSpend = calculateTotalSpend(input.spendTrust, input.spendCrossgif, input.spendFbm);
  const agencyFee = calculateAgencyFee(input.spendTrust, input.spendCrossgif, input.spendFbm);

  // Exchange rates
  const exchangeRatePriemka = calculateExchangeRate(input.revenueLocalPriemka, input.revenueUsdtPriemka);
  const exchangeRateOwn = calculateExchangeRate(input.revenueLocalOwn, input.revenueUsdtOwn);

  // Commissions
  const commissionPriemka = calculatePriemkaCommission(input.revenueUsdtPriemka);

  // Revenue
  const totalRevenueUsdt = calculateTotalRevenue(input.revenueUsdtPriemka, input.revenueUsdtOwn);

  // FD/RD
  const fdSumUsdt = calculateFdSumUsdt(input.fdSumLocal, exchangeRateOwn);
  const rdSumLocal = calculateRdSum(input.revenueLocalOwn, input.fdSumLocal);
  const rdSumUsdt = exchangeRateOwn > 0 ? rdSumLocal / exchangeRateOwn : 0;

  // Payroll
  const payrollRdHandler = calculatePayrollRdHandler(rdSumUsdt);
  const payrollFdHandler = calculatePayrollFdHandler(input.fdCount);
  const payrollBuyer = calculatePayrollBuyer(totalSpend);

  const payrollContent = input.payrollContent ?? 0;
  const payrollReviews = input.payrollReviews ?? 0;
  const payrollDesigner = input.payrollDesigner ?? 0;
  const payrollHeadDesigner = input.payrollHeadDesigner ?? 10; // Default $10

  const totalPayroll = payrollRdHandler + payrollFdHandler + payrollBuyer +
                       payrollContent + payrollReviews + payrollDesigner + payrollHeadDesigner;

  // Additional expenses
  const chatterfyCost = input.chatterfyCost ?? 0;
  const additionalExpenses = input.additionalExpenses ?? 0;

  // Total expenses: Commission + Spend + Agency Fee + Payroll + Additional
  const totalExpensesUsdt = commissionPriemka + totalSpend + agencyFee + totalPayroll +
                            chatterfyCost + additionalExpenses;
  const expensesWithoutSpend = totalExpensesUsdt - totalSpend;

  // Net profit (математика): TotalRevenue - TotalExpenses
  // Доход (Приемка + Наш) - Комиссия приемки - Спенд - Комиссия агентства - ФОТ - Доп расходы
  const netProfitMath = totalRevenueUsdt - totalExpensesUsdt;

  // ROI
  const roi = calculateRoi(totalRevenueUsdt, totalExpensesUsdt);

  return {
    totalSpend,
    agencyFee,
    exchangeRatePriemka,
    exchangeRateOwn,
    commissionPriemka,
    totalRevenueUsdt,
    fdSumUsdt,
    rdSumLocal,
    rdSumUsdt,
    payrollRdHandler,
    payrollFdHandler,
    payrollBuyer,
    totalPayroll,
    totalExpensesUsdt,
    expensesWithoutSpend,
    netProfitMath,
    roi,
  };
}

// Форматирование чисел
export function formatCurrency(value: number, currency: string = "USDT"): string {
  return `${value.toFixed(2)} ${currency}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
