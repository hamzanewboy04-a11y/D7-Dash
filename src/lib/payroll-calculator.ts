import prisma from "@/lib/prisma";

export interface PayrollSettings {
  buyerRate: number;
  rdHandlerRate: number;
  headDesignerFixed: number;
  contentFixedRate: number;
  designerFixedRate: number;
  reviewerFixedRate: number;
  fdTier1Rate: number;
  fdTier2Rate: number;
  fdTier3Rate: number;
  fdBonusThreshold: number;
  fdBonus: number;
  fdMultiplier: number;
}

export interface EmployeePayrollResult {
  employeeId: string;
  employeeName: string;
  role: string;
  calculatedAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  activeProjects: number;
  details: {
    metric: string;
    value: number;
    rate: number;
    amount: number;
  }[];
}

async function getPayrollSettings(): Promise<PayrollSettings> {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: [
          "buyerRate",
          "rdHandlerRate",
          "headDesignerFixed",
          "contentFixedRate",
          "designerFixedRate",
          "reviewerFixedRate",
          "fdTier1Rate",
          "fdTier2Rate",
          "fdTier3Rate",
          "fdBonusThreshold",
          "fdBonus",
          "fdMultiplier",
        ],
      },
    },
  });

  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  return {
    buyerRate: parseFloat(settingsMap.get("buyerRate") || "12"),
    rdHandlerRate: parseFloat(settingsMap.get("rdHandlerRate") || "4"),
    headDesignerFixed: parseFloat(settingsMap.get("headDesignerFixed") || "10"),
    contentFixedRate: parseFloat(settingsMap.get("contentFixedRate") || "15"),
    designerFixedRate: parseFloat(settingsMap.get("designerFixedRate") || "20"),
    reviewerFixedRate: parseFloat(settingsMap.get("reviewerFixedRate") || "10"),
    fdTier1Rate: parseFloat(settingsMap.get("fdTier1Rate") || "3"),
    fdTier2Rate: parseFloat(settingsMap.get("fdTier2Rate") || "4"),
    fdTier3Rate: parseFloat(settingsMap.get("fdTier3Rate") || "5"),
    fdBonusThreshold: parseFloat(settingsMap.get("fdBonusThreshold") || "5"),
    fdBonus: parseFloat(settingsMap.get("fdBonus") || "15"),
    fdMultiplier: parseFloat(settingsMap.get("fdMultiplier") || "1.2"),
  };
}

export async function calculateEmployeePayroll(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<EmployeePayrollResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { country: true },
  });

  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`);
  }

  const settings = await getPayrollSettings();
  
  const whereClause: Record<string, unknown> = {
    date: {
      gte: startDate,
      lte: endDate,
    },
  };
  
  if (employee.countryId) {
    whereClause.countryId = employee.countryId;
  }

  const metrics = await prisma.dailyMetrics.findMany({
    where: whereClause,
    include: { country: true },
  });

  const payments = await prisma.payment.findMany({
    where: {
      employeeId,
      paymentDate: {
        gte: startDate,
        lte: endDate,
      },
      status: "paid",
    },
  });

  const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const details: { metric: string; value: number; rate: number; amount: number }[] = [];
  let calculatedAmount = 0;
  
  const activeCountries = new Set(metrics.filter(m => m.totalSpend > 0).map(m => m.countryId));
  const activeProjects = activeCountries.size || 1;
  const daysWithActivity = new Set(metrics.filter(m => m.totalSpend > 0).map(m => m.date.toISOString().split("T")[0])).size;

  switch (employee.role) {
    case "buyer": {
      const totalSpend = metrics.reduce((sum, m) => sum + m.totalSpend, 0);
      const rate = employee.percentRate || settings.buyerRate;
      calculatedAmount = totalSpend * (rate / 100);
      details.push({
        metric: "Спенд",
        value: totalSpend,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    case "rd_handler": {
      const rdSum = metrics.reduce((sum, m) => sum + m.rdSumUsdt, 0);
      const rate = employee.percentRate || settings.rdHandlerRate;
      calculatedAmount = rdSum * (rate / 100);
      details.push({
        metric: "Сумма РД",
        value: rdSum,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    case "fd_handler": {
      const fdCount = metrics.reduce((sum, m) => sum + m.fdCount, 0);
      
      // Use employee-level rates if set, otherwise fall back to global settings
      const tier1Rate = employee.fdTier1Rate ?? settings.fdTier1Rate;
      const tier2Rate = employee.fdTier2Rate ?? settings.fdTier2Rate;
      const tier3Rate = employee.fdTier3Rate ?? settings.fdTier3Rate;
      const bonusThreshold = employee.fdBonusThreshold ?? settings.fdBonusThreshold;
      const bonus = employee.fdBonus ?? settings.fdBonus;
      
      let rate = tier1Rate;
      if (fdCount >= 10) {
        rate = tier3Rate;
      } else if (fdCount >= 5) {
        rate = tier2Rate;
      }
      
      let amount = fdCount * rate;
      if (fdCount >= bonusThreshold) {
        amount += bonus;
      }
      amount *= settings.fdMultiplier;
      
      calculatedAmount = amount;
      details.push({
        metric: "Кол-во ФД",
        value: fdCount,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    case "content": {
      const rate = employee.fixedRate || settings.contentFixedRate;
      calculatedAmount = daysWithActivity * rate * activeProjects;
      details.push({
        metric: "Дней активности × Проекты",
        value: daysWithActivity * activeProjects,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    case "designer": {
      const rate = employee.fixedRate || settings.designerFixedRate;
      calculatedAmount = daysWithActivity * rate * activeProjects;
      details.push({
        metric: "Дней активности × Проекты",
        value: daysWithActivity * activeProjects,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    case "head_designer": {
      const rate = employee.fixedRate || settings.headDesignerFixed;
      calculatedAmount = daysWithActivity * rate;
      details.push({
        metric: "Дней активности",
        value: daysWithActivity,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    case "reviewer": {
      const rate = employee.fixedRate || settings.reviewerFixedRate;
      calculatedAmount = daysWithActivity * rate * activeProjects;
      details.push({
        metric: "Дней активности × Проекты",
        value: daysWithActivity * activeProjects,
        rate: rate,
        amount: calculatedAmount,
      });
      break;
    }

    default: {
      if (employee.fixedRate) {
        calculatedAmount = daysWithActivity * employee.fixedRate;
        details.push({
          metric: "Дней активности (фикс)",
          value: daysWithActivity,
          rate: employee.fixedRate,
          amount: calculatedAmount,
        });
      }
    }
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    role: employee.role,
    calculatedAmount: Math.round(calculatedAmount * 100) / 100,
    paidAmount: Math.round(paidAmount * 100) / 100,
    unpaidAmount: Math.round((calculatedAmount - paidAmount) * 100) / 100,
    activeProjects,
    details,
  };
}

export async function calculateAllEmployeesPayroll(
  startDate: Date,
  endDate: Date
): Promise<EmployeePayrollResult[]> {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
  });

  const results = await Promise.all(
    employees.map(emp => calculateEmployeePayroll(emp.id, startDate, endDate))
  );

  return results;
}
