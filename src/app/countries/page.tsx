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

// Fallback demo data
const fallbackCountries = [
  { id: "pe", name: "Peru", code: "PE", currency: "SOL" },
  { id: "it_f", name: "Italy (Women)", code: "IT_F", currency: "EUR" },
  { id: "it_m", name: "Italy (Men)", code: "IT_M", currency: "EUR" },
  { id: "ar", name: "Argentina", code: "AR", currency: "ARS" },
  { id: "cl", name: "Chile", code: "CL", currency: "CLP" },
];

const mockDailyData = [
  { date: "2025-12-01", spend: 663.78, revenue: 2364.89, profit: 1226.80, roi: 0.52 },
  { date: "2025-12-02", spend: 638.75, revenue: 658.71, profit: -221.41, roi: -0.25 },
  { date: "2025-12-03", spend: 475.23, revenue: 1753.99, profit: 1030.96, roi: 0.59 },
  { date: "2025-12-04", spend: 520.00, revenue: 1450.50, profit: 560.25, roi: 0.39 },
  { date: "2025-12-05", spend: 480.00, revenue: 2100.00, profit: 1150.00, roi: 0.55 },
  { date: "2025-12-06", spend: 550.00, revenue: 1890.00, profit: 790.00, roi: 0.42 },
  { date: "2025-12-07", spend: 600.00, revenue: 2500.00, profit: 1300.00, roi: 0.52 },
];

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
        code: c.code,
        currency: c.currency,
        flag: getCountryFlag(c.code),
      }))
    : fallbackCountries.map((c) => ({ ...c, flag: getCountryFlag(c.code) }));

  const hasMetrics = metrics.length > 0;
  const displayMetrics = hasMetrics
    ? metrics.map((m) => ({
        date: new Date(m.date).toISOString().split("T")[0],
        spend: m.totalSpend,
        revenue: m.totalRevenueUsdt,
        profit: m.netProfitMath,
        roi: m.roi,
      }))
    : mockDailyData;

  const currentCountry = displayCountries.find((c) => c.id === selectedCountry) || displayCountries[0];

  // Calculate summary stats
  const totalSpend = displayMetrics.reduce((s, d) => s + d.spend, 0);
  const totalRevenue = displayMetrics.reduce((s, d) => s + d.revenue, 0);
  const totalProfit = displayMetrics.reduce((s, d) => s + d.profit, 0);
  const avgRoi = displayMetrics.length > 0
    ? displayMetrics.reduce((s, d) => s + d.roi, 0) / displayMetrics.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Countries</h1>
          <p className="text-slate-500 mt-1">
            View and manage data for each country
            {!hasData && <span className="text-orange-500 ml-2">(Demo data)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {isSeeded === false && (
            <Button onClick={seedDatabase} disabled={seeding} variant="outline">
              <Database className="h-4 w-4 mr-2" />
              {seeding ? "Initializing..." : "Initialize Database"}
            </Button>
          )}
          <Button onClick={() => { fetchCountries(); if (selectedCountry) fetchMetrics(selectedCountry); }} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading || metricsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href={`/countries/${selectedCountry || displayCountries[0]?.id}/add`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Daily Data
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
              {country.name}
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
                    Total Spend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalSpend.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displayMetrics.length} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    ${totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displayMetrics.length} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Net Profit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                    ${totalProfit.toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displayMetrics.length} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Average ROI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(avgRoi * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {displayMetrics.length} days avg
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Daily Metrics - {currentCountry?.name}
                  {metricsLoading && <RefreshCw className="inline-block ml-2 h-4 w-4 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {displayMetrics.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No metrics data yet. Add daily data to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Spend</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead className="text-right">Status</TableHead>
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
                              {row.profit >= 0 ? "Profitable" : "Loss"}
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
