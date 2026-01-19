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
import { Plus, TrendingUp, TrendingDown, RefreshCw, Database } from "lucide-react";
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
  totalSpend: number;
  totalRevenueUsdt: number;
  netProfitMath: number;
  roi: number;
  agencyFee: number;
  totalPayroll: number;
  country: {
    name: string;
    code: string;
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

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
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
        if (data.length > 0 && !selectedCountry) {
          setSelectedCountry(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics for selected country
  const fetchMetrics = async (countryId: string) => {
    if (!countryId) return;
    setMetricsLoading(true);
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
  }, []);

  useEffect(() => {
    if (selectedCountry) {
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

  const displayMetrics = metrics.map((m) => ({
    date: new Date(m.date).toLocaleDateString("ru-RU"),
    spend: m.totalSpend,
    revenue: m.totalRevenueUsdt,
    profit: m.netProfitMath,
    roi: m.roi,
  }));

  const currentCountry = displayCountries.find((c) => c.id === selectedCountry) || displayCountries[0];

  // Calculate summary stats
  const totalSpend = displayMetrics.reduce((s, d) => s + d.spend, 0);
  const totalRevenue = displayMetrics.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = displayMetrics.reduce((s, d) => s + d.profit, 0);
  const avgRoi = displayMetrics.length > 0
    ? displayMetrics.reduce((s, d) => s + d.roi, 0) / displayMetrics.length
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
            Просмотр и управление данными по странам
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
      <Tabs value={selectedCountry || displayCountries[0]?.id} onValueChange={setSelectedCountry}>
        <TabsList className="grid w-full grid-cols-5">
          {displayCountries.map((country) => (
            <TabsTrigger key={country.id} value={country.id} className="text-sm">
              <span className="mr-2">{country.flag}</span>
              {country.nameRu}
            </TabsTrigger>
          ))}
        </TabsList>

        {displayCountries.map((country) => (
          <TabsContent key={country.id} value={country.id} className="space-y-6">
            {/* Country Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Общий спенд
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalSpend.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displayMetrics.length} дней
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
                    {displayMetrics.length} дней
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
                    {displayMetrics.length} дней
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
                    среднее за {displayMetrics.length} дней
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
              <CardContent>
                {displayMetrics.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>Нет данных по метрикам.</p>
                    <p className="mt-2">
                      <Link href="/import" className="text-emerald-600 hover:underline">
                        Импортируйте данные из Excel
                      </Link>
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead className="text-right">Спенд</TableHead>
                        <TableHead className="text-right">Доход</TableHead>
                        <TableHead className="text-right">Прибыль</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead className="text-right">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayMetrics.map((row, index) => (
                        <TableRow key={row.date + index} className="cursor-pointer hover:bg-slate-50">
                          <TableCell className="font-medium">{row.date}</TableCell>
                          <TableCell className="text-right">
                            ${row.spend.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            ${row.revenue.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              row.profit >= 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            ${row.profit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {row.roi >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              {(row.roi * 100).toFixed(1)}%
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={row.profit >= 0 ? "default" : "destructive"}
                              className={
                                row.profit >= 0
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                  : ""
                              }
                            >
                              {row.profit >= 0 ? "Прибыль" : "Убыток"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
