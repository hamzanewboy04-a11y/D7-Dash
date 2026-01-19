"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calculator, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { calculateAllMetrics } from "@/lib/calculations";

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  adAccounts: AdAccount[];
}

interface AdAccount {
  id: string;
  name: string;
  agencyFeeRate: number;
}

interface PageProps {
  params: Promise<{ countryId: string }>;
}

export default function AddDailyDataPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const countryId = resolvedParams.countryId;

  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    // Спенд по кабинетам
    spendTrust: "",
    spendCrossgif: "",
    spendFbm: "",
    // Доход Приёмка
    revenueLocalPriemka: "",
    revenueUsdtPriemka: "",
    // Доход Наш
    revenueLocalOwn: "",
    revenueUsdtOwn: "",
    // ФД данные
    fdCount: "",
    fdSumLocal: "",
    fdSumUsdt: "",
    // нФД данные
    nfdCount: "",
    nfdSumLocal: "",
    nfdSumUsdt: "",
    // РД данные
    rdCount: "",
    rdSumLocal: "",
    rdSumUsdt: "",
    // ФОТ ручной ввод
    payrollContent: "",
    payrollReviews: "",
    payrollDesigner: "",
    // Дополнительные расходы
    chatterfyCost: "",
    additionalExpenses: "",
  });

  // Calculated values
  const [calculated, setCalculated] = useState<ReturnType<typeof calculateAllMetrics> | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const response = await fetch("/api/countries");
        if (response.ok) {
          const countries = await response.json();
          const found = countries.find((c: Country) => c.id === countryId || c.code.toLowerCase() === countryId);
          if (found) {
            setCountry(found);
          } else {
            setError("Страна не найдена");
          }
        }
      } catch (err) {
        console.error("Error fetching country:", err);
        setError("Не удалось загрузить данные страны");
      } finally {
        setLoading(false);
      }
    };

    fetchCountry();
  }, [countryId]);

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
      rdSumUsdt: parseFloat(formData.rdSumUsdt) || 0,
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

    if (!country) {
      setError("Страна не загружена");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build ad spends array from form data
      const adSpends = [];
      const trustAccount = country.adAccounts?.find(a => a.name.toUpperCase().includes("TRUST"));
      const crossgifAccount = country.adAccounts?.find(a => a.name.toUpperCase().includes("CROSSGIF"));
      const fbmAccount = country.adAccounts?.find(a => a.name.toUpperCase().includes("FBM"));

      if (trustAccount && formData.spendTrust) {
        adSpends.push({
          adAccountId: trustAccount.id,
          spend: parseFloat(formData.spendTrust) || 0,
        });
      }
      if (crossgifAccount && formData.spendCrossgif) {
        adSpends.push({
          adAccountId: crossgifAccount.id,
          spend: parseFloat(formData.spendCrossgif) || 0,
        });
      }
      if (fbmAccount && formData.spendFbm) {
        adSpends.push({
          adAccountId: fbmAccount.id,
          spend: parseFloat(formData.spendFbm) || 0,
        });
      }

      const response = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          countryId: country.id,
          adSpends,
          revenueLocalPriemka: parseFloat(formData.revenueLocalPriemka) || 0,
          revenueUsdtPriemka: parseFloat(formData.revenueUsdtPriemka) || 0,
          revenueLocalOwn: parseFloat(formData.revenueLocalOwn) || 0,
          revenueUsdtOwn: parseFloat(formData.revenueUsdtOwn) || 0,
          fdCount: parseInt(formData.fdCount) || 0,
          fdSumLocal: parseFloat(formData.fdSumLocal) || 0,
          fdSumUsdt: parseFloat(formData.fdSumUsdt) || 0,
          nfdCount: parseInt(formData.nfdCount) || 0,
          nfdSumLocal: parseFloat(formData.nfdSumLocal) || 0,
          nfdSumUsdt: parseFloat(formData.nfdSumUsdt) || 0,
          rdCount: parseInt(formData.rdCount) || 0,
          rdSumLocal: parseFloat(formData.rdSumLocal) || 0,
          rdSumUsdt: parseFloat(formData.rdSumUsdt) || 0,
          payrollContent: parseFloat(formData.payrollContent) || 0,
          payrollReviews: parseFloat(formData.payrollReviews) || 0,
          payrollDesigner: parseFloat(formData.payrollDesigner) || 0,
          chatterfyCost: parseFloat(formData.chatterfyCost) || 0,
          additionalExpenses: parseFloat(formData.additionalExpenses) || 0,
        }),
      });

      if (response.ok) {
        router.push("/countries");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Не удалось сохранить данные");
      }
    } catch (err) {
      console.error("Error saving data:", err);
      setError("Не удалось сохранить данные");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !country) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link href="/countries">
          <Button className="mt-4">Назад к странам</Button>
        </Link>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-slate-900">Добавить данные</h1>
          <p className="text-slate-500 mt-1">
            {country?.name} ({country?.currency}) - Ввод ежедневных метрик
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Дата */}
          <Card>
            <CardHeader>
              <CardTitle>Дата</CardTitle>
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

          {/* Спенд по рекламным кабинетам */}
          <Card>
            <CardHeader>
              <CardTitle>Спенд по рекламным кабинетам</CardTitle>
              <CardDescription>
                Введите спенд по каждому кабинету. Комиссия агентства рассчитается автоматически.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spendTrust">TRUST (комиссия 9%)</Label>
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
                  <Label htmlFor="spendCrossgif">КРОСГИФ (комиссия 8%)</Label>
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
                  <Label htmlFor="spendFbm">FBM (комиссия 8%)</Label>
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

          {/* Доходы */}
          <Card>
            <CardHeader>
              <CardTitle>Доходы</CardTitle>
              <CardDescription>
                Введите доходы от партнёров (Приёмка) и собственные.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Приёмка */}
              <div>
                <h4 className="font-medium mb-3 text-teal-700">Доход Приёмка (комиссия 15%)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="revenueLocalPriemka">Локальная валюта ({country?.currency})</Label>
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

              {/* Наш доход */}
              <div>
                <h4 className="font-medium mb-3 text-teal-700">Доход Наш</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="revenueLocalOwn">Локальная валюта ({country?.currency})</Label>
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

          {/* ФД / нФД / РД */}
          <Card>
            <CardHeader>
              <CardTitle className="text-teal-700">ФД / нФД / РД</CardTitle>
              <CardDescription>
                Фактические данные для расчёта ФОТ обработчиков.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ФД */}
              <div>
                <h4 className="font-medium mb-3">ФД (Фактические данные)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fdCount">Количество ФД</Label>
                    <Input
                      id="fdCount"
                      type="number"
                      placeholder="0"
                      value={formData.fdCount}
                      onChange={(e) => handleInputChange("fdCount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fdSumLocal">Сумма ФД ({country?.currency})</Label>
                    <Input
                      id="fdSumLocal"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.fdSumLocal}
                      onChange={(e) => handleInputChange("fdSumLocal", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fdSumUsdt">Сумма ФД (USDT)</Label>
                    <Input
                      id="fdSumUsdt"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.fdSumUsdt}
                      onChange={(e) => handleInputChange("fdSumUsdt", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* нФД */}
              <div>
                <h4 className="font-medium mb-3">нФД (Нефактические данные)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nfdCount">Количество нФД</Label>
                    <Input
                      id="nfdCount"
                      type="number"
                      placeholder="0"
                      value={formData.nfdCount}
                      onChange={(e) => handleInputChange("nfdCount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nfdSumLocal">Сумма нФД ({country?.currency})</Label>
                    <Input
                      id="nfdSumLocal"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.nfdSumLocal}
                      onChange={(e) => handleInputChange("nfdSumLocal", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nfdSumUsdt">Сумма нФД (USDT)</Label>
                    <Input
                      id="nfdSumUsdt"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.nfdSumUsdt}
                      onChange={(e) => handleInputChange("nfdSumUsdt", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* РД */}
              <div>
                <h4 className="font-medium mb-3">РД (Расчётные данные)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rdCount">Количество РД</Label>
                    <Input
                      id="rdCount"
                      type="number"
                      placeholder="0"
                      value={formData.rdCount}
                      onChange={(e) => handleInputChange("rdCount", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rdSumLocal">Сумма РД ({country?.currency})</Label>
                    <Input
                      id="rdSumLocal"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.rdSumLocal}
                      onChange={(e) => handleInputChange("rdSumLocal", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rdSumUsdt">Сумма РД (USDT)</Label>
                    <Input
                      id="rdSumUsdt"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.rdSumUsdt}
                      onChange={(e) => handleInputChange("rdSumUsdt", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ФОТ ручной ввод */}
          <Card>
            <CardHeader>
              <CardTitle className="text-teal-700">ФОТ (ручной ввод)</CardTitle>
              <CardDescription>
                Некоторые позиции ФОТ вводятся вручную. ФОТ баера и обработчиков рассчитываются автоматически.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payrollContent">ФОТ Контент ($)</Label>
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
                  <Label htmlFor="payrollReviews">ФОТ Отзывы ($)</Label>
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
                  <Label htmlFor="payrollDesigner">ФОТ Дизайнер ($)</Label>
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

          {/* Дополнительные расходы */}
          <Card>
            <CardHeader>
              <CardTitle>Дополнительные расходы</CardTitle>
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
                  <Label htmlFor="additionalExpenses">Доп. расходы ($)</Label>
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

          {/* Кнопка расчёта */}
          <Button type="button" variant="outline" className="w-full" onClick={handleCalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            Рассчитать метрики
          </Button>

          {/* Результаты расчёта */}
          {calculated && (
            <Card className="border-emerald-200 bg-emerald-50">
              <CardHeader>
                <CardTitle className="text-emerald-800">Рассчитанные метрики</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Общий спенд</p>
                    <p className="font-bold">${calculated.totalSpend.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Комиссия агентства</p>
                    <p className="font-bold">${calculated.agencyFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Комиссия приёмки (15%)</p>
                    <p className="font-bold">${calculated.commissionPriemka.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Общий доход</p>
                    <p className="font-bold text-emerald-600">${calculated.totalRevenueUsdt.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">ФОТ обраб. РД (4%)</p>
                    <p className="font-bold">${calculated.payrollRdHandler.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">ФОТ обраб. ФД</p>
                    <p className="font-bold">${calculated.payrollFdHandler.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">ФОТ баер (12%)</p>
                    <p className="font-bold">${calculated.payrollBuyer.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Общий ФОТ</p>
                    <p className="font-bold">${calculated.totalPayroll.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Общие расходы</p>
                    <p className="font-bold text-red-600">${calculated.totalExpensesUsdt.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Чистая прибыль</p>
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

          {/* Кнопка сохранения */}
          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить данные
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
