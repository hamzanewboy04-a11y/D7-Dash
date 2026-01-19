"use client";

import { useState } from "react";
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
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

// Demo data
const countries = [
  { id: "pe", name: "Peru", code: "PE", flag: "🇵🇪", currency: "SOL" },
  { id: "it_f", name: "Italy (Women)", code: "IT_F", flag: "🇮🇹", currency: "EUR" },
  { id: "it_m", name: "Italy (Men)", code: "IT_M", flag: "🇮🇹", currency: "EUR" },
  { id: "ar", name: "Argentina", code: "AR", flag: "🇦🇷", currency: "ARS" },
  { id: "cl", name: "Chile", code: "CL", flag: "🇨🇱", currency: "CLP" },
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

export default function CountriesPage() {
  const [selectedCountry, setSelectedCountry] = useState("pe");

  const currentCountry = countries.find((c) => c.id === selectedCountry);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Countries</h1>
          <p className="text-slate-500 mt-1">
            View and manage data for each country
          </p>
        </div>
        <Link href={`/countries/${selectedCountry}/add`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Daily Data
          </Button>
        </Link>
      </div>

      {/* Country Tabs */}
      <Tabs value={selectedCountry} onValueChange={setSelectedCountry}>
        <TabsList className="grid w-full grid-cols-5">
          {countries.map((country) => (
            <TabsTrigger key={country.id} value={country.id} className="text-sm">
              <span className="mr-2">{country.flag}</span>
              {country.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {countries.map((country) => (
          <TabsContent key={country.id} value={country.id} className="space-y-6">
            {/* Country Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Spend (Week)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${mockDailyData.reduce((s, d) => s + d.spend, 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total Revenue (Week)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">
                    ${mockDailyData.reduce((s, d) => s + d.revenue, 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Net Profit (Week)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    ${mockDailyData.reduce((s, d) => s + d.profit, 0).toFixed(2)}
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
                  <div className="text-2xl font-bold">
                    {(
                      (mockDailyData.reduce((s, d) => s + d.roi, 0) /
                        mockDailyData.length) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Data Table */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Metrics - {currentCountry?.name}</CardTitle>
              </CardHeader>
              <CardContent>
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
                    {mockDailyData.map((row) => (
                      <TableRow key={row.date} className="cursor-pointer hover:bg-slate-50">
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
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
