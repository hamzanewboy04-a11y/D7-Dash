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
    alert("Settings saved! (Demo mode)");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Configure calculation rates and system settings
        </p>
      </div>

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates">Commission Rates</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Settings</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
        </TabsList>

        {/* Commission Rates */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad Agency Commission Rates</CardTitle>
              <CardDescription>
                Commission percentages charged by ad agencies for each account type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trustAgencyFee">TRUST Agency Fee (%)</Label>
                  <Input
                    id="trustAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.trustAgencyFee}
                    onChange={(e) => handleSettingChange("trustAgencyFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crossgifAgencyFee">CROSSGIF Agency Fee (%)</Label>
                  <Input
                    id="crossgifAgencyFee"
                    type="number"
                    step="0.1"
                    value={settings.crossgifAgencyFee}
                    onChange={(e) => handleSettingChange("crossgifAgencyFee", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fbmAgencyFee">FBM Agency Fee (%)</Label>
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
              <CardTitle>Priemka (Partner) Commission</CardTitle>
              <CardDescription>
                Commission rate for partner revenue processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="priemkaCommission">Priemka Commission (%)</Label>
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
              <CardTitle>Percentage-Based Payroll</CardTitle>
              <CardDescription>
                Payroll rates calculated as percentage of revenue/spend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyerRate">Buyer Rate (% of spend)</Label>
                  <Input
                    id="buyerRate"
                    type="number"
                    step="0.1"
                    value={settings.buyerRate}
                    onChange={(e) => handleSettingChange("buyerRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rdHandlerRate">RD Handler Rate (%)</Label>
                  <Input
                    id="rdHandlerRate"
                    type="number"
                    step="0.1"
                    value={settings.rdHandlerRate}
                    onChange={(e) => handleSettingChange("rdHandlerRate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headDesignerFixed">Head Designer Fixed ($)</Label>
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
              <CardTitle>FD Handler Tiered Rates</CardTitle>
              <CardDescription>
                Payment tiers based on FD count. Formula: (count * rate + bonus) * multiplier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fdTier1Rate">Tier 1 Rate (count &lt; 5) $</Label>
                  <Input
                    id="fdTier1Rate"
                    type="number"
                    step="0.5"
                    value={settings.fdTier1Rate}
                    onChange={(e) => handleSettingChange("fdTier1Rate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdTier2Rate">Tier 2 Rate (5-10) $</Label>
                  <Input
                    id="fdTier2Rate"
                    type="number"
                    step="0.5"
                    value={settings.fdTier2Rate}
                    onChange={(e) => handleSettingChange("fdTier2Rate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdTier3Rate">Tier 3 Rate (10+) $</Label>
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
                  <Label htmlFor="fdBonusThreshold">Bonus Threshold (count &gt;=)</Label>
                  <Input
                    id="fdBonusThreshold"
                    type="number"
                    value={settings.fdBonusThreshold}
                    onChange={(e) => handleSettingChange("fdBonusThreshold", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdBonus">Bonus Amount ($)</Label>
                  <Input
                    id="fdBonus"
                    type="number"
                    step="0.5"
                    value={settings.fdBonus}
                    onChange={(e) => handleSettingChange("fdBonus", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fdMultiplier">Multiplier</Label>
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
                <CardTitle>Active Countries</CardTitle>
                <CardDescription>
                  Manage countries and their local currencies
                </CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Country
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Peru", code: "PE", currency: "SOL", flag: "🇵🇪" },
                  { name: "Italy (Women)", code: "IT_F", currency: "EUR", flag: "🇮🇹" },
                  { name: "Italy (Men)", code: "IT_M", currency: "EUR", flag: "🇮🇹" },
                  { name: "Argentina", code: "AR", currency: "ARS", flag: "🇦🇷" },
                  { name: "Chile", code: "CL", currency: "CLP", flag: "🇨🇱" },
                ].map((country) => (
                  <div
                    key={country.code}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <p className="font-medium">{country.name}</p>
                        <p className="text-sm text-slate-500">Code: {country.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{country.currency}</p>
                        <p className="text-sm text-slate-500">Currency</p>
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
        Save Settings
      </Button>
    </div>
  );
}
