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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";

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

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Аналитика</h1>
            <p className="text-slate-500 mt-1">Детальный анализ показателей</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg">
          <p className="text-slate-500">Нет данных для анализа</p>
          <Button onClick={fetchAnalytics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
        </div>
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

      {/* Period Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Доход (30 дней)</CardTitle>
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
            <CardTitle className="text-sm font-medium text-slate-600">Расходы (30 дней)</CardTitle>
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
            <CardTitle className="text-sm font-medium text-slate-600">Прибыль (30 дней)</CardTitle>
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
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {data.countryPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
    </div>
  );
}
