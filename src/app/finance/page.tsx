"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RefreshCw, Loader2 } from "lucide-react";

interface DailyMetric {
  date: string;
  countryId: string;
  country: { name: string; code: string };
  totalSpend: number;
  totalRevenueUsdt: number;
  netProfitMath: number;
  totalExpensesUsdt: number;
  expensesWithoutSpend: number;
  agencyFee: number;
  commissionPriemka: number;
  totalPayroll: number;
  chatterfyCost: number;
  additionalExpenses: number;
  roi: number;
}

interface WeeklyData {
  week: string;
  weekStart: string;
  revenue: number;
  expenses: number;
  profit: number;
  roi: number;
}

interface CountryData {
  country: string;
  code: string;
  revenue: number;
  expenses: number;
  expensesWithoutSpend: number;
  spend: number;
  profit: number;
  roi: number;
}

interface ExpenseItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface AdditionalExpense {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  country: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface BuyerSummary {
  summary: {
    totalSpend: number;
    totalPayroll: number;
    totalFd: number;
    totalSubscriptions: number;
    avgConversionRate: number;
  };
  byBuyer: Array<{
    employeeId: string;
    buyerName: string;
    _sum: { spend: number; payrollAmount: number; fdCount: number };
  }>;
}

const COLORS = ["#6366f1", "#8b5cf6", "#f43f5e", "#f97316", "#eab308", "#64748b", "#10b981"];

export default function FinancePage() {
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);
  const [buyerSummary, setBuyerSummary] = useState<BuyerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, expensesRes, buyerRes] = await Promise.all([
        fetch("/api/metrics?limit=365&filterZeroSpend=false"),
        fetch("/api/expenses"),
        fetch("/api/buying/summary"),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setAdditionalExpenses(expensesData);
      }

      if (buyerRes.ok) {
        const buyerData = await buyerRes.json();
        setBuyerSummary(buyerData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate weekly P&L
  const getWeeklyData = (): WeeklyData[] => {
    const byWeek: Record<string, { revenue: number; expenses: number; profit: number; count: number }> = {};

    for (const m of metrics) {
      const date = new Date(m.date);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!byWeek[weekKey]) {
        byWeek[weekKey] = { revenue: 0, expenses: 0, profit: 0, count: 0 };
      }
      byWeek[weekKey].revenue += m.totalRevenueUsdt || 0;
      byWeek[weekKey].expenses += m.totalExpensesUsdt || 0;
      byWeek[weekKey].profit += m.netProfitMath || 0;
      byWeek[weekKey].count++;
    }

    return Object.entries(byWeek)
      .map(([weekStart, data]) => {
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return {
          weekStart,
          week: `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`,
          revenue: Math.round(data.revenue * 100) / 100,
          expenses: Math.round(data.expenses * 100) / 100,
          profit: Math.round(data.profit * 100) / 100,
          roi: data.expenses > 0 ? data.profit / data.expenses : 0,
        };
      })
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .slice(-8); // Last 8 weeks
  };

  // Calculate P&L by country
  const getCountryData = (): CountryData[] => {
    const byCountry: Record<string, {
      name: string;
      code: string;
      revenue: number;
      expenses: number;
      expensesWithoutSpend: number;
      spend: number;
      profit: number
    }> = {};

    for (const m of metrics) {
      const code = m.country.code;
      if (!byCountry[code]) {
        byCountry[code] = {
          name: m.country.name,
          code,
          revenue: 0,
          expenses: 0,
          expensesWithoutSpend: 0,
          spend: 0,
          profit: 0
        };
      }
      byCountry[code].revenue += m.totalRevenueUsdt || 0;
      byCountry[code].expenses += m.totalExpensesUsdt || 0;
      byCountry[code].expensesWithoutSpend += m.expensesWithoutSpend || 0;
      byCountry[code].spend += m.totalSpend || 0;
      byCountry[code].profit += m.netProfitMath || 0;
    }

    return Object.values(byCountry)
      .map(c => ({
        country: c.name,
        code: c.code,
        revenue: Math.round(c.revenue * 100) / 100,
        expenses: Math.round(c.expenses * 100) / 100,
        expensesWithoutSpend: Math.round(c.expensesWithoutSpend * 100) / 100,
        spend: Math.round(c.spend * 100) / 100,
        profit: Math.round(c.profit * 100) / 100,
        roi: c.expenses > 0 ? c.profit / c.expenses : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  };

  // Calculate expense breakdown
  const getExpenseBreakdown = (): ExpenseItem[] => {
    let totalSpend = 0;
    let totalAgencyFee = 0;
    let totalPayroll = 0;
    let totalCommission = 0;
    let totalChatterfy = 0;
    let totalOther = 0;

    for (const m of metrics) {
      totalSpend += m.totalSpend || 0;
      totalAgencyFee += m.agencyFee || 0;
      totalPayroll += m.totalPayroll || 0;
      totalCommission += m.commissionPriemka || 0;
      totalChatterfy += m.chatterfyCost || 0;
      totalOther += m.additionalExpenses || 0;
    }

    const buyerPayroll = buyerSummary?.summary?.totalPayroll || 0;

    return [
      { name: "Рекламный спенд", value: Math.round(totalSpend * 100) / 100, color: "#6366f1" },
      { name: "Комиссия агентства", value: Math.round(totalAgencyFee * 100) / 100, color: "#8b5cf6" },
      { name: "ФОТ (общий)", value: Math.round(totalPayroll * 100) / 100, color: "#f43f5e" },
      { name: "ФОТ Баеров", value: Math.round(buyerPayroll * 100) / 100, color: "#ec4899" },
      { name: "Комиссия приёмки", value: Math.round(totalCommission * 100) / 100, color: "#f97316" },
      { name: "Chatterfy", value: Math.round(totalChatterfy * 100) / 100, color: "#eab308" },
      { name: "Другое", value: Math.round(totalOther * 100) / 100, color: "#64748b" },
    ].filter(e => e.value > 0);
  };

  const weeklyData = getWeeklyData();
  const countryData = getCountryData();
  const expenseBreakdown = getExpenseBreakdown();

  const totalRevenue = metrics.reduce((s, m) => s + (m.totalRevenueUsdt || 0), 0);
  const totalExpenses = metrics.reduce((s, m) => s + (m.totalExpensesUsdt || 0), 0);
  const totalProfit = metrics.reduce((s, m) => s + (m.netProfitMath || 0), 0);
  const avgRoi = totalExpenses > 0 ? totalProfit / totalExpenses : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Финансы</h1>
          <p className="text-slate-500 mt-1">
            P&L отчёты, структура расходов и финансовая аналитика
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Общий доход
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">{metrics.length} дней</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Общие расходы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Спенд + ФОТ + прочее</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Чистая прибыль
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              ${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Доход - Расходы</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Средний ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgRoi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {(avgRoi * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Прибыль / Расходы</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="country">
        <TabsList>
          <TabsTrigger value="country">По странам</TabsTrigger>
          <TabsTrigger value="weekly">P&L по неделям</TabsTrigger>
          <TabsTrigger value="expenses">Структура расходов</TabsTrigger>
          <TabsTrigger value="additional">Доп. расходы</TabsTrigger>
        </TabsList>

        {/* By Country */}
        <TabsContent value="country" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>P&L по странам (всё время)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="country" type="category" stroke="#64748b" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Доход" fill="#10b981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="profit" name="Прибыль" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="expenses" name="Расходы" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Country Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Детали по странам</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Страна</TableHead>
                    <TableHead className="text-right">Доход</TableHead>
                    <TableHead className="text-right">Спенд</TableHead>
                    <TableHead className="text-right">Расх. без спенда</TableHead>
                    <TableHead className="text-right">Всего расходов</TableHead>
                    <TableHead className="text-right">Прибыль</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countryData.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="font-medium">{row.country}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        ${row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        ${row.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        ${row.expensesWithoutSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        ${row.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${row.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        ${row.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="default"
                          className={row.roi >= 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}
                        >
                          {(row.roi * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly P&L */}
        <TabsContent value="weekly" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Доход и расходы по неделям</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                        }}
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Доход" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Расходы" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Детали P&L по неделям</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Неделя</TableHead>
                      <TableHead className="text-right">Доход</TableHead>
                      <TableHead className="text-right">Расходы</TableHead>
                      <TableHead className="text-right">Прибыль</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyData.map((row) => (
                      <TableRow key={row.weekStart}>
                        <TableCell className="font-medium text-sm">{row.week}</TableCell>
                        <TableCell className="text-right text-emerald-600">
                          ${row.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ${row.expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right ${row.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          ${row.profit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="default"
                            className={row.roi >= 0 ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}
                          >
                            {(row.roi * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expense Breakdown */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Распределение расходов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expense Details */}
            <Card>
              <CardHeader>
                <CardTitle>Детали расходов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseBreakdown.map((expense) => {
                    const totalExp = expenseBreakdown.reduce((s, e) => s + e.value, 0);
                    return (
                      <div key={expense.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: expense.color }}
                          />
                          <span className="font-medium">{expense.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${expense.value.toLocaleString()}</p>
                          <p className="text-sm text-slate-500">
                            {((expense.value / totalExp) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Additional Expenses */}
        <TabsContent value="additional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Дополнительные расходы</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Все доп. расходы за всё время ({additionalExpenses.length} записей, ${additionalExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)})
              </p>
            </CardHeader>
            <CardContent>
              {additionalExpenses.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>Нет дополнительных расходов</p>
                  <p className="text-sm mt-2">Добавьте расходы через кнопку "Добавить расход" на главной странице</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Страна</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {additionalExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {new Date(expense.date).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {expense.category === "payroll" && "ФОТ"}
                            {expense.category === "commission" && "Комиссия"}
                            {expense.category === "chatterfy" && "Chatterfy"}
                            {expense.category === "tools" && "Инструменты"}
                            {expense.category === "accounts" && "Аккаунты"}
                            {expense.category === "proxies" && "Прокси"}
                            {expense.category === "hosting" && "Хостинг"}
                            {expense.category === "software" && "Софт/Подписки"}
                            {expense.category === "advertising" && "Реклама"}
                            {expense.category === "banking" && "Банковское"}
                            {expense.category === "communications" && "Связь"}
                            {expense.category === "office" && "Офис"}
                            {expense.category === "other" && "Другое"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expense.country ? expense.country.name : "Все страны"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          ${expense.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Summary by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Расходы по категориям</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["payroll", "commission", "chatterfy", "tools", "accounts", "proxies", "hosting", "software", "advertising", "banking", "communications", "office", "other"].map((cat) => {
                  const categoryExpenses = additionalExpenses.filter(e => e.category === cat);
                  const total = categoryExpenses.reduce((s, e) => s + e.amount, 0);
                  const categoryName = {
                    payroll: "ФОТ",
                    commission: "Комиссия",
                    chatterfy: "Chatterfy",
                    tools: "Инструменты",
                    accounts: "Аккаунты",
                    proxies: "Прокси",
                    hosting: "Хостинг",
                    software: "Софт/Подписки",
                    advertising: "Реклама",
                    banking: "Банковское",
                    communications: "Связь",
                    office: "Офис",
                    other: "Другое",
                  }[cat];

                  if (total === 0) return null;

                  return (
                    <div key={cat} className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                      <div>
                        <p className="font-medium">{categoryName}</p>
                        <p className="text-sm text-slate-500">{categoryExpenses.length} записей</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-600">${total.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Summary by Country */}
          {additionalExpenses.some(e => e.country) && (
            <Card>
              <CardHeader>
                <CardTitle>Расходы по странам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(new Set(additionalExpenses.map(e => e.country?.code).filter(Boolean))).map((code) => {
                    const countryExpenses = additionalExpenses.filter(e => e.country?.code === code);
                    const total = countryExpenses.reduce((s, e) => s + e.amount, 0);
                    const countryName = countryExpenses[0]?.country?.name;

                    return (
                      <div key={code} className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                        <div>
                          <p className="font-medium">{countryName}</p>
                          <p className="text-sm text-slate-500">{countryExpenses.length} расходов</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-600">${total.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
