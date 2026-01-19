"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CountrySummary } from "@/components/dashboard/country-summary";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CreditCard, Users, RefreshCw, Database } from "lucide-react";

interface DashboardData {
  totals: {
    revenue: number;
    expenses: number;
    spend: number;
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

// Fallback demo data
const mockChartData = [
  { date: "Dec 1", revenue: 2364.89, expenses: 1138.09, profit: 1226.80 },
  { date: "Dec 2", revenue: 658.71, expenses: 880.12, profit: -221.41 },
  { date: "Dec 3", revenue: 1753.99, expenses: 723.03, profit: 1030.96 },
  { date: "Dec 4", revenue: 1450.50, expenses: 890.25, profit: 560.25 },
  { date: "Dec 5", revenue: 2100.00, expenses: 950.00, profit: 1150.00 },
  { date: "Dec 6", revenue: 1890.00, expenses: 1100.00, profit: 790.00 },
  { date: "Dec 7", revenue: 2500.00, expenses: 1200.00, profit: 1300.00 },
];

const mockCountryData = [
  { name: "Peru", code: "PE", revenue: 8500, spend: 4200, profit: 2100, roi: 0.25 },
  { name: "Italy (Women)", code: "IT_F", revenue: 6200, spend: 3100, profit: 1500, roi: 0.24 },
  { name: "Italy (Men)", code: "IT_M", revenue: 4800, spend: 2900, profit: 900, roi: 0.19 },
  { name: "Argentina", code: "AR", revenue: 3500, spend: 2100, profit: 700, roi: 0.20 },
  { name: "Chile", code: "CL", revenue: 2800, spend: 1800, profit: 400, roi: 0.14 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard?days=30");
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

  const checkSeeded = async () => {
    try {
      const response = await fetch("/api/seed");
      if (response.ok) {
        const seedStatus = await response.json();
        setIsSeeded(seedStatus.seeded);
      }
    } catch (error) {
      console.error("Error checking seed status:", error);
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

  useEffect(() => {
    checkSeeded();
    fetchDashboardData();
  }, []);

  // Use API data or fallback to demo data
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
        roi: 0,
      };

  if (!hasData) {
    totals.roi = totals.spend > 0 ? ((totals.profit / totals.spend) * 100) : 0;
  }

  // Find best performing country
  const bestCountry = [...countryData].sort((a, b) => b.roi - a.roi)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Overview of all countries and key metrics
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
          <Button onClick={fetchDashboardData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${totals.revenue.toLocaleString()}`}
          icon={DollarSign}
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Total Spend"
          value={`$${totals.spend.toLocaleString()}`}
          icon={CreditCard}
          iconColor="text-blue-500"
        />
        <MetricCard
          title="Net Profit"
          value={`$${totals.profit.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-purple-500"
        />
        <MetricCard
          title="ROI"
          value={`${typeof totals.roi === 'number' ? totals.roi.toFixed(1) : '0'}%`}
          icon={Users}
          iconColor="text-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={chartData} title="Daily Revenue & Expenses" />
        <CountrySummary countries={countryData} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Best Performing</h3>
          <p className="text-3xl font-bold mt-2">
            {bestCountry?.name || "Peru"} {bestCountry?.code === "PE" ? "🇵🇪" : bestCountry?.code === "IT_F" || bestCountry?.code === "IT_M" ? "🇮🇹" : bestCountry?.code === "AR" ? "🇦🇷" : bestCountry?.code === "CL" ? "🇨🇱" : "🌍"}
          </p>
          <p className="text-sm opacity-75 mt-1">
            ROI: {((bestCountry?.roi || 0) * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Total Payroll</h3>
          <p className="text-3xl font-bold mt-2">${(totals.payroll || 0).toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">This month</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Active Countries</h3>
          <p className="text-3xl font-bold mt-2">{data?.countries?.length || 5}</p>
          <p className="text-sm opacity-75 mt-1">All operational</p>
        </div>
      </div>
    </div>
  );
}
