"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CountrySummary } from "@/components/dashboard/country-summary";
import { MotivationalCard } from "@/components/dashboard/motivational-card";
import { Achievements } from "@/components/dashboard/achievements";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  RefreshCw,
  Database,
  Wallet,
  Plus,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  PartyPopper,
} from "lucide-react";

interface DashboardData {
  totals: {
    revenue: number;
    expenses: number;
    spend: number;
    expensesWithoutSpend: number;
    payroll: number;
    profit: number;
    roi: number;
  };
  byCountry: Array<{
    name: string;
    code: string;
    revenue: number;
    spend: number;
    expenses: number;
    profit: number;
    roi: number;
  }>;
  dailyData: Array<{
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  countries: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

interface YesterdayData {
  date: string;
  revenue: number;
  spend: number;
  expenses: number;
  profit: number;
  fdCount: number;
  rdSumUsdt: number;
  countries: Array<{
    name: string;
    code: string;
    revenue: number;
    spend: number;
    profit: number;
  }>;
}

// Fallback demo data
const mockChartData = [
  { date: "1 дек", revenue: 2364.89, expenses: 1138.09, profit: 1226.80 },
  { date: "2 дек", revenue: 658.71, expenses: 880.12, profit: -221.41 },
  { date: "3 дек", revenue: 1753.99, expenses: 723.03, profit: 1030.96 },
  { date: "4 дек", revenue: 1450.50, expenses: 890.25, profit: 560.25 },
  { date: "5 дек", revenue: 2100.00, expenses: 950.00, profit: 1150.00 },
  { date: "6 дек", revenue: 1890.00, expenses: 1100.00, profit: 790.00 },
  { date: "7 дек", revenue: 2500.00, expenses: 1200.00, profit: 1300.00 },
];

const mockCountryData = [
  { name: "Peru", code: "PE", revenue: 8500, spend: 4200, profit: 2100, roi: 0.25 },
  { name: "Italy (Women)", code: "IT_F", revenue: 6200, spend: 3100, profit: 1500, roi: 0.24 },
  { name: "Italy (Men)", code: "IT_M", revenue: 4800, spend: 2900, profit: 900, roi: 0.19 },
  { name: "Argentina", code: "AR", revenue: 3500, spend: 2100, profit: 700, roi: 0.20 },
  { name: "Chile", code: "CL", revenue: 2800, spend: 1800, profit: 400, roi: 0.14 },
];

const expenseCategories = [
  { value: "payroll", label: "ФОТ" },
  { value: "commission", label: "Комиссия" },
  { value: "chatterfy", label: "Chatterfy" },
  { value: "tools", label: "Инструменты" },
  { value: "other", label: "Другое" },
];

const PERIOD_OPTIONS = [
  { value: "7", label: "7 дней" },
  { value: "14", label: "14 дней" },
  { value: "30", label: "30 дней" },
  { value: "90", label: "90 дней" },
  { value: "365", label: "Всё время" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [yesterdayData, setYesterdayData] = useState<YesterdayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  // Expense dialog state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
    category: "other",
    countryId: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  const fetchDashboardData = async (days: string = selectedPeriod) => {
    try {
      const response = await fetch(`/api/dashboard?days=${days}`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setLoading(true);
    fetchDashboardData(value);
  };

  const fetchYesterdayData = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0];

      const response = await fetch(`/api/metrics?date=${dateStr}&filterZeroSpend=false`);
      if (response.ok) {
        const metrics = await response.json();

        if (metrics && metrics.length > 0) {
          const byCountry: Record<string, { name: string; code: string; revenue: number; spend: number; profit: number }> = {};

          let totalRevenue = 0;
          let totalSpend = 0;
          let totalExpenses = 0;
          let totalProfit = 0;
          let totalFdCount = 0;
          let totalRdSum = 0;

          for (const m of metrics) {
            totalRevenue += m.totalRevenueUsdt || 0;
            totalSpend += m.totalSpend || 0;
            totalExpenses += m.totalExpensesUsdt || 0;
            totalProfit += m.netProfitMath || 0;
            totalFdCount += m.fdCount || 0;
            totalRdSum += m.rdSumUsdt || 0;

            const code = m.country?.code;
            if (code) {
              if (!byCountry[code]) {
                byCountry[code] = {
                  name: m.country.name,
                  code,
                  revenue: 0,
                  spend: 0,
                  profit: 0,
                };
              }
              byCountry[code].revenue += m.totalRevenueUsdt || 0;
              byCountry[code].spend += m.totalSpend || 0;
              byCountry[code].profit += m.netProfitMath || 0;
            }
          }

          setYesterdayData({
            date: dateStr,
            revenue: totalRevenue,
            spend: totalSpend,
            expenses: totalExpenses,
            profit: totalProfit,
            fdCount: totalFdCount,
            rdSumUsdt: totalRdSum,
            countries: Object.values(byCountry),
          });
        }
      }
    } catch (error) {
      console.error("Error fetching yesterday data:", error);
    }
  };

  const checkSeeded = async () => {
    try {
      const response = await fetch("/api/countries");
      if (response.ok) {
        const countries = await response.json();
        setIsSeeded(countries && countries.length > 0);
      }
    } catch {
      setIsSeeded(false);
    }
  };

  const seedDatabase = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/seed", { method: "POST" });
      if (response.ok) {
        setIsSeeded(true);
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error seeding database:", error);
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) {
      return;
    }

    setSavingExpense(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: expenseForm.date,
          amount: expenseForm.amount,
          description: expenseForm.description,
          category: expenseForm.category,
          countryId: expenseForm.countryId || null,
        }),
      });

      if (response.ok) {
        setExpenseDialogOpen(false);
        setExpenseForm({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          description: "",
          category: "other",
          countryId: "",
        });
        // Refresh data
        fetchDashboardData();
        fetchYesterdayData();
      }
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setSavingExpense(false);
    }
  };

  useEffect(() => {
    checkSeeded();
    fetchDashboardData();
    fetchYesterdayData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasData = data && data.dailyData && data.dailyData.length > 0;
  const chartData = hasData ? data.dailyData : mockChartData;
  const countryData = hasData ? data.byCountry : mockCountryData;

  const totals = hasData
    ? data.totals
    : {
        revenue: mockCountryData.reduce((sum, c) => sum + c.revenue, 0),
        spend: mockCountryData.reduce((sum, c) => sum + c.spend, 0),
        profit: mockCountryData.reduce((sum, c) => sum + c.profit, 0),
        payroll: 3450,
        expensesWithoutSpend: 3450,
        roi: 0,
      };

  if (!hasData) {
    totals.roi = totals.spend > 0 ? ((totals.profit / totals.spend) * 100) : 0;
  }

  // Find best performing country
  const bestCountry = [...countryData].sort((a, b) => b.roi - a.roi)[0];

  // Format yesterday's date
  const yesterdayFormatted = yesterdayData
    ? new Date(yesterdayData.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Дашборд</h1>
          <p className="text-slate-500 mt-1">
            Обзор всех стран и ключевых показателей
            {!hasData && <span className="text-orange-500 ml-2">(Демо данные)</span>}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setExpenseDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Внести расход
          </Button>
          <Button onClick={() => fetchDashboardData()} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Motivational Card */}
      <MotivationalCard
        profitableDaysStreak={chartData.filter((d) => d.profit > 0).length}
        roi={totals.roi}
        monthlyGoal={10000}
        currentMonthlyProfit={totals.profit}
        dailyGoal={500}
        currentDailyProfit={yesterdayData?.profit || 0}
      />

      {/* Congratulations Message */}
      {totals.profit > 0 && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border-2 border-blue-200 rounded-xl">
          <PartyPopper className="h-8 w-8 text-blue-500" />
          <div>
            <p className="font-bold text-blue-700">Поздравляем! Вы в плюсе! 🎉</p>
            <p className="text-sm text-blue-600">
              Прибыль за период: ${totals.profit.toLocaleString()}. Продолжайте в том же духе!
            </p>
          </div>
        </div>
      )}

      {/* Yesterday Summary */}
      {yesterdayData && (
        <Card className="border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-500" />
                  Итоги за вчера ({yesterdayFormatted})
                </CardTitle>
                <CardDescription>Краткая сводка по всем странам</CardDescription>
              </div>
              <div className={`text-2xl font-bold ${yesterdayData.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {yesterdayData.profit >= 0 ? (
                  <span className="flex items-center">
                    <ArrowUpRight className="h-6 w-6 mr-1" />
                    +${yesterdayData.profit.toFixed(2)}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ArrowDownRight className="h-6 w-6 mr-1" />
                    ${yesterdayData.profit.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-slate-500">Доход</p>
                <p className="text-xl font-bold text-emerald-600">${yesterdayData.revenue.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-slate-500">Спенд</p>
                <p className="text-xl font-bold text-blue-600">${yesterdayData.spend.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-slate-500">Расходы</p>
                <p className="text-xl font-bold text-orange-600">${yesterdayData.expenses.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-slate-500">ФД количество</p>
                <p className="text-xl font-bold">{yesterdayData.fdCount}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-slate-500">РД сумма</p>
                <p className="text-xl font-bold">${yesterdayData.rdSumUsdt.toFixed(2)}</p>
              </div>
            </div>

            {yesterdayData.countries.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-slate-600 mb-2">По странам:</p>
                <div className="flex flex-wrap gap-2">
                  {yesterdayData.countries.map((c) => (
                    <div
                      key={c.code}
                      className={`px-3 py-1 rounded-full text-sm ${
                        c.profit >= 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.name}: {c.profit >= 0 ? "+" : ""}${c.profit.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Общий доход"
          value={`$${totals.revenue.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Спенд"
          value={`$${totals.spend.toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-blue-500"
        />
        <MetricCard
          title="Расх. без спенда"
          value={`$${(totals.expensesWithoutSpend || 0).toLocaleString()}`}
          icon={Wallet}
          iconColor="text-orange-500"
        />
        <MetricCard
          title="Чистая прибыль"
          value={`$${totals.profit.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-purple-500"
        />
        <MetricCard
          title="ROI"
          value={`${typeof totals.roi === 'number' ? totals.roi.toFixed(1) : '0'}%`}
          icon={Users}
          iconColor="text-amber-500"
        />
      </div>

      {/* Achievements Section */}
      <Achievements
        totalProfit={totals.profit}
        profitableDaysStreak={chartData.filter((d) => d.profit > 0).length}
        roi={totals.roi}
        activeCountries={data?.countries?.length || 5}
        totalRevenue={totals.revenue}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData} title="Доходы и расходы по дням" />
        <CountrySummary countries={countryData} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Лучшая страна</h3>
          <p className="text-3xl font-bold mt-2">
            {bestCountry?.name || "Peru"} {bestCountry?.code === "PE" ? "🇵🇪" : bestCountry?.code === "IT_F" || bestCountry?.code === "IT_M" ? "🇮🇹" : bestCountry?.code === "AR" ? "🇦🇷" : bestCountry?.code === "CL" ? "🇨🇱" : "🌍"}
          </p>
          <p className="text-sm opacity-75 mt-1">
            ROI: {((bestCountry?.roi || 0) * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Общий ФОТ</h3>
          <p className="text-3xl font-bold mt-2">${(totals.payroll || 0).toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">За этот месяц</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Активных стран</h3>
          <p className="text-3xl font-bold mt-2">{data?.countries?.length || 5}</p>
          <p className="text-sm opacity-75 mt-1">Все работают</p>
        </div>
      </div>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Внести расход</DialogTitle>
            <DialogDescription>
              Добавьте дополнительный расход. Он будет записан на указанную дату.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-date">Дата</Label>
              <Input
                id="expense-date"
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Сумма ($)</Label>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">Назначение</Label>
              <Textarea
                id="expense-description"
                placeholder="Опишите расход..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-category">Категория</Label>
              <Select
                value={expenseForm.category}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-country">Страна (опционально)</Label>
              <Select
                value={expenseForm.countryId || undefined}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, countryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Все страны" />
                </SelectTrigger>
                <SelectContent>
                  {data?.countries?.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveExpense} disabled={savingExpense || !expenseForm.amount || !expenseForm.description}>
              {savingExpense ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
