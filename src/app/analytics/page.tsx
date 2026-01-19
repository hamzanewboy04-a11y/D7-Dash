"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Target, BarChart2, Calendar } from "lucide-react";

interface AnalyticsData {
  periodComparison: {
    current: { revenue: number; spend: number; profit: number; roi: number };
    previous: { revenue: number; spend: number; profit: number; roi: number };
  };
  topDays: Array<{
    date: string;
    revenue: number;
    profit: number;
    roi: number;
  }>;
  countryPerformance: Array<{
    name: string;
    revenue: number;
    spend: number;
    profit: number;
    roi: number;
  }>;
  weeklyTrend: Array<{
    week: string;
    revenue: number;
    spend: number;
    profit: number;
  }>;
  roiDistribution: Array<{
    range: string;
    count: number;
  }>;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface DailyMetric {
  date: string;
  countryId: string;
  country: Country;
  totalSpend: number;
  totalRevenueUsdt: number;
  netProfitMath: number;
  roi: number;
  fdCount: number;
  rdCount: number;
  fdSumUsdt: number;
  rdSumUsdt: number;
  totalPayroll: number;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const METRIC_OPTIONS = [
  { value: "revenue", label: "Доход", color: "#10b981" },
  { value: "spend", label: "Расход (спенд)", color: "#3b82f6" },
  { value: "profit", label: "Прибыль", color: "#8b5cf6" },
  { value: "roi", label: "ROI %", color: "#f59e0b" },
  { value: "fdCount", label: "Количество ФД", color: "#06b6d4" },
  { value: "fdSumUsdt", label: "Сумма ФД (USDT)", color: "#14b8a6" },
  { value: "rdSumUsdt", label: "Сумма РД (USDT)", color: "#ec4899" },
  { value: "totalPayroll", label: "ФОТ", color: "#f97316" },
];

const PERIOD_OPTIONS = [
  { value: "7", label: "7 дней" },
  { value: "14", label: "14 дней" },
  { value: "30", label: "30 дней" },
  { value: "90", label: "90 дней" },
  { value: "all", label: "Всё время" },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMetric, setSelectedMetric] = useState("profit");
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [chartType, setChartType] = useState<"bar" | "line" | "area">("area");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, metricsRes, countriesRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch(`/api/metrics?limit=365&filterZeroSpend=false`),
        fetch("/api/countries"),
      ]);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setData(analyticsData);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (countriesRes.ok) {
        const countriesData = await countriesRes.json();
        setCountries(countriesData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const renderChangeIndicator = (current: number, previous: number) => {
    const change = getChangePercent(current, previous);
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  // Filter metrics based on selection
  const getFilteredMetrics = () => {
    let filtered = [...metrics];

    // Filter by country
    if (selectedCountry !== "all") {
      filtered = filtered.filter(m => m.countryId === selectedCountry);
    }

    // Filter by period
    if (selectedPeriod !== "all") {
      const days = parseInt(selectedPeriod);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(m => new Date(m.date) >= cutoff);
    }

    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get metric value from a daily metric
  const getMetricValue = (metric: DailyMetric, key: string): number => {
    switch (key) {
      case "revenue": return metric.totalRevenueUsdt;
      case "spend": return metric.totalSpend;
      case "profit": return metric.netProfitMath;
      case "roi": return metric.roi * 100;
      case "fdCount": return metric.fdCount || 0;
      case "fdSumUsdt": return metric.fdSumUsdt || 0;
      case "rdSumUsdt": return metric.rdSumUsdt || 0;
      case "totalPayroll": return metric.totalPayroll || 0;
      default: return 0;
    }
  };

  // Prepare chart data
  const getChartData = () => {
    const filtered = getFilteredMetrics();

    // Group by date
    const byDate: Record<string, { date: string; value: number; count: number }> = {};

    for (const m of filtered) {
      const dateKey = m.date.split("T")[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { date: dateKey, value: 0, count: 0 };
      }
      byDate[dateKey].value += getMetricValue(m, selectedMetric);
      byDate[dateKey].count++;
    }

    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        value: Math.round(d.value * 100) / 100,
        label: new Date(d.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      }));
  };

  // Get summary stats
  const getSummaryStats = () => {
    const filtered = getFilteredMetrics();
    if (filtered.length === 0) return null;

    let total = 0;
    let count = 0;
    let max = -Infinity;
    let min = Infinity;

    for (const m of filtered) {
      const value = getMetricValue(m, selectedMetric);
      total += value;
      count++;
      if (value > max) max = value;
      if (value < min) min = value;
    }

    return {
      total: Math.round(total * 100) / 100,
      average: Math.round((total / count) * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      count,
    };
  };

  const metricConfig = METRIC_OPTIONS.find(m => m.value === selectedMetric) || METRIC_OPTIONS[0];
  const chartData = getChartData();
  const summaryStats = getSummaryStats();
  const isPercentMetric = selectedMetric === "roi";
  const isCountMetric = selectedMetric === "fdCount";

  const formatValue = (value: number) => {
    if (isPercentMetric) return `${value.toFixed(1)}%`;
    if (isCountMetric) return formatNumber(value);
    return formatCurrency(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Аналитика</h1>
          <p className="text-slate-500 mt-1">Детальный анализ показателей</p>
        </div>
        <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Метрика:</span>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Период:</span>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Страна:</span>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все страны</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <Button
                size="sm"
                variant={chartType === "area" ? "default" : "outline"}
                onClick={() => setChartType("area")}
              >
                Area
              </Button>
              <Button
                size="sm"
                variant={chartType === "bar" ? "default" : "outline"}
                onClick={() => setChartType("bar")}
              >
                Bar
              </Button>
              <Button
                size="sm"
                variant={chartType === "line" ? "default" : "outline"}
                onClick={() => setChartType("line")}
              >
                Line
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Всего</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: metricConfig.color }}>
                {formatValue(summaryStats.total)}
              </div>
              <p className="text-xs text-slate-500 mt-1">{summaryStats.count} записей</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Среднее</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(summaryStats.average)}
              </div>
              <p className="text-xs text-slate-500 mt-1">за день</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Максимум</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatValue(summaryStats.max)}
              </div>
              <p className="text-xs text-slate-500 mt-1">лучший день</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Минимум</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-400">
                {formatValue(summaryStats.min)}
              </div>
              <p className="text-xs text-slate-500 mt-1">худший день</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Дней</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.count}</div>
              <p className="text-xs text-slate-500 mt-1">в периоде</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metricConfig.color }} />
            {metricConfig.label} по дням
          </CardTitle>
          <CardDescription>
            {selectedCountry === "all" ? "Все страны" : countries.find(c => c.id === selectedCountry)?.name} • {
              PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => isPercentMetric ? `${v}%` : isCountMetric ? v : `$${v}`} />
                  <Tooltip
                    formatter={(value) => [formatValue(Number(value)), metricConfig.label]}
                    labelFormatter={(label) => `Дата: ${label}`}
                  />
                  <Bar dataKey="value" fill={metricConfig.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => isPercentMetric ? `${v}%` : isCountMetric ? v : `$${v}`} />
                  <Tooltip
                    formatter={(value) => [formatValue(Number(value)), metricConfig.label]}
                    labelFormatter={(label) => `Дата: ${label}`}
                  />
                  <Line type="monotone" dataKey="value" stroke={metricConfig.color} strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => isPercentMetric ? `${v}%` : isCountMetric ? v : `$${v}`} />
                  <Tooltip
                    formatter={(value) => [formatValue(Number(value)), metricConfig.label]}
                    labelFormatter={(label) => `Дата: ${label}`}
                  />
                  <Area type="monotone" dataKey="value" stroke={metricConfig.color} fill={metricConfig.color} fillOpacity={0.3} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison Cards - using existing data */}
      {data && (
        <>
          <h2 className="text-xl font-bold text-slate-900 mt-8">Сравнение периодов (30 дней)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Доход</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.periodComparison.current.revenue)}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">vs пред. период</span>
                  {renderChangeIndicator(data.periodComparison.current.revenue, data.periodComparison.previous.revenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Расходы</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.periodComparison.current.spend)}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">vs пред. период</span>
                  {renderChangeIndicator(data.periodComparison.previous.spend, data.periodComparison.current.spend)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Прибыль</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${data.periodComparison.current.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(data.periodComparison.current.profit)}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">vs пред. период</span>
                  {renderChangeIndicator(data.periodComparison.current.profit, data.periodComparison.previous.profit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Средний ROI</CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${data.periodComparison.current.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatPercent(data.periodComparison.current.roi)}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">vs пред. период</span>
                  {renderChangeIndicator(data.periodComparison.current.roi, data.periodComparison.previous.roi)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Тренд по неделям</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="revenue" name="Доход" fill="#10b981" />
                      <Bar dataKey="spend" name="Расход" fill="#3b82f6" />
                      <Bar dataKey="profit" name="Прибыль" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Country Performance Pie */}
            <Card>
              <CardHeader>
                <CardTitle>Доход по странам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.countryPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {data.countryPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Country Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Сравнение стран</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Страна</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600">Доход</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600">Расход</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600">Прибыль</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-600">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countryPerformance.map((country, index) => (
                      <tr key={country.name} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            {country.name}
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-emerald-600">{formatCurrency(country.revenue)}</td>
                        <td className="text-right py-3 px-4 text-blue-600">{formatCurrency(country.spend)}</td>
                        <td className={`text-right py-3 px-4 ${country.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(country.profit)}
                        </td>
                        <td className={`text-right py-3 px-4 ${country.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatPercent(country.roi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Days */}
          <Card>
            <CardHeader>
              <CardTitle>Лучшие дни по прибыли</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topDays.map((day, index) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? "bg-amber-500" : index === 1 ? "bg-slate-400" : index === 2 ? "bg-amber-700" : "bg-slate-300"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString("ru-RU")}</p>
                        <p className="text-sm text-slate-500">Доход: {formatCurrency(day.revenue)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${day.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(day.profit)}
                      </p>
                      <p className="text-sm text-slate-500">ROI: {formatPercent(day.roi)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
