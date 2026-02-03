// D7 Team Dashboard - Calculation Functions
// Based on Google Sheets formulas

// Country-specific settings for customizable calculations
export interface CountryCalculationSettings {
  priemkaCommissionRate?: number;  // Default 0.15 (15%)
  buyerPayrollRate?: number;       // Default 0.12 (12%)
  rdHandlerRate?: number;          // Default 0.04 (4%)
  fdTier1Rate?: number;            // Default 3
  fdTier2Rate?: number;            // Default 4
  fdTier3Rate?: number;            // Default 5
  fdBonusThreshold?: number;       // Default 5
  fdBonus?: number;                // Default 15
  fdMultiplier?: number;           // Default 1.2
  headDesignerFixed?: number;      // Default 10
  contentFixedRate?: number;       // Default 15
  designerFixedRate?: number;      // Default 20
  reviewerFixedRate?: number;      // Default 10
  chatterfyCostDefault?: number;   // Default 0
}

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
  
  // Optional country-specific settings
  countrySettings?: CountryCalculationSettings;
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

// Комиссия приёмки: 15% (или кастомное значение)
export function calculatePriemkaCommission(revenueUsdtPriemka: number, rate: number = 0.15): number {
  return revenueUsdtPriemka * rate;
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

// ФОТ обраб РД: 4% от суммы (или кастомное значение)
export function calculatePayrollRdHandler(rdSumUsdt: number, rate: number = 0.04): number {
  return rdSumUsdt * rate;
}

// ФОТ обраб ФД: тиры по количеству (с возможностью кастомизации)
// До 5 → $3, 5-10 → $4, 10+ → $5, + бонус $15 если >= 5
// Формула: (fdCount * IF(fdCount < 5, 3, IF(fdCount < 10, 4, 5)) + IF(fdCount >= 5, 15, 0)) * multiplier
export function calculatePayrollFdHandler(
  fdCount: number, 
  settings?: CountryCalculationSettings
): number {
  const tier1Rate = settings?.fdTier1Rate ?? 3;
  const tier2Rate = settings?.fdTier2Rate ?? 4;
  const tier3Rate = settings?.fdTier3Rate ?? 5;
  const bonusThreshold = settings?.fdBonusThreshold ?? 5;
  const bonus = settings?.fdBonus ?? 15;
  const multiplier = settings?.fdMultiplier ?? 1.2;

  let rate: number;
  if (fdCount < bonusThreshold) {
    rate = tier1Rate;
  } else if (fdCount < 10) {
    rate = tier2Rate;
  } else {
    rate = tier3Rate;
  }

  const bonusAmount = fdCount >= bonusThreshold ? bonus : 0;
  return (fdCount * rate + bonusAmount) * multiplier;
}

// ФОТ баер: 12% от спенда (или кастомное значение)
export function calculatePayrollBuyer(totalSpend: number, rate: number = 0.12): number {
  return totalSpend * rate;
}

// ROI%
export function calculateRoi(totalRevenue: number, totalExpenses: number): number {
  return totalExpenses > 0 ? (totalRevenue - totalExpenses) / totalExpenses : 0;
}

// Главная функция расчёта всех метрик
export function calculateAllMetrics(input: DailyMetricsInput): CalculatedMetrics {
  const settings = input.countrySettings;
  
  // Basic calculations
  const totalSpend = calculateTotalSpend(input.spendTrust, input.spendCrossgif, input.spendFbm);
  const agencyFee = calculateAgencyFee(input.spendTrust, input.spendCrossgif, input.spendFbm);

  // Exchange rates
  const exchangeRatePriemka = calculateExchangeRate(input.revenueLocalPriemka, input.revenueUsdtPriemka);
  const exchangeRateOwn = calculateExchangeRate(input.revenueLocalOwn, input.revenueUsdtOwn);

  // Commissions (use country-specific rate if available)
  const commissionPriemka = calculatePriemkaCommission(
    input.revenueUsdtPriemka, 
    settings?.priemkaCommissionRate ?? 0.15
  );

  // Revenue
  const totalRevenueUsdt = calculateTotalRevenue(input.revenueUsdtPriemka, input.revenueUsdtOwn);

  // FD/RD
  const fdSumUsdt = calculateFdSumUsdt(input.fdSumLocal, exchangeRateOwn);
  const rdSumLocal = calculateRdSum(input.revenueLocalOwn, input.fdSumLocal);
  const rdSumUsdt = exchangeRateOwn > 0 ? rdSumLocal / exchangeRateOwn : 0;

  // Payroll (use country-specific rates if available)
  const payrollRdHandler = calculatePayrollRdHandler(
    rdSumUsdt, 
    settings?.rdHandlerRate ?? 0.04
  );
  const payrollFdHandler = calculatePayrollFdHandler(input.fdCount, settings);
  const payrollBuyer = calculatePayrollBuyer(
    totalSpend, 
    settings?.buyerPayrollRate ?? 0.12
  );

  const payrollContent = input.payrollContent ?? 0;
  const payrollReviews = input.payrollReviews ?? 0;
  const payrollDesigner = input.payrollDesigner ?? 0;
  const payrollHeadDesigner = input.payrollHeadDesigner ?? (settings?.headDesignerFixed ?? 10);

  const totalPayroll = payrollRdHandler + payrollFdHandler + payrollBuyer +
                       payrollContent + payrollReviews + payrollDesigner + payrollHeadDesigner;

  // Additional expenses (use country-specific default if available)
  const chatterfyCost = input.chatterfyCost ?? (settings?.chatterfyCostDefault ?? 0);
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
