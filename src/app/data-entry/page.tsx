"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Check, AlertCircle, Plus, Trash2 } from "lucide-react";

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

interface Priemka {
  id: string;
  name: string;
  code: string;
  commissionRate: number;
  isActive: boolean;
}

interface PriemkaEntry {
  id?: string;
  priemkaId: string;
  countryId: string;
  revenueLocal: number;
  revenueUsdt: number;
  exchangeRate: number;
  priemka?: Priemka;
  isNew?: boolean;
  isDeleted?: boolean;
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

  const [priemkas, setPriemkas] = useState<Priemka[]>([]);
  const [priemkaEntries, setPriemkaEntries] = useState<Record<string, PriemkaEntry[]>>({});
  const [activeCountryTab, setActiveCountryTab] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dataResponse, priemkaResponse, priemkaEntriesResponse] = await Promise.all([
        fetch(`/api/data-entry?date=${date}`),
        fetch('/api/priemka'),
        fetch(`/api/priemka-entries?date=${date}`),
      ]);
      
      const data = await dataResponse.json();
      const priemkaData = await priemkaResponse.json();
      const priemkaEntriesData = await priemkaEntriesResponse.json();
      
      if (data.countries) {
        setCountries(data.countries);
        if (data.countries.length > 0 && !activeCountryTab) {
          setActiveCountryTab(data.countries[0].id);
        }
        
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
      }

      if (Array.isArray(priemkaData)) {
        setPriemkas(priemkaData.filter((p: Priemka) => p.isActive));
      }

      if (Array.isArray(priemkaEntriesData)) {
        const entriesByCountry: Record<string, PriemkaEntry[]> = {};
        priemkaEntriesData.forEach((entry: PriemkaEntry) => {
          if (!entriesByCountry[entry.countryId]) {
            entriesByCountry[entry.countryId] = [];
          }
          entriesByCountry[entry.countryId].push(entry);
        });
        setPriemkaEntries(entriesByCountry);
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [date, activeCountryTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleValueChange = (countryId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEntries((prev) => {
      const currentEntry = prev[countryId] || {};
      const newEntry = { ...currentEntry, [field]: numValue };
      
      if (field === "revenueLocalPriemka" || field === "revenueUsdtPriemka") {
        const localVal = field === "revenueLocalPriemka" ? numValue : (newEntry.revenueLocalPriemka || 0);
        const usdtVal = field === "revenueUsdtPriemka" ? numValue : (newEntry.revenueUsdtPriemka || 0);
        if (usdtVal > 0 && localVal > 0) {
          newEntry.exchangeRatePriemka = parseFloat((localVal / usdtVal).toFixed(4));
        }
      }
      
      if (field === "revenueLocalOwn" || field === "revenueUsdtOwn") {
        const localVal = field === "revenueLocalOwn" ? numValue : (newEntry.revenueLocalOwn || 0);
        const usdtVal = field === "revenueUsdtOwn" ? numValue : (newEntry.revenueUsdtOwn || 0);
        if (usdtVal > 0 && localVal > 0) {
          newEntry.exchangeRateOwn = parseFloat((localVal / usdtVal).toFixed(4));
        }
      }
      
      if (field === "fdSumLocal" || field === "fdSumUsdt") {
        const localVal = field === "fdSumLocal" ? numValue : (newEntry.fdSumLocal || 0);
        const usdtVal = field === "fdSumUsdt" ? numValue : (newEntry.fdSumUsdt || 0);
        if (usdtVal > 0 && localVal > 0) {
          newEntry.exchangeRatePriemka = parseFloat((localVal / usdtVal).toFixed(4));
        }
      }
      
      if (field === "rdSumLocal" || field === "rdSumUsdt") {
        const localVal = field === "rdSumLocal" ? numValue : (newEntry.rdSumLocal || 0);
        const usdtVal = field === "rdSumUsdt" ? numValue : (newEntry.rdSumUsdt || 0);
        if (usdtVal > 0 && localVal > 0) {
          newEntry.exchangeRateOwn = parseFloat((localVal / usdtVal).toFixed(4));
        }
      }
      
      return {
        ...prev,
        [countryId]: newEntry,
      };
    });
    setHasChanges(true);
    setSaveStatus("idle");
  };

  const addPriemkaEntry = (countryId: string) => {
    if (priemkas.length === 0) return;
    
    const newEntry: PriemkaEntry = {
      id: `new-${Date.now()}`,
      priemkaId: priemkas[0].id,
      countryId,
      revenueLocal: 0,
      revenueUsdt: 0,
      exchangeRate: 0,
      isNew: true,
    };
    
    setPriemkaEntries((prev) => ({
      ...prev,
      [countryId]: [...(prev[countryId] || []), newEntry],
    }));
    setHasChanges(true);
    setSaveStatus("idle");
  };

  const updatePriemkaEntry = (countryId: string, index: number, field: string, value: string | number) => {
    setPriemkaEntries((prev) => {
      const countryEntries = [...(prev[countryId] || [])];
      const entry = { ...countryEntries[index] };
      
      if (field === "priemkaId") {
        entry.priemkaId = value as string;
      } else {
        const numValue = parseFloat(value as string) || 0;
        if (field === "revenueLocal") {
          entry.revenueLocal = numValue;
          if (entry.revenueUsdt > 0 && numValue > 0) {
            entry.exchangeRate = parseFloat((numValue / entry.revenueUsdt).toFixed(4));
          }
        } else if (field === "revenueUsdt") {
          entry.revenueUsdt = numValue;
          if (numValue > 0 && entry.revenueLocal > 0) {
            entry.exchangeRate = parseFloat((entry.revenueLocal / numValue).toFixed(4));
          }
        }
      }
      
      countryEntries[index] = entry;
      return { ...prev, [countryId]: countryEntries };
    });
    setHasChanges(true);
    setSaveStatus("idle");
  };

  const removePriemkaEntry = (countryId: string, index: number) => {
    setPriemkaEntries((prev) => {
      const countryEntries = [...(prev[countryId] || [])];
      const entry = countryEntries[index];
      
      if (entry.isNew) {
        countryEntries.splice(index, 1);
      } else {
        countryEntries[index] = { ...entry, isDeleted: true };
      }
      
      return { ...prev, [countryId]: countryEntries };
    });
    setHasChanges(true);
    setSaveStatus("idle");
  };

  const calculateCountryPriemkaTotals = (countryId: string) => {
    const countryEntries = (priemkaEntries[countryId] || []).filter(e => !e.isDeleted);
    return {
      totalLocal: countryEntries.reduce((sum, e) => sum + (e.revenueLocal || 0), 0),
      totalUsdt: countryEntries.reduce((sum, e) => sum + (e.revenueUsdt || 0), 0),
    };
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const entriesArray = Object.values(entries);
      const mainResponse = await fetch("/api/data-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, entries: entriesArray }),
      });

      if (!mainResponse.ok) {
        throw new Error("Failed to save main metrics");
      }

      const priemkaPromises: Promise<Response>[] = [];
      
      Object.entries(priemkaEntries).forEach(([countryId, entries]) => {
        entries.forEach((entry) => {
          if (entry.isDeleted && entry.id && !entry.isNew) {
            priemkaPromises.push(
              fetch(`/api/priemka-entries?id=${entry.id}`, { method: "DELETE" })
            );
          } else if (!entry.isDeleted) {
            if (entry.id && !entry.isNew) {
              priemkaPromises.push(
                fetch("/api/priemka-entries", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: entry.id,
                    priemkaId: entry.priemkaId,
                    revenueLocal: entry.revenueLocal,
                    revenueUsdt: entry.revenueUsdt,
                    exchangeRate: entry.exchangeRate,
                  }),
                })
              );
            } else {
              priemkaPromises.push(
                fetch("/api/priemka-entries", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    priemkaId: entry.priemkaId,
                    countryId,
                    date,
                    revenueLocal: entry.revenueLocal,
                    revenueUsdt: entry.revenueUsdt,
                    exchangeRate: entry.exchangeRate,
                  }),
                })
              );
            }
          }
        });
      });

      await Promise.all(priemkaPromises);

      setSaveStatus("saved");
      setHasChanges(false);
      await loadData();
      setTimeout(() => setSaveStatus("idle"), 3000);
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
        <>
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

          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">Доходы по приёмкам</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {countries.length > 0 && (
                <Tabs value={activeCountryTab} onValueChange={setActiveCountryTab}>
                  <TabsList className="mb-4">
                    {countries.map((country) => (
                      <TabsTrigger key={country.id} value={country.id}>
                        <span className="mr-1">{getCountryFlag(country.code)}</span>
                        {getCountryNameRu(country.name)}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {countries.map((country) => {
                    const countryPriemkaEntries = (priemkaEntries[country.id] || []).filter(e => !e.isDeleted);
                    const totals = calculateCountryPriemkaTotals(country.id);

                    return (
                      <TabsContent key={country.id} value={country.id}>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-slate-600">
                              Записей: {countryPriemkaEntries.length}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addPriemkaEntry(country.id)}
                              disabled={priemkas.length === 0}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Добавить приёмку
                            </Button>
                          </div>

                          {priemkas.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                              Нет доступных приёмок. Добавьте их в настройках.
                            </div>
                          ) : countryPriemkaEntries.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                              Нет записей по приёмкам для этой страны за выбранную дату.
                              <br />
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => addPriemkaEntry(country.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Добавить первую запись
                              </Button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse border border-slate-200 rounded-lg">
                                <thead>
                                  <tr className="bg-slate-100">
                                    <th className="p-3 text-left font-medium border-b border-slate-200">Приёмка</th>
                                    <th className="p-3 text-left font-medium border-b border-slate-200">Доход ({country.currency})</th>
                                    <th className="p-3 text-left font-medium border-b border-slate-200">Доход (USDT)</th>
                                    <th className="p-3 text-left font-medium border-b border-slate-200">Курс</th>
                                    <th className="p-3 text-center font-medium border-b border-slate-200 w-16"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(priemkaEntries[country.id] || []).map((entry, index) => {
                                    if (entry.isDeleted) return null;
                                    return (
                                      <tr key={entry.id || index} className="hover:bg-slate-50">
                                        <td className="p-2 border-b border-slate-200">
                                          <Select
                                            value={entry.priemkaId}
                                            onValueChange={(val) => updatePriemkaEntry(country.id, index, "priemkaId", val)}
                                          >
                                            <SelectTrigger className="w-[180px]">
                                              <SelectValue placeholder="Выберите приёмку" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {priemkas.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                  {p.name} ({p.commissionRate}%)
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="p-2 border-b border-slate-200">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={entry.revenueLocal || ""}
                                            onChange={(e) => updatePriemkaEntry(country.id, index, "revenueLocal", e.target.value)}
                                            placeholder="0"
                                            className="w-32"
                                          />
                                        </td>
                                        <td className="p-2 border-b border-slate-200">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={entry.revenueUsdt || ""}
                                            onChange={(e) => updatePriemkaEntry(country.id, index, "revenueUsdt", e.target.value)}
                                            placeholder="0"
                                            className="w-32"
                                          />
                                        </td>
                                        <td className="p-2 border-b border-slate-200">
                                          <Input
                                            type="number"
                                            step="0.0001"
                                            value={entry.exchangeRate || ""}
                                            disabled
                                            className="w-24 bg-slate-100"
                                          />
                                        </td>
                                        <td className="p-2 border-b border-slate-200 text-center">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removePriemkaEntry(country.id, index)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-100 font-medium">
                                    <td className="p-3 border-t border-slate-300">Итого</td>
                                    <td className="p-3 border-t border-slate-300">
                                      {totals.totalLocal.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 border-t border-slate-300">
                                      {totals.totalUsdt.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 border-t border-slate-300">
                                      {totals.totalUsdt > 0 
                                        ? (totals.totalLocal / totals.totalUsdt).toFixed(4) 
                                        : "-"}
                                    </td>
                                    <td className="p-3 border-t border-slate-300"></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
