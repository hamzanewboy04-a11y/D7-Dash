"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Plus, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Commission rates
    trustAgencyFee: "9",
    crossgifAgencyFee: "8",
    fbmAgencyFee: "8",
    priemkaCommission: "15",

    // Payroll rates
    buyerRate: "12",
    rdHandlerRate: "4",
    headDesignerFixed: "10",

    // FD Handler tiers
    fdTier1Rate: "3", // < 5
    fdTier2Rate: "4", // 5-10
    fdTier3Rate: "5", // > 10
    fdBonusThreshold: "5",
    fdBonus: "15",
    fdMultiplier: "1.2",
  });

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // TODO: Save to database
    alert("Настройки сохранены! (Демо режим)");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Настройки</h1>
        <p className="text-slate-500 mt-1">
          Настройка ставок расчётов и системных параметров
        </p>
      </div>

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates">Комиссии</TabsTrigger>
          <TabsTrigger value="payroll">Настройки ФОТ</TabsTrigger>
          <TabsTrigger value="countries">Страны</TabsTrigger>
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

        {/* Countries */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Активные страны</CardTitle>
                <CardDescription>
                  Управление странами и их локальными валютами
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить страну
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Перу", code: "PE", currency: "SOL", flag: "🇵🇪" },
                  { name: "Италия (Ж)", code: "IT_F", currency: "EUR", flag: "🇮🇹" },
                  { name: "Италия (М)", code: "IT_M", currency: "EUR", flag: "🇮🇹" },
                  { name: "Аргентина", code: "AR", currency: "ARS", flag: "🇦🇷" },
                  { name: "Чили", code: "CL", currency: "CLP", flag: "🇨🇱" },
                ].map((country) => (
                  <div
                    key={country.code}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <p className="font-medium">{country.name}</p>
                        <p className="text-sm text-slate-500">Код: {country.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{country.currency}</p>
                        <p className="text-sm text-slate-500">Валюта</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        Сохранить настройки
      </Button>
    </div>
  );
}
