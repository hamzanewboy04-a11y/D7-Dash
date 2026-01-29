"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, RefreshCw, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
}

interface CountrySettings {
  id?: string;
  countryId: string;
  priemkaCommissionRate?: number;
  buyerPayrollRate?: number;
  rdHandlerRate?: number;
  fdTier1Rate?: number;
  fdTier2Rate?: number;
  fdTier3Rate?: number;
  fdBonusThreshold?: number;
  fdBonus?: number;
  fdMultiplier?: number;
  headDesignerFixed?: number;
  contentFixedRate?: number;
  designerFixedRate?: number;
  reviewerFixedRate?: number;
  chatterfyCostDefault?: number;
}

// Default values
const DEFAULTS = {
  priemkaCommissionRate: 15,
  buyerPayrollRate: 12,
  rdHandlerRate: 4,
  fdTier1Rate: 3,
  fdTier2Rate: 4,
  fdTier3Rate: 5,
  fdBonusThreshold: 5,
  fdBonus: 15,
  fdMultiplier: 1.2,
  headDesignerFixed: 10,
  contentFixedRate: 15,
  designerFixedRate: 20,
  reviewerFixedRate: 10,
  chatterfyCostDefault: 0,
};

export default function CountryCalculationSettings({ countries }: { countries: Country[] }) {
  const [selectedCountryId, setSelectedCountryId] = useState<string>("");
  const [settings, setSettings] = useState<CountrySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load settings when country is selected
  useEffect(() => {
    if (selectedCountryId) {
      loadSettings(selectedCountryId);
    }
  }, [selectedCountryId]);

  const loadSettings = async (countryId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/countries/settings?countryId=${countryId}`);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          // Convert decimal rates to percentages for display
          const displayData = {
            ...data,
            priemkaCommissionRate: data.priemkaCommissionRate !== undefined ? data.priemkaCommissionRate * 100 : undefined,
            buyerPayrollRate: data.buyerPayrollRate !== undefined ? data.buyerPayrollRate * 100 : undefined,
            rdHandlerRate: data.rdHandlerRate !== undefined ? data.rdHandlerRate * 100 : undefined,
          };
          setSettings(displayData);
        } else {
          setSettings({ countryId });
        }
      } else {
        setSettings({ countryId });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettings({ countryId });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      // Convert percentage inputs to decimals
      const settingsToSave = {
        ...settings,
        priemkaCommissionRate: settings.priemkaCommissionRate ? settings.priemkaCommissionRate / 100 : undefined,
        buyerPayrollRate: settings.buyerPayrollRate ? settings.buyerPayrollRate / 100 : undefined,
        rdHandlerRate: settings.rdHandlerRate ? settings.rdHandlerRate / 100 : undefined,
      };

      const response = await fetch("/api/countries/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToSave),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Настройки успешно сохранены" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: "Ошибка при сохранении настроек" });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Ошибка при сохранении настроек" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!settings || !selectedCountryId) return;

    if (!confirm("Сбросить все настройки для этой страны на значения по умолчанию?")) {
      return;
    }

    try {
      await fetch(`/api/countries/settings?countryId=${selectedCountryId}`, {
        method: "DELETE",
      });
      setSettings({ countryId: selectedCountryId });
      setMessage({ type: "success", text: "Настройки сброшены на значения по умолчанию" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error resetting settings:", error);
      setMessage({ type: "error", text: "Ошибка при сбросе настроек" });
    }
  };

  const updateSetting = (key: keyof CountrySettings, value: number | undefined) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const getDisplayValue = (key: keyof CountrySettings, isPercentage: boolean = false): number => {
    if (!settings) return 0;
    const value = settings[key];
    if (value === undefined || value === null) {
      const defaultValue = DEFAULTS[key as keyof typeof DEFAULTS] || 0;
      return isPercentage ? defaultValue : defaultValue;
    }
    return isPercentage ? Number(value) * 100 : Number(value);
  };

  const selectedCountry = countries.find((c) => c.id === selectedCountryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Настройки расчётов по стране
        </CardTitle>
        <CardDescription>
          Кастомизируйте формулы расчётов для каждой страны. Если значение не задано, используется глобальное по умолчанию.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Country Selection */}
        <div className="space-y-2">
          <Label>Выберите проект (страну)</Label>
          <Select value={selectedCountryId} onValueChange={setSelectedCountryId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите страну..." />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.id} value={country.id}>
                  {country.name} ({country.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-slate-400" />
          </div>
        )}

        {selectedCountry && settings && !loading && (
          <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Настройки для: {selectedCountry.name}</p>
                <p className="text-xs">
                  Пустые поля означают использование глобальных значений по умолчанию.
                  Проценты вводятся как числа (например, "15" для 15%).
                </p>
              </div>
            </div>

            {/* Commission Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                Комиссии и ставки
                <Badge variant="outline">%</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>
                    Комиссия приёмки (%)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: {DEFAULTS.priemkaCommissionRate}%</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={String(DEFAULTS.priemkaCommissionRate)}
                    value={settings.priemkaCommissionRate !== undefined ? getDisplayValue("priemkaCommissionRate", true) : ""}
                    onChange={(e) =>
                      updateSetting("priemkaCommissionRate", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Ставка баера (%)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: {DEFAULTS.buyerPayrollRate}%</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={String(DEFAULTS.buyerPayrollRate)}
                    value={settings.buyerPayrollRate !== undefined ? getDisplayValue("buyerPayrollRate", true) : ""}
                    onChange={(e) =>
                      updateSetting("buyerPayrollRate", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Ставка обработчика РД (%)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: {DEFAULTS.rdHandlerRate}%</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={String(DEFAULTS.rdHandlerRate)}
                    value={settings.rdHandlerRate !== undefined ? getDisplayValue("rdHandlerRate", true) : ""}
                    onChange={(e) =>
                      updateSetting("rdHandlerRate", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            </div>

            {/* FD Tier Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                ФД Тиры
                <Badge variant="outline">$</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>
                    Тир 1 (&lt; 5 ФД) ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.fdTier1Rate}</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder={String(DEFAULTS.fdTier1Rate)}
                    value={settings.fdTier1Rate ?? ""}
                    onChange={(e) => updateSetting("fdTier1Rate", e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Тир 2 (5-10 ФД) ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.fdTier2Rate}</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder={String(DEFAULTS.fdTier2Rate)}
                    value={settings.fdTier2Rate ?? ""}
                    onChange={(e) => updateSetting("fdTier2Rate", e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Тир 3 (&gt; 10 ФД) ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.fdTier3Rate}</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder={String(DEFAULTS.fdTier3Rate)}
                    value={settings.fdTier3Rate ?? ""}
                    onChange={(e) => updateSetting("fdTier3Rate", e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>
                    Порог бонуса (кол-во ФД)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: {DEFAULTS.fdBonusThreshold}</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder={String(DEFAULTS.fdBonusThreshold)}
                    value={settings.fdBonusThreshold ?? ""}
                    onChange={(e) =>
                      updateSetting("fdBonusThreshold", e.target.value ? parseInt(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Бонус ФД ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.fdBonus}</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(DEFAULTS.fdBonus)}
                    value={settings.fdBonus ?? ""}
                    onChange={(e) => updateSetting("fdBonus", e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Множитель ФД
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: {DEFAULTS.fdMultiplier}</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder={String(DEFAULTS.fdMultiplier)}
                    value={settings.fdMultiplier ?? ""}
                    onChange={(e) => updateSetting("fdMultiplier", e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>
            </div>

            {/* Fixed Rates */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                Фиксированные ставки
                <Badge variant="outline">$</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Хед дизайнер ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.headDesignerFixed}</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(DEFAULTS.headDesignerFixed)}
                    value={settings.headDesignerFixed ?? ""}
                    onChange={(e) =>
                      updateSetting("headDesignerFixed", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Контент ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.contentFixedRate}</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(DEFAULTS.contentFixedRate)}
                    value={settings.contentFixedRate ?? ""}
                    onChange={(e) =>
                      updateSetting("contentFixedRate", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Дизайнер ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.designerFixedRate}</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(DEFAULTS.designerFixedRate)}
                    value={settings.designerFixedRate ?? ""}
                    onChange={(e) =>
                      updateSetting("designerFixedRate", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Отзовик ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.reviewerFixedRate}</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(DEFAULTS.reviewerFixedRate)}
                    value={settings.reviewerFixedRate ?? ""}
                    onChange={(e) =>
                      updateSetting("reviewerFixedRate", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                Дополнительные расходы
                <Badge variant="outline">$</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Chatterfy по умолчанию ($)
                    <span className="text-xs text-slate-500 ml-2">по умолчанию: ${DEFAULTS.chatterfyCostDefault}</span>
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder={String(DEFAULTS.chatterfyCostDefault)}
                    value={settings.chatterfyCostDefault ?? ""}
                    onChange={(e) =>
                      updateSetting("chatterfyCostDefault", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить настройки
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Сбросить на умолчания
              </Button>
            </div>
          </>
        )}

        {!selectedCountryId && !loading && (
          <p className="text-center text-slate-500 py-8">Выберите страну для настройки расчётов</p>
        )}
      </CardContent>
    </Card>
  );
}
