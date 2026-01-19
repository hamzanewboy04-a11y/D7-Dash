"use client";

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

// Demo data
const weeklyPnL = [
  { week: "Dec 1-7", revenue: 12718.09, expenses: 6881.49, profit: 5836.60, roi: 0.42 },
  { week: "Dec 8-14", revenue: 14500.00, expenses: 7200.00, profit: 7300.00, roi: 0.50 },
  { week: "Dec 15-21", revenue: 11200.00, expenses: 6800.00, profit: 4400.00, roi: 0.39 },
  { week: "Dec 22-28", revenue: 9800.00, expenses: 5900.00, profit: 3900.00, roi: 0.40 },
];

const expenseBreakdown = [
  { name: "Ad Spend", value: 14100, color: "#6366f1" },
  { name: "Agency Fees", value: 1200, color: "#8b5cf6" },
  { name: "Payroll", value: 3450, color: "#f43f5e" },
  { name: "Priemka Commission", value: 1800, color: "#f97316" },
  { name: "Chatterfy", value: 500, color: "#eab308" },
  { name: "Other", value: 350, color: "#64748b" },
];

const countryPnL = [
  { country: "Peru", revenue: 8500, expenses: 6400, profit: 2100, roi: 0.25 },
  { country: "Italy (W)", revenue: 6200, expenses: 4700, profit: 1500, roi: 0.24 },
  { country: "Italy (M)", revenue: 4800, expenses: 3900, profit: 900, roi: 0.19 },
  { country: "Argentina", revenue: 3500, expenses: 2800, profit: 700, roi: 0.20 },
  { country: "Chile", revenue: 2800, expenses: 2400, profit: 400, roi: 0.14 },
];

export default function FinancePage() {
  const totalRevenue = weeklyPnL.reduce((s, w) => s + w.revenue, 0);
  const totalExpenses = weeklyPnL.reduce((s, w) => s + w.expenses, 0);
  const totalProfit = weeklyPnL.reduce((s, w) => s + w.profit, 0);
  const avgRoi = totalProfit / totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Finance</h1>
        <p className="text-slate-500 mt-1">
          P&L reports, expense breakdown, and financial analytics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalExpenses.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Average ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(avgRoi * 100).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">Weekly P&L</TabsTrigger>
          <TabsTrigger value="country">By Country</TabsTrigger>
          <TabsTrigger value="expenses">Expense Breakdown</TabsTrigger>
        </TabsList>

        {/* Weekly P&L */}
        <TabsContent value="weekly" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyPnL}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
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
                      <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly P&L Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyPnL.map((row) => (
                      <TableRow key={row.week}>
                        <TableCell className="font-medium">{row.week}</TableCell>
                        <TableCell className="text-right text-emerald-600">
                          ${row.revenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ${row.expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-purple-600">
                          ${row.profit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="default"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
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

        {/* By Country */}
        <TabsContent value="country" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>P&L by Country (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryPnL} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="country" type="category" stroke="#64748b" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Breakdown */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
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
                <CardTitle>Expense Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseBreakdown.map((expense) => (
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
                          {((expense.value / expenseBreakdown.reduce((s, e) => s + e.value, 0)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
