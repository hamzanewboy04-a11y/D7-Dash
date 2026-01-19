"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, TrendingUp, TrendingDown, RefreshCw, Database, X, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  isActive: boolean;
  adAccounts: Array<{
    id: string;
    name: string;
    agencyFeeRate: number;
  }>;
  _count: {
    dailyMetrics: number;
    employees: number;
  };
}

interface DailyMetric {
  id: string;
  date: string;
  // Spend breakdown
  totalSpend: number;
  spendTrust: number;
  spendCrossgif: number;
  spendFbm: number;
  agencyFee: number;
  // Revenue breakdown
  revenueLocalPriemka: number;
  revenueUsdtPriemka: number;
  revenueLocalOwn: number;
  revenueUsdtOwn: number;
  totalRevenueUsdt: number;
  commissionPriemka: number;
  // Payroll breakdown
  payrollRdHandler: number;
  payrollFdHandler: number;
  payrollBuyer: number;
  payrollContent: number;
  payrollReviews: number;
  payrollDesigner: number;
  payrollHeadDesigner: number;
  totalPayroll: number;
  // FD/RD
  fdCount: number;
  fdSumLocal: number;
  fdSumUsdt: number;
  nfdCount: number;
  nfdSumLocal: number;
  nfdSumUsdt: number;
  rdCount: number;
  rdSumLocal: number;
  rdSumUsdt: number;
  // Additional
  chatterfyCost: number;
  additionalExpenses: number;
  // Totals
  totalExpensesUsdt: number;
  expensesWithoutSpend: number;
  netProfitMath: number;
  roi: number;
  country: {
    name: string;
    code: string;
    currency: string;
  };
}

// Названия стран на русском
const countryNames: Record<string, string> = {
  "Peru": "Перу",
  "Italy (Women)": "Италия (Ж)",
  "Italy (Men)": "Италия (М)",
  "Argentina": "Аргентина",
  "Chile": "Чили",
};

const getCountryFlag = (code: string): string => {
  const flags: Record<string, string> = {
    PE: "🇵🇪",
    IT_F: "🇮🇹",
    IT_M: "🇮🇹",
    AR: "🇦🇷",
    CL: "🇨🇱",
  };
  return flags[code] || "🌍";
};

const getCountryNameRu = (name: string): string => {
  return countryNames[name] || name;
};

