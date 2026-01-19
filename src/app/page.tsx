"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CountrySummary } from "@/components/dashboard/country-summary";
import { DollarSign, TrendingUp, CreditCard, Users } from "lucide-react";

// Demo data - will be replaced with real data from database
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
  // Calculate totals
  const totalRevenue = mockCountryData.reduce((sum, c) => sum + c.revenue, 0);
  const totalSpend = mockCountryData.reduce((sum, c) => sum + c.spend, 0);
  const totalProfit = mockCountryData.reduce((sum, c) => sum + c.profit, 0);
  const avgRoi = totalProfit / totalSpend;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of all countries and key metrics
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          change={12.5}
          changeLabel="vs last week"
          icon={DollarSign}
          iconColor="text-emerald-500"
        />
        <MetricCard
          title="Total Spend"
          value={`$${totalSpend.toLocaleString()}`}
          change={-3.2}
          changeLabel="vs last week"
          icon={CreditCard}
          iconColor="text-blue-500"
        />
        <MetricCard
          title="Net Profit"
          value={`$${totalProfit.toLocaleString()}`}
          change={18.7}
          changeLabel="vs last week"
          icon={TrendingUp}
          iconColor="text-purple-500"
        />
        <MetricCard
          title="Average ROI"
          value={`${(avgRoi * 100).toFixed(1)}%`}
          change={2.1}
          changeLabel="vs last week"
          icon={Users}
          iconColor="text-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={mockChartData} title="Daily Revenue & Expenses" />
        <CountrySummary countries={mockCountryData} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Best Performing</h3>
          <p className="text-3xl font-bold mt-2">Peru 🇵🇪</p>
          <p className="text-sm opacity-75 mt-1">ROI: 25.0%</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Total Payroll</h3>
          <p className="text-3xl font-bold mt-2">$3,450</p>
          <p className="text-sm opacity-75 mt-1">This month</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-medium opacity-90">Active Countries</h3>
          <p className="text-3xl font-bold mt-2">5</p>
          <p className="text-sm opacity-75 mt-1">All operational</p>
        </div>
      </div>
    </div>
  );
}
