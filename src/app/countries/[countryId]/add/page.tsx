"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calculator, Save } from "lucide-react";
import Link from "next/link";
import { calculateAllMetrics } from "@/lib/calculations";

interface PageProps {
  params: Promise<{ countryId: string }>;
}

export default function AddDailyDataPage({ params }: PageProps) {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    // Ad Account Spends
    spendTrust: "",
    spendCrossgif: "",
    spendFbm: "",
    // Revenue Priemka
    revenueLocalPriemka: "",
    revenueUsdtPriemka: "",
    // Revenue Own
    revenueLocalOwn: "",
    revenueUsdtOwn: "",
    // FD/RD
    fdCount: "",
    fdSumLocal: "",
    // Manual payroll inputs
    payrollContent: "",
    payrollReviews: "",
    payrollDesigner: "",
    // Additional expenses
    chatterfyCost: "",
    additionalExpenses: "",
  });

  // Calculated values
  const [calculated, setCalculated] = useState<ReturnType<typeof calculateAllMetrics> | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const input = {
      spendTrust: parseFloat(formData.spendTrust) || 0,
      spendCrossgif: parseFloat(formData.spendCrossgif) || 0,
      spendFbm: parseFloat(formData.spendFbm) || 0,
      revenueLocalPriemka: parseFloat(formData.revenueLocalPriemka) || 0,
      revenueUsdtPriemka: parseFloat(formData.revenueUsdtPriemka) || 0,
      revenueLocalOwn: parseFloat(formData.revenueLocalOwn) || 0,
      revenueUsdtOwn: parseFloat(formData.revenueUsdtOwn) || 0,
      fdCount: parseInt(formData.fdCount) || 0,
      fdSumLocal: parseFloat(formData.fdSumLocal) || 0,
      payrollContent: parseFloat(formData.payrollContent) || 0,
      payrollReviews: parseFloat(formData.payrollReviews) || 0,
      payrollDesigner: parseFloat(formData.payrollDesigner) || 0,
      chatterfyCost: parseFloat(formData.chatterfyCost) || 0,
      additionalExpenses: parseFloat(formData.additionalExpenses) || 0,
    };

    const result = calculateAllMetrics(input);
    setCalculated(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save to database via API
    alert("Data saved! (Demo mode - API not connected yet)");
    router.push("/countries");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/countries">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Add Daily Data</h1>
          <p className="text-slate-500 mt-1">Enter daily metrics for calculation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="max-w-xs"
              />
            </CardContent>
          </Card>

          {/* Ad Spend */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Account Spend</CardTitle>
              <CardDescription>
                Enter spend for each ad account. Agency fees will be calculated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spendTrust">TRUST (9% fee)</Label>
                  <Input
                    id="spendTrust"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.spendTrust}
                    onChange={(e) => handleInputChange("spendTrust", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spendCrossgif">CROSSGIF (8% fee)</Label>
                  <Input
                    id="spendCrossgif"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.spendCrossgif}
                    onChange={(e) => handleInputChange("spendCrossgif", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spendFbm">FBM (8% fee)</Label>
                  <Input
                    id="spendFbm"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.spendFbm}
                    onChange={(e) => handleInputChange("spendFbm", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>
                Enter revenue data from both partner (Priemka) and own sources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Priemka */}
              <div>
                <h4 className="font-medium mb-3">Partner Revenue (Priemka - 15% commission)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="revenueLocalPriemka">Local Currency (SOL)</Label>
                    <Input
                      id="revenueLocalPriemka"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.revenueLocalPriemka}
                      onChange={(e) => handleInputChange("revenueLocalPriemka", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenueUsdtPriemka">USDT</Label>
                    <Input
                      id="revenueUsdtPriemka"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.revenueUsdtPriemka}
                      onChange={(e) => handleInputChange("revenueUsdtPriemka", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Own */}
              <div>
                <h4 className="font-medium mb-3">Own Revenue</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="revenueLocalOwn">Local Currency (SOL)</Label>
                    <Input
                      id="revenueLocalOwn"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.revenueLocalOwn}
                      onChange={(e) => handleInputChange("revenueLocalOwn", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenueUsdtOwn">USDT</Label>
                    <Input
                      id="revenueUsdtOwn"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.revenueUsdtOwn}
                      onChange={(e) => handleInputChange("revenueUsdtOwn", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FD Data */}
          <Card>
            <CardHeader>
              <CardTitle>FD Data (Factual Data)</CardTitle>
              <CardDescription>
                Used for payroll calculations. Tiered rates apply based on count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fdCount">FD Count</Label>
                  <Input
                    id="fdCount"
                    type="number"
                    placeholder="0"
                    value={formData.fdCount}
                    onChange={(e) => handleInputChange("fdCount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdSumLocal">FD Sum (Local Currency)</Label>
                  <Input
                    id="fdSumLocal"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.fdSumLocal}
                    onChange={(e) => handleInputChange("fdSumLocal", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Payroll */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Payroll Entries</CardTitle>
              <CardDescription>
                Some payroll items are entered manually. Buyer and handler payroll are calculated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payrollContent">Content ($)</Label>
                  <Input
                    id="payrollContent"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.payrollContent}
                    onChange={(e) => handleInputChange("payrollContent", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payrollReviews">Reviews ($)</Label>
                  <Input
                    id="payrollReviews"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.payrollReviews}
                    onChange={(e) => handleInputChange("payrollReviews", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payrollDesigner">Designer ($)</Label>
                  <Input
                    id="payrollDesigner"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.payrollDesigner}
                    onChange={(e) => handleInputChange("payrollDesigner", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chatterfyCost">Chatterfy ($)</Label>
                  <Input
                    id="chatterfyCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.chatterfyCost}
                    onChange={(e) => handleInputChange("chatterfyCost", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="additionalExpenses">Other Expenses ($)</Label>
                  <Input
                    id="additionalExpenses"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.additionalExpenses}
                    onChange={(e) => handleInputChange("additionalExpenses", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calculate Button */}
          <Button type="button" variant="outline" className="w-full" onClick={handleCalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Metrics
          </Button>

          {/* Calculated Results */}
          {calculated && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-800">Calculated Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Total Spend</p>
                    <p className="font-bold">${calculated.totalSpend.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Agency Fee</p>
                    <p className="font-bold">${calculated.agencyFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Priemka Commission (15%)</p>
                    <p className="font-bold">${calculated.commissionPriemka.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Revenue</p>
                    <p className="font-bold text-emerald-600">${calculated.totalRevenueUsdt.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payroll (RD Handler)</p>
                    <p className="font-bold">${calculated.payrollRdHandler.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payroll (FD Handler)</p>
                    <p className="font-bold">${calculated.payrollFdHandler.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payroll (Buyer 12%)</p>
                    <p className="font-bold">${calculated.payrollBuyer.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Payroll</p>
                    <p className="font-bold">${calculated.totalPayroll.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Expenses</p>
                    <p className="font-bold text-red-600">${calculated.totalExpensesUsdt.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Net Profit</p>
                    <p className={`font-bold ${calculated.netProfitMath >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      ${calculated.netProfitMath.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">ROI</p>
                    <p className={`font-bold ${calculated.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {(calculated.roi * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            Save Daily Data
          </Button>
        </div>
      </form>
    </div>
  );
}
