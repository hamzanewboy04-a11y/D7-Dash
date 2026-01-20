"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";

interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
}

interface MetricEntry {
  countryId: string;
  totalSpend: number;
  revenueLocalPriemka: number;
  revenueUsdtPriemka: number;
  revenueLocalOwn: number;
  revenueUsdtOwn: number;
  exchangeRatePriemka: number;
  exchangeRateOwn: number;
  fdCount: number;
  fdSumLocal: number;
  fdSumUsdt: number;
  rdCount: number;
  rdSumLocal: number;
  rdSumUsdt: number;
}

const getCountryFlag = (code: string): string => {
  const flags: Record<string, string> = {
    PE: "🇵🇪",
    IT_F: "🇮🇹",
    IT_M: "🇮🇹",
    AR: "🇦🇷",
    CL: "🇨🇱",
  };
  return flags[code] || "🌍";
};

const getCountryNameRu = (name: string): string => {
  const names: Record<string, string> = {
    "Peru": "Перу",
    "Italy (Women)": "Италия (Ж)",
    "Italy (Men)": "Италия (М)",
    "Argentina": "Аргентина",
    "Chile": "Чили",
  };
  return names[name] || name;
};

const metricRows = [
  { key: "totalSpend", label: "Спенд", type: "number" },
  { key: "revenueLocalPriemka", label: "Доход локальный (приёмка)", type: "number" },
  { key: "revenueUsdtPriemka", label: "Доход USDT (приёмка)", type: "number" },
  { key: "exchangeRatePriemka", label: "Курс (приёмка)", type: "number" },
  { key: "revenueLocalOwn", label: "Доход локальный (наш)", type: "number" },
  { key: "revenueUsdtOwn", label: "Доход USDT (наш)", type: "number" },
  { key: "exchangeRateOwn", label: "Курс (наш)", type: "number" },
  { key: "fdCount", label: "ФД количество", type: "number" },
  { key: "fdSumLocal", label: "ФД сумма (лок)", type: "number" },
  { key: "fdSumUsdt", label: "ФД сумма (USDT)", type: "number" },
  { key: "rdCount", label: "РД количество", type: "number" },
  { key: "rdSumLocal", label: "РД сумма (лок)", type: "number" },
  { key: "rdSumUsdt", label: "РД сумма (USDT)", type: "number" },
];

export default function DataEntryPage() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [entries, setEntries] = useState<Record<string, MetricEntry>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-entry?date=${date}`);
      const data = await response.json();
      
      if (data.countries) {
        setCountries(data.countries);
        
        const newEntries: Record<string, MetricEntry> = {};
        data.countries.forEach((country: Country) => {
          const existing = data.metrics?.[country.id];
          newEntries[country.id] = {
            countryId: country.id,
            totalSpend: existing?.totalSpend || 0,
            revenueLocalPriemka: existing?.revenueLocalPriemka || 0,
            revenueUsdtPriemka: existing?.revenueUsdtPriemka || 0,
            revenueLocalOwn: existing?.revenueLocalOwn || 0,
            revenueUsdtOwn: existing?.revenueUsdtOwn || 0,
            exchangeRatePriemka: existing?.exchangeRatePriemka || 0,
            exchangeRateOwn: existing?.exchangeRateOwn || 0,
            fdCount: existing?.fdCount || 0,
            fdSumLocal: existing?.fdSumLocal || 0,
            fdSumUsdt: existing?.fdSumUsdt || 0,
            rdCount: existing?.rdCount || 0,
            rdSumLocal: existing?.rdSumLocal || 0,
            rdSumUsdt: existing?.rdSumUsdt || 0,
          };
        });
        setEntries(newEntries);
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleValueChange = (countryId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEntries((prev) => ({
      ...prev,
      [countryId]: {
        ...prev[countryId],
        [field]: numValue,
      },
    }));
    setHasChanges(true);
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const entriesArray = Object.values(entries);
      const response = await fetch("/api/data-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, entries: entriesArray }),
      });

      if (response.ok) {
        setSaveStatus("saved");
        setHasChanges(false);
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const isValueEmpty = (value: number) => value === 0 || value === null || value === undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Ввод данных</h1>
          <p className="text-slate-500">Введите метрики для всех стран за выбранную дату</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="date" className="text-slate-600">Дата:</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Сохранено
              </>
            ) : saveStatus === "error" ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Ошибка
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить все
              </>
            )}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Есть несохранённые изменения
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
        </div>
      ) : (
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Данные за {new Date(date).toLocaleDateString("ru-RU")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#0f172a] text-white">
                  <th className="p-3 text-left font-medium border-r border-slate-700 min-w-[180px] sticky left-0 bg-[#0f172a] z-10">
                    Метрика
                  </th>
                  {countries.map((country) => (
                    <th key={country.id} className="p-3 text-center font-medium border-r border-slate-700 min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-2xl">{getCountryFlag(country.code)}</span>
                        <span>{getCountryNameRu(country.name)}</span>
                        <span className="text-xs text-slate-400">{country.currency}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row, idx) => (
                  <tr key={row.key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 font-medium text-slate-700 border-r border-slate-200 sticky left-0 bg-inherit z-10">
                      {row.label}
                    </td>
                    {countries.map((country) => {
                      const entry = entries[country.id];
                      const value = entry?.[row.key as keyof MetricEntry] as number || 0;
                      const isEmpty = isValueEmpty(value);
                      return (
                        <td key={country.id} className="p-2 border-r border-slate-200">
                          <Input
                            type="number"
                            step="0.01"
                            value={value || ""}
                            onChange={(e) => handleValueChange(country.id, row.key, e.target.value)}
                            placeholder="0"
                            className={`text-center ${isEmpty ? "bg-amber-50 border-amber-200" : ""}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
