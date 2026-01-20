"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, Trash2, Play, Pause, Ban, Loader2, Check, RefreshCw } from "lucide-react";

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  isActive: boolean;
  status: string;
  _count?: {
    dailyMetrics: number;
    employees: number;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Agency fees
    trustAgencyFee: "9",
    crossgifAgencyFee: "8",
    fbmAgencyFee: "8",
    priemkaCommission: "15",

    // Payroll rates
    buyerRate: "12",
    rdHandlerRate: "4",
    headDesignerFixed: "10",
    fdTier1Rate: "3",
    fdTier2Rate: "4",
    fdTier3Rate: "5",
    fdBonusThreshold: "5",
    fdBonus: "15",
    fdMultiplier: "1.2",

    // Currency exchange rates (USDT to local)
    exchangeRateSOL: "3.65",
    exchangeRateEUR: "0.92",
    exchangeRateARS: "1050",
    exchangeRateCLP: "950",
    autoUpdateRates: "false",

    // Payment settings
    defaultBufferDays: "7",
    paymentDay1: "5",
    paymentDay2: "20",
    minPaymentAmount: "50",

    // Limits and thresholds
    lowBalanceThreshold: "100",
    highSpendThreshold: "5000",
    negativeROIThreshold: "-20",
    fdCountMax: "100",

    // Additional commissions
    contentCreationFee: "0",
    designServiceFee: "0",
    reviewServiceFee: "0",

    // Notifications
    enableEmailNotifications: "false",
    enableTelegramNotifications: "false",
    notifyLowBalance: "true",
    notifyHighSpend: "true",
    notifyNegativeROI: "true",
    telegramBotToken: "",
    telegramChatId: "",
    notificationEmail: "",

    // System
    filterZeroSpend: "true",
    defaultCurrency: "USDT",
    dateFormat: "DD.MM.YYYY",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newCountry, setNewCountry] = useState({ name: "", code: "", currency: "USDT" });
  const [showAddCountry, setShowAddCountry] = useState(false);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, []);

  // Load countries from API
  const loadCountries = useCallback(async () => {
    try {
      const res = await fetch("/api/countries?includeInactive=true");
      if (res.ok) {
        const data = await res.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Error loading countries:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadSettings(), loadCountries()]).finally(() => setLoading(false));
  }, [loadSettings, loadCountries]);

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Ошибка сохранения настроек");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  const handleCountryStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/countries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        await loadCountries();
      }
    } catch (error) {
      console.error("Error updating country:", error);
    }
  };

  const handleAddCountry = async () => {
    if (!newCountry.name || !newCountry.code) {
      alert("Название и код обязательны");
      return;
    }

    try {
      const res = await fetch("/api/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCountry),
      });

      if (res.ok) {
        await loadCountries();
        setNewCountry({ name: "", code: "", currency: "USDT" });
        setShowAddCountry(false);
      } else {
        const error = await res.json();
        alert(error.error || "Ошибка добавления страны");
      }
    } catch (error) {
      console.error("Error adding country:", error);
    }
  };

  const handleDeleteCountry = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту страну?")) {
      return;
    }

    try {
      const res = await fetch(`/api/countries?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadCountries();
      }
    } catch (error) {
      console.error("Error deleting country:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Play className="h-4 w-4 text-green-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case "disabled":
        return <Ban className="h-4 w-4 text-red-500" />;
      default:
        return <Play className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Активен";
      case "paused":
        return "На паузе";
      case "disabled":
        return "Отключен";
      default:
        return "Активен";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "disabled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
          <p className="text-slate-500 mt-1">
            Настройка ставок расчётов и системных параметров
          </p>
        </div>
        <Button variant="outline" onClick={() => Promise.all([loadSettings(), loadCountries()])}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      <Tabs defaultValue="rates">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          <TabsTrigger value="rates">Комиссии</TabsTrigger>
          <TabsTrigger value="payroll">ФОТ</TabsTrigger>
          <TabsTrigger value="currency">Валюты</TabsTrigger>
          <TabsTrigger value="payments">Выплаты</TabsTrigger>
          <TabsTrigger value="limits">Лимиты</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="countries">Проекты</TabsTrigger>
          <TabsTrigger value="system">Система</TabsTrigger>
        </TabsList>

        {/* Commission Rates */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Комиссии рекламных агентств</CardTitle>
              <CardDescription>
                Проценты комиссий агентств для каждого типа кабинета
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trustAgencyFee">TRUST комиссия (%)</Label>
                  <Input
                    id="trustAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.trustAgencyFee}
                    onChange={(e) => handleSettingChange("trustAgencyFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crossgifAgencyFee">CROSSGIF комиссия (%)</Label>
                  <Input
                    id="crossgifAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.crossgifAgencyFee}
                    onChange={(e) => handleSettingChange("crossgifAgencyFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fbmAgencyFee">FBM комиссия (%)</Label>
                  <Input
                    id="fbmAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.fbmAgencyFee}
                    onChange={(e) => handleSettingChange("fbmAgencyFee", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Комиссия приёмки (партнёра)</CardTitle>
              <CardDescription>
                Ставка комиссии за обработку дохода через приёмку
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="priemkaCommission">Комиссия приёмки (%)</Label>
                <Input
                  id="priemkaCommission"
                  type="number"
                  step="0.1"
                  value={settings.priemkaCommission}
                  onChange={(e) => handleSettingChange("priemkaCommission", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Settings */}
        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Процентные ставки ФОТ</CardTitle>
              <CardDescription>
                Ставки ФОТ рассчитываемые как процент от дохода/спенда
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyerRate">Ставка баера (% от спенда)</Label>
                  <Input
                    id="buyerRate"
                    type="number"
                    step="0.1"
                    value={settings.buyerRate}
                    onChange={(e) => handleSettingChange("buyerRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rdHandlerRate">Ставка обраб. РД (%)</Label>
                  <Input
                    id="rdHandlerRate"
                    type="number"
                    step="0.1"
                    value={settings.rdHandlerRate}
                    onChange={(e) => handleSettingChange("rdHandlerRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headDesignerFixed">Хед дизайнер фикс ($)</Label>
                  <Input
                    id="headDesignerFixed"
                    type="number"
                    step="0.5"
                    value={settings.headDesignerFixed}
                    onChange={(e) => handleSettingChange("headDesignerFixed", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тиры обработчика ФД</CardTitle>
              <CardDescription>
                Тиры выплат на основе количества ФД. Формула: (кол-во * ставка + бонус) * множитель
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fdTier1Rate">Тир 1 (кол-во &lt; 5) $</Label>
                  <Input
                    id="fdTier1Rate"
                    type="number"
                    step="0.5"
                    value={settings.fdTier1Rate}
                    onChange={(e) => handleSettingChange("fdTier1Rate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdTier2Rate">Тир 2 (5-10) $</Label>
                  <Input
                    id="fdTier2Rate"
                    type="number"
                    step="0.5"
                    value={settings.fdTier2Rate}
                    onChange={(e) => handleSettingChange("fdTier2Rate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdTier3Rate">Тир 3 (10+) $</Label>
                  <Input
                    id="fdTier3Rate"
                    type="number"
                    step="0.5"
                    value={settings.fdTier3Rate}
                    onChange={(e) => handleSettingChange("fdTier3Rate", e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fdBonusThreshold">Порог бонуса (кол-во &gt;=)</Label>
                  <Input
                    id="fdBonusThreshold"
                    type="number"
                    value={settings.fdBonusThreshold}
                    onChange={(e) => handleSettingChange("fdBonusThreshold", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdBonus">Сумма бонуса ($)</Label>
                  <Input
                    id="fdBonus"
                    type="number"
                    step="0.5"
                    value={settings.fdBonus}
                    onChange={(e) => handleSettingChange("fdBonus", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdMultiplier">Множитель</Label>
                  <Input
                    id="fdMultiplier"
                    type="number"
                    step="0.1"
                    value={settings.fdMultiplier}
                    onChange={(e) => handleSettingChange("fdMultiplier", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currency Exchange Rates */}
        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Валютные курсы</CardTitle>
              <CardDescription>
                Курсы обмена локальных валют к USDT для автоматического пересчета
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateSOL">SOL → USDT</Label>
                  <Input
                    id="exchangeRateSOL"
                    type="number"
                    step="0.01"
                    value={settings.exchangeRateSOL}
                    onChange={(e) => handleSettingChange("exchangeRateSOL", e.target.value)}
                    placeholder="3.65"
                  />
                  <p className="text-xs text-slate-500">1 SOL = X USDT</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateEUR">EUR → USDT</Label>
                  <Input
                    id="exchangeRateEUR"
                    type="number"
                    step="0.01"
                    value={settings.exchangeRateEUR}
                    onChange={(e) => handleSettingChange("exchangeRateEUR", e.target.value)}
                    placeholder="0.92"
                  />
                  <p className="text-xs text-slate-500">1 EUR = X USDT</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateARS">ARS → USDT</Label>
                  <Input
                    id="exchangeRateARS"
                    type="number"
                    step="1"
                    value={settings.exchangeRateARS}
                    onChange={(e) => handleSettingChange("exchangeRateARS", e.target.value)}
                    placeholder="1050"
                  />
                  <p className="text-xs text-slate-500">1 ARS = X USDT (пример: 1050 ARS = 1 USDT)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateCLP">CLP → USDT</Label>
                  <Input
                    id="exchangeRateCLP"
                    type="number"
                    step="1"
                    value={settings.exchangeRateCLP}
                    onChange={(e) => handleSettingChange("exchangeRateCLP", e.target.value)}
                    placeholder="950"
                  />
                  <p className="text-xs text-slate-500">1 CLP = X USDT (пример: 950 CLP = 1 USDT)</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Автообновление курсов</p>
                  <p className="text-sm text-slate-500">
                    Автоматически обновлять курсы валют из внешних API (пока не реализовано)
                  </p>
                </div>
                <Button
                  variant={settings.autoUpdateRates === "true" ? "default" : "outline"}
                  onClick={() => handleSettingChange("autoUpdateRates", settings.autoUpdateRates === "true" ? "false" : "true")}
                >
                  {settings.autoUpdateRates === "true" ? "Включено" : "Выключено"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Настройки выплат сотрудникам</CardTitle>
              <CardDescription>
                Сроки, периоды и условия выплат
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultBufferDays">Буфер по умолчанию (дней)</Label>
                  <Input
                    id="defaultBufferDays"
                    type="number"
                    value={settings.defaultBufferDays}
                    onChange={(e) => handleSettingChange("defaultBufferDays", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Количество дней до выплаты</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay1">День выплаты 1</Label>
                  <Input
                    id="paymentDay1"
                    type="number"
                    min="1"
                    max="28"
                    value={settings.paymentDay1}
                    onChange={(e) => handleSettingChange("paymentDay1", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Первый день месяца для выплат</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay2">День выплаты 2</Label>
                  <Input
                    id="paymentDay2"
                    type="number"
                    min="1"
                    max="28"
                    value={settings.paymentDay2}
                    onChange={(e) => handleSettingChange("paymentDay2", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Второй день месяца для выплат</p>
                </div>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="minPaymentAmount">Минимальная сумма выплаты ($)</Label>
                <Input
                  id="minPaymentAmount"
                  type="number"
                  step="10"
                  value={settings.minPaymentAmount}
                  onChange={(e) => handleSettingChange("minPaymentAmount", e.target.value)}
                />
                <p className="text-xs text-slate-500">Минимальная сумма для инициации выплаты</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Дополнительные комиссии</CardTitle>
              <CardDescription>
                Комиссии за дополнительные услуги
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentCreationFee">Комиссия за контент (%)</Label>
                  <Input
                    id="contentCreationFee"
                    type="number"
                    step="0.1"
                    value={settings.contentCreationFee}
                    onChange={(e) => handleSettingChange("contentCreationFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designServiceFee">Комиссия за дизайн (%)</Label>
                  <Input
                    id="designServiceFee"
                    type="number"
                    step="0.1"
                    value={settings.designServiceFee}
                    onChange={(e) => handleSettingChange("designServiceFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewServiceFee">Комиссия за отзывы (%)</Label>
                  <Input
                    id="reviewServiceFee"
                    type="number"
                    step="0.1"
                    value={settings.reviewServiceFee}
                    onChange={(e) => handleSettingChange("reviewServiceFee", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits and Alerts */}
        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Лимиты и пороги</CardTitle>
              <CardDescription>
                Настройка пороговых значений для алертов и автоматических действий
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowBalanceThreshold">Порог низкого баланса ($)</Label>
                  <Input
                    id="lowBalanceThreshold"
                    type="number"
                    step="10"
                    value={settings.lowBalanceThreshold}
                    onChange={(e) => handleSettingChange("lowBalanceThreshold", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Уведомление при балансе ниже этой суммы</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="highSpendThreshold">Порог высокого спенда ($)</Label>
                  <Input
                    id="highSpendThreshold"
                    type="number"
                    step="100"
                    value={settings.highSpendThreshold}
                    onChange={(e) => handleSettingChange("highSpendThreshold", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Уведомление при спенде выше этой суммы</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="negativeROIThreshold">Порог отрицательного ROI (%)</Label>
                  <Input
                    id="negativeROIThreshold"
                    type="number"
                    step="5"
                    value={settings.negativeROIThreshold}
                    onChange={(e) => handleSettingChange("negativeROIThreshold", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Уведомление при ROI ниже этого значения</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdCountMax">Максимум ФД в день</Label>
                  <Input
                    id="fdCountMax"
                    type="number"
                    value={settings.fdCountMax}
                    onChange={(e) => handleSettingChange("fdCountMax", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Предупреждение при превышении количества ФД</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Уведомления</CardTitle>
              <CardDescription>
                Настройка email и Telegram уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Email уведомления</p>
                    <p className="text-sm text-slate-500">Отправлять уведомления на email</p>
                  </div>
                  <Button
                    variant={settings.enableEmailNotifications === "true" ? "default" : "outline"}
                    onClick={() => handleSettingChange("enableEmailNotifications", settings.enableEmailNotifications === "true" ? "false" : "true")}
                  >
                    {settings.enableEmailNotifications === "true" ? "Включено" : "Выключено"}
                  </Button>
                </div>

                {settings.enableEmailNotifications === "true" && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="notificationEmail">Email для уведомлений</Label>
                    <Input
                      id="notificationEmail"
                      type="email"
                      value={settings.notificationEmail}
                      onChange={(e) => handleSettingChange("notificationEmail", e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Telegram уведомления</p>
                    <p className="text-sm text-slate-500">Отправлять уведомления в Telegram</p>
                  </div>
                  <Button
                    variant={settings.enableTelegramNotifications === "true" ? "default" : "outline"}
                    onClick={() => handleSettingChange("enableTelegramNotifications", settings.enableTelegramNotifications === "true" ? "false" : "true")}
                  >
                    {settings.enableTelegramNotifications === "true" ? "Включено" : "Выключено"}
                  </Button>
                </div>

                {settings.enableTelegramNotifications === "true" && (
                  <div className="space-y-4 ml-4">
                    <div className="space-y-2">
                      <Label htmlFor="telegramBotToken">Telegram Bot Token</Label>
                      <Input
                        id="telegramBotToken"
                        type="password"
                        value={settings.telegramBotToken}
                        onChange={(e) => handleSettingChange("telegramBotToken", e.target.value)}
                        placeholder="123456:ABC-DEF..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
                      <Input
                        id="telegramChatId"
                        value={settings.telegramChatId}
                        onChange={(e) => handleSettingChange("telegramChatId", e.target.value)}
                        placeholder="-1001234567890"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="font-medium">Типы уведомлений</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Низкий баланс</p>
                      <p className="text-xs text-slate-500">Уведомлять при низком балансе</p>
                    </div>
                    <Button
                      size="sm"
                      variant={settings.notifyLowBalance === "true" ? "default" : "outline"}
                      onClick={() => handleSettingChange("notifyLowBalance", settings.notifyLowBalance === "true" ? "false" : "true")}
                    >
                      {settings.notifyLowBalance === "true" ? "Вкл" : "Выкл"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Высокий спенд</p>
                      <p className="text-xs text-slate-500">Уведомлять при превышении порога спенда</p>
                    </div>
                    <Button
                      size="sm"
                      variant={settings.notifyHighSpend === "true" ? "default" : "outline"}
                      onClick={() => handleSettingChange("notifyHighSpend", settings.notifyHighSpend === "true" ? "false" : "true")}
                    >
                      {settings.notifyHighSpend === "true" ? "Вкл" : "Выкл"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="text-sm font-medium">Отрицательный ROI</p>
                      <p className="text-xs text-slate-500">Уведомлять при отрицательном ROI</p>
                    </div>
                    <Button
                      size="sm"
                      variant={settings.notifyNegativeROI === "true" ? "default" : "outline"}
                      onClick={() => handleSettingChange("notifyNegativeROI", settings.notifyNegativeROI === "true" ? "false" : "true")}
                    >
                      {settings.notifyNegativeROI === "true" ? "Вкл" : "Выкл"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Countries / Projects */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Проекты (Страны)</CardTitle>
                <CardDescription>
                  Управление проектами, их статусами и валютами
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddCountry(!showAddCountry)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить проект
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add country form */}
              {showAddCountry && (
                <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                  <h3 className="font-medium">Новый проект</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Название</Label>
                      <Input
                        placeholder="Перу"
                        value={newCountry.name}
                        onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Код</Label>
                      <Input
                        placeholder="PE"
                        value={newCountry.code}
                        onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Валюта</Label>
                      <Input
                        placeholder="SOL"
                        value={newCountry.currency}
                        onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCountry}>Добавить</Button>
                    <Button variant="outline" onClick={() => setShowAddCountry(false)}>Отмена</Button>
                  </div>
                </div>
              )}

              {/* Countries list */}
              <div className="space-y-3">
                {countries.map((country) => (
                  <div
                    key={country.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      country.status === "disabled" ? "bg-slate-100 opacity-60" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(country.status)}`}>
                        {getStatusIcon(country.status)}
                      </div>
                      <div>
                        <p className="font-medium">{country.name}</p>
                        <p className="text-sm text-slate-500">
                          Код: {country.code} | Валюта: {country.currency}
                          {country._count && ` | ${country._count.dailyMetrics} записей`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(country.status)}`}>
                        {getStatusLabel(country.status)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={country.status === "active" ? "text-green-500" : "text-slate-400"}
                          onClick={() => handleCountryStatusChange(country.id, "active")}
                          title="Активировать"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={country.status === "paused" ? "text-yellow-500" : "text-slate-400"}
                          onClick={() => handleCountryStatusChange(country.id, "paused")}
                          title="Поставить на паузу"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={country.status === "disabled" ? "text-red-500" : "text-slate-400"}
                          onClick={() => handleCountryStatusChange(country.id, "disabled")}
                          title="Отключить"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteCountry(country.id)}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {countries.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  Нет проектов. Добавьте первый проект.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Системные настройки</CardTitle>
              <CardDescription>
                Настройки фильтрации и отображения данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Исключать дни с нулевым спендом</p>
                  <p className="text-sm text-slate-500">
                    Дни без расходов на рекламу не учитываются в статистике (проект не работал)
                  </p>
                </div>
                <Button
                  variant={settings.filterZeroSpend === "true" ? "default" : "outline"}
                  onClick={() => handleSettingChange("filterZeroSpend", settings.filterZeroSpend === "true" ? "false" : "true")}
                >
                  {settings.filterZeroSpend === "true" ? "Включено" : "Выключено"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        className="w-full"
        size="lg"
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : saved ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить настройки"}
      </Button>
    </div>
  );
}