// Detail Panel Component
function MetricDetailPanel({ metric, onClose }: { metric: DailyMetric; onClose: () => void }) {
  const currency = metric.country?.currency || "USDT";

  return (
    <div className="bg-slate-50 border-t border-b p-6 space-y-6">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold">
          Детализация за {new Date(metric.date).toLocaleDateString("ru-RU")}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Доходы */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700">Доходы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Приёмка (локал):</span>
              <span className="font-medium">{metric.revenueLocalPriemka.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Приёмка (USDT):</span>
              <span className="font-medium">${metric.revenueUsdtPriemka.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Наш (локал):</span>
              <span className="font-medium">{metric.revenueLocalOwn.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Наш (USDT):</span>
              <span className="font-medium">${metric.revenueUsdtOwn.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-emerald-700">
              <span>Итого доход:</span>
              <span>${metric.totalRevenueUsdt.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Расходы на рекламу */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-700">Расходы на рекламу</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">TRUST:</span>
              <span className="font-medium">${(metric.spendTrust || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Кросгиф:</span>
              <span className="font-medium">${(metric.spendCrossgif || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">FBM:</span>
              <span className="font-medium">${(metric.spendFbm || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Комиссия агентства:</span>
              <span className="font-medium">${metric.agencyFee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-blue-700">
              <span>Итого спенд:</span>
              <span>${metric.totalSpend.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ФОТ */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700">ФОТ (Фонд оплаты труда)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Баер (12% спенда):</span>
              <span className="font-medium">${metric.payrollBuyer.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Обработчик ФД:</span>
              <span className="font-medium">${metric.payrollFdHandler.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Обработчик РД (4%):</span>
              <span className="font-medium">${metric.payrollRdHandler.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Контент:</span>
              <span className="font-medium">${(metric.payrollContent || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Хед дизайнер:</span>
              <span className="font-medium">${(metric.payrollHeadDesigner || 10).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold text-purple-700">
              <span>Итого ФОТ:</span>
              <span>${metric.totalPayroll.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Комиссии и доп расходы */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-700">Комиссии и доп. расходы</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Комиссия приёмки (15%):</span>
              <span className="font-medium">${metric.commissionPriemka.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Chatterfy:</span>
              <span className="font-medium">${(metric.chatterfyCost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Доп. расходы:</span>
              <span className="font-medium">${(metric.additionalExpenses || 0).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* ФД/РД */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-700">ФД / нФД / РД</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">ФД количество:</span>
              <span className="font-medium">{metric.fdCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ФД сумма (локал):</span>
              <span className="font-medium">{metric.fdSumLocal.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ФД сумма (USDT):</span>
              <span className="font-medium">${metric.fdSumUsdt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">нФД количество:</span>
              <span className="font-medium">{metric.nfdCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">нФД сумма (USDT):</span>
              <span className="font-medium">${(metric.nfdSumUsdt || 0).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-slate-600">РД количество:</span>
                <span className="font-medium">{metric.rdCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">РД сумма (локал):</span>
                <span className="font-medium">{(metric.rdSumLocal || 0).toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">РД сумма (USDT):</span>
                <span className="font-medium">${metric.rdSumUsdt.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Итого */}
        <Card className="bg-white border-2 border-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Итоговый расчёт</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between text-emerald-700">
              <span>Общий доход:</span>
              <span className="font-medium">${metric.totalRevenueUsdt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Общие расходы:</span>
              <span className="font-medium">${metric.totalExpensesUsdt.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span className={metric.netProfitMath >= 0 ? "text-emerald-700" : "text-red-600"}>
                Чистая прибыль:
              </span>
              <span className={metric.netProfitMath >= 0 ? "text-emerald-700" : "text-red-600"}>
                ${metric.netProfitMath.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ROI:</span>
              <span className={`font-medium ${metric.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {(metric.roi * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Interface for aggregated "all geo" metrics by date
interface AggregatedMetric {
  date: string;
  totalSpend: number;
  totalRevenueUsdt: number;
  totalExpensesUsdt: number;
  expensesWithoutSpend: number;
  netProfitMath: number;
  roi: number;
  fdCount: number;
  rdCount: number;
  countries: Array<{
    code: string;
    name: string;
    spend: number;
    revenue: number;
    profit: number;
  }>;
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [allMetrics, setAllMetrics] = useState<AggregatedMetric[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const response = await fetch("/api/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch and aggregate all metrics for "Все гео" tab
  const fetchAllMetrics = async () => {
    setMetricsLoading(true);
    setExpandedRow(null);
    try {
      const response = await fetch("/api/metrics?limit=30");
      if (response.ok) {
        const data: DailyMetric[] = await response.json();

        // Group by date and aggregate
        const byDate: Record<string, DailyMetric[]> = {};
        data.forEach((m) => {
          const dateKey = m.date.split("T")[0];
          if (!byDate[dateKey]) byDate[dateKey] = [];
          byDate[dateKey].push(m);
        });

        // Aggregate
        const aggregated: AggregatedMetric[] = Object.entries(byDate)
          .map(([date, items]) => ({
            date,
            totalSpend: items.reduce((s, m) => s + m.totalSpend, 0),
            totalRevenueUsdt: items.reduce((s, m) => s + m.totalRevenueUsdt, 0),
            totalExpensesUsdt: items.reduce((s, m) => s + m.totalExpensesUsdt, 0),
            expensesWithoutSpend: items.reduce((s, m) => s + m.expensesWithoutSpend, 0),
            netProfitMath: items.reduce((s, m) => s + m.netProfitMath, 0),
            roi: items.reduce((s, m) => s + m.totalSpend, 0) > 0
              ? items.reduce((s, m) => s + m.netProfitMath, 0) / items.reduce((s, m) => s + m.totalSpend, 0)
              : 0,
            fdCount: items.reduce((s, m) => s + m.fdCount, 0),
            rdCount: items.reduce((s, m) => s + m.rdCount, 0),
            countries: items.map((m) => ({
              code: m.country?.code || "",
              name: m.country?.name || "",
              spend: m.totalSpend,
              revenue: m.totalRevenueUsdt,
              profit: m.netProfitMath,
            })),
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setAllMetrics(aggregated);
      }
    } catch (error) {
      console.error("Error fetching all metrics:", error);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch metrics for selected country
  const fetchMetrics = async (countryId: string) => {
    if (!countryId) return;
    setMetricsLoading(true);
    setExpandedRow(null);
    try {
      const response = await fetch(`/api/metrics?countryId=${countryId}&limit=30`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Check if database is seeded
  const checkSeeded = async () => {
    try {
      const response = await fetch("/api/seed");
      if (response.ok) {
        const data = await response.json();
        setIsSeeded(data.seeded);
      }
    } catch (error) {
      console.error("Error checking seed status:", error);
    }
  };

  // Seed database
  const seedDatabase = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/seed", { method: "POST" });
      if (response.ok) {
        setIsSeeded(true);
        fetchCountries();
      }
    } catch (error) {
      console.error("Error seeding database:", error);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    checkSeeded();
    fetchCountries();
    fetchAllMetrics(); // Fetch all metrics initially for "Все гео" tab
  }, []);

  useEffect(() => {
    if (selectedCountry === "all") {
      fetchAllMetrics();
    } else if (selectedCountry) {
      fetchMetrics(selectedCountry);
    }
  }, [selectedCountry]);

  const hasData = countries.length > 0;
  const displayCountries = hasData
    ? countries.map((c) => ({
        id: c.id,
        name: c.name,
        nameRu: getCountryNameRu(c.name),
        code: c.code,
        currency: c.currency,
        flag: getCountryFlag(c.code),
      }))
    : [];

  const currentCountry = displayCountries.find((c) => c.id === selectedCountry) || displayCountries[0];

  // Calculate summary stats
  const totalSpend = metrics.reduce((s, d) => s + d.totalSpend, 0);
  const totalExpenses = metrics.reduce((s, d) => s + d.totalExpensesUsdt, 0);
  const expensesWithoutSpend = metrics.reduce((s, d) => s + d.expensesWithoutSpend, 0);
  const totalRevenue = metrics.reduce((s, d) => s + d.totalRevenueUsdt, 0);
  const totalProfit = metrics.reduce((s, d) => s + d.netProfitMath, 0);
  const avgRoi = metrics.length > 0
    ? metrics.reduce((s, d) => s + d.roi, 0) / metrics.length
    : 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Database className="h-16 w-16 text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-700">База данных пуста</h2>
        <p className="text-slate-500">Сначала инициализируйте базу данных и импортируйте данные</p>
        <div className="flex gap-2">
          <Button onClick={seedDatabase} disabled={seeding}>
            <Database className="h-4 w-4 mr-2" />
            {seeding ? "Инициализация..." : "Инициализировать БД"}
          </Button>
          <Link href="/import">
            <Button variant="outline">
              Перейти к импорту
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Страны</h1>
          <p className="text-slate-500 mt-1">
            Просмотр и управление данными по странам. Нажмите на строку для детализации.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { fetchCountries(); if (selectedCountry) fetchMetrics(selectedCountry); }} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || metricsLoading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Link href={`/countries/${selectedCountry || displayCountries[0]?.id}/add`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить данные
            </Button>
          </Link>
        </div>
      </div>

      {/* Country Tabs */}
      <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${displayCountries.length + 1}, minmax(0, 1fr))` }}>
          <TabsTrigger value="all" className="text-sm">
            <span className="mr-2">🌍</span>
            Все гео
          </TabsTrigger>
          {displayCountries.map((country) => (
            <TabsTrigger key={country.id} value={country.id} className="text-sm">
              <span className="mr-2">{country.flag}</span>
              {country.nameRu}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Geo Tab Content */}
        <TabsContent value="all" className="space-y-6">
          {/* All Geo Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Общий спенд
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${allMetrics.reduce((s, m) => s + m.totalSpend, 0).toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Все страны
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Расходы без спенда
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ${allMetrics.reduce((s, m) => s + m.expensesWithoutSpend, 0).toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ФОТ, комиссии и др.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Общий доход
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  ${allMetrics.reduce((s, m) => s + m.totalRevenueUsdt, 0).toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {allMetrics.length} дней
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Чистая прибыль
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${allMetrics.reduce((s, m) => s + m.netProfitMath, 0) >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  ${allMetrics.reduce((s, m) => s + m.netProfitMath, 0).toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {allMetrics.length} дней
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Средний ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allMetrics.length > 0
                    ? ((allMetrics.reduce((s, m) => s + m.netProfitMath, 0) / allMetrics.reduce((s, m) => s + m.totalSpend, 0)) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  все страны
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All Geo Daily Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Ежедневные метрики - Все страны
                {metricsLoading && <RefreshCw className="inline-block ml-2 h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allMetrics.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>Нет данных по метрикам.</p>
                  <p className="mt-2">
                    <Link href="/import" className="text-emerald-600 hover:underline">
                      Импортируйте данные из Excel
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Дата</TableHead>
                        <TableHead className="text-right">Спенд</TableHead>
                        <TableHead className="text-right">Доход</TableHead>
                        <TableHead className="text-right">Расходы</TableHead>
                        <TableHead className="text-right">Прибыль</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead>По странам</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allMetrics.map((metric) => (
                        <>
                          <TableRow
                            key={metric.date}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => setExpandedRow(expandedRow === metric.date ? null : metric.date)}
                          >
                            <TableCell className="w-8">
                              {expandedRow === metric.date ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {new Date(metric.date).toLocaleDateString("ru-RU")}
                            </TableCell>
                            <TableCell className="text-right">
                              ${metric.totalSpend.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-emerald-600">
                              ${metric.totalRevenueUsdt.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-red-500">
                              ${metric.totalExpensesUsdt.toFixed(2)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${
                                metric.netProfitMath >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              ${metric.netProfitMath.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {metric.roi >= 0 ? (
                                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                                {(metric.roi * 100).toFixed(1)}%
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {metric.countries.map((c) => (
                                  <Badge
                                    key={c.code}
                                    variant="outline"
                                    className={`text-xs ${c.profit >= 0 ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'}`}
                                  >
                                    {getCountryFlag(c.code)} ${c.profit.toFixed(0)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedRow === metric.date && (
                            <TableRow key={`${metric.date}-detail`}>
                              <TableCell colSpan={8} className="p-0">
                                <div className="bg-slate-50 border-t border-b p-6">
                                  <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-semibold">
                                      Детализация за {new Date(metric.date).toLocaleDateString("ru-RU")} - Все страны
                                    </h3>
                                    <Button variant="ghost" size="icon" onClick={() => setExpandedRow(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {metric.countries.map((c) => (
                                      <Card key={c.code} className="bg-white">
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-sm flex items-center gap-2">
                                            {getCountryFlag(c.code)} {getCountryNameRu(c.name)}
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Спенд:</span>
                                            <span className="font-medium">${c.spend.toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Доход:</span>
                                            <span className="font-medium text-emerald-600">${c.revenue.toFixed(2)}</span>
                                          </div>
                                          <div className="flex justify-between border-t pt-2">
                                            <span className="text-slate-600">Прибыль:</span>
                                            <span className={`font-semibold ${c.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                              ${c.profit.toFixed(2)}
                                            </span>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                  <div className="mt-4 p-4 bg-white rounded-lg border">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-slate-600">Всего ФД:</span>
                                        <span className="ml-2 font-medium">{metric.fdCount}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Всего РД:</span>
                                        <span className="ml-2 font-medium">{metric.rdCount}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">Расходы без спенда:</span>
                                        <span className="ml-2 font-medium">${metric.expensesWithoutSpend.toFixed(2)}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-600">ROI:</span>
                                        <span className={`ml-2 font-medium ${metric.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {(metric.roi * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {displayCountries.map((country) => (
          <TabsContent key={country.id} value={country.id} className="space-y-6">
            {/* Country Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Спенд
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${totalSpend.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Рекламный бюджет
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Расходы без спенда
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${expensesWithoutSpend.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ФОТ, комиссии и др.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Общий доход
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {metrics.length} дней
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Чистая прибыль
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    ${totalProfit.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {metrics.length} дней
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Средний ROI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(avgRoi * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    среднее за {metrics.length} дней
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Ежедневные метрики - {currentCountry?.nameRu}
                  {metricsLoading && <RefreshCw className="inline-block ml-2 h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {metrics.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Нет данных по метрикам.</p>
                    <p className="mt-2">
                      <Link href="/import" className="text-emerald-600 hover:underline">
                        Импортируйте данные из Excel
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead></TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead className="text-right">Спенд</TableHead>
                          <TableHead className="text-right">Доход</TableHead>
                          <TableHead className="text-right">Расходы</TableHead>
                          <TableHead className="text-right">Прибыль</TableHead>
                          <TableHead className="text-right">ROI</TableHead>
                          <TableHead className="text-right">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric) => (
                          <>
                            <TableRow
                              key={metric.id}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => setExpandedRow(expandedRow === metric.id ? null : metric.id)}
                            >
                              <TableCell className="w-8">
                                {expandedRow === metric.id ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {new Date(metric.date).toLocaleDateString("ru-RU")}
                              </TableCell>
                              <TableCell className="text-right">
                                ${metric.totalSpend.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-600">
                                ${metric.totalRevenueUsdt.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-red-500">
                                ${metric.totalExpensesUsdt.toFixed(2)}
                              </TableCell>
                              <TableCell
                                className={`text-right ${
                                  metric.netProfitMath >= 0 ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                ${metric.netProfitMath.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {metric.roi >= 0 ? (
                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                  )}
                                  {(metric.roi * 100).toFixed(1)}%
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge
                                  variant={metric.netProfitMath >= 0 ? "default" : "destructive"}
                                  className={
                                    metric.netProfitMath >= 0
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : ""
                                  }
                                >
                                  {metric.netProfitMath >= 0 ? "Прибыль" : "Убыток"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                            {expandedRow === metric.id && (
                              <TableRow key={`${metric.id}-detail`}>
                                <TableCell colSpan={8} className="p-0">
                                  <MetricDetailPanel
                                    metric={metric}
                                    onClose={() => setExpandedRow(null)}
                                  />
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
