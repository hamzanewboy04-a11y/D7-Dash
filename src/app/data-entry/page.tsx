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
  countryId: string | null;
  country?: { id: string; name: string; code: string } | null;
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
    const numValue = field.includes("Count") ? parseInt(value) || 0 : parseFloat(value) || 0;
    setEntries((prev) => ({
      ...prev,
      [countryId]: { ...prev[countryId], [field]: numValue },
    }));
    setHasChanges(true);
    setSaveStatus("idle");
  };

  const getFilteredPriemkas = (countryId: string) => {
    return priemkas.filter(p => p.countryId === null || p.countryId === countryId);
  };

  const addPriemkaEntry = (countryId: string) => {
    const filteredPriemkas = getFilteredPriemkas(countryId);
    if (filteredPriemkas.length === 0) return;
    
    const newEntry: PriemkaEntry = {
      id: `new-${Date.now()}`,
      priemkaId: filteredPriemkas[0].id,
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
    const totalLocal = countryEntries.reduce((sum, e) => sum + (e.revenueLocal || 0), 0);
    const totalUsdt = countryEntries.reduce((sum, e) => sum + (e.revenueUsdt || 0), 0);
    const avgRate = totalUsdt > 0 ? totalLocal / totalUsdt : 0;
    return { totalLocal, totalUsdt, avgRate };
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

  const getCurrentCountry = () => countries.find(c => c.id === activeCountryTab);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Ввод данных</h1>
          <p className="text-slate-500">Введите метрики по странам за выбранную дату</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <Label htmlFor="date" className="text-slate-600 whitespace-nowrap">Дата:</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 border-0 p-0 h-auto focus-visible:ring-0"
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
                Сохранить
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
        <Tabs value={activeCountryTab} onValueChange={setActiveCountryTab}>
          <TabsList className="bg-slate-100 p-1 mb-6">
            {countries.map((country) => (
              <TabsTrigger 
                key={country.id} 
                value={country.id}
                className="data-[state=active]:bg-[#0f172a] data-[state=active]:text-white px-6 py-2"
              >
                <span className="text-xl mr-2">{getCountryFlag(country.code)}</span>
                {getCountryNameRu(country.name)}
              </TabsTrigger>
            ))}
          </TabsList>

          {countries.map((country) => {
            const entry = entries[country.id] || {};
            const countryPriemkaEntries = (priemkaEntries[country.id] || []).filter(e => !e.isDeleted);
            const totals = calculateCountryPriemkaTotals(country.id);
            const filteredPriemkas = getFilteredPriemkas(country.id);

            return (
              <TabsContent key={country.id} value={country.id} className="space-y-6">
                <Card>
                  <CardHeader className="bg-[#0f172a] text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{getCountryFlag(country.code)}</span>
                      Основные метрики — {getCountryNameRu(country.name)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium">Спенд (USDT)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.totalSpend || ""}
                          onChange={(e) => handleValueChange(country.id, "totalSpend", e.target.value)}
                          placeholder="0.00"
                          className="text-lg"
                        />
                      </div>
                      
                      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="space-y-2">
                          <Label className="text-blue-700 font-medium">FD кол-во</Label>
                          <Input
                            type="number"
                            value={entry.fdCount || ""}
                            onChange={(e) => handleValueChange(country.id, "fdCount", e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-700 font-medium">FD сумма ({country.currency})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.fdSumLocal || ""}
                            onChange={(e) => handleValueChange(country.id, "fdSumLocal", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-700 font-medium">FD сумма (USDT)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.fdSumUsdt || ""}
                            onChange={(e) => handleValueChange(country.id, "fdSumUsdt", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg border border-green-100">
                        <div className="space-y-2">
                          <Label className="text-green-700 font-medium">RD кол-во</Label>
                          <Input
                            type="number"
                            value={entry.rdCount || ""}
                            onChange={(e) => handleValueChange(country.id, "rdCount", e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-green-700 font-medium">RD сумма ({country.currency})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.rdSumLocal || ""}
                            onChange={(e) => handleValueChange(country.id, "rdSumLocal", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-green-700 font-medium">RD сумма (USDT)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={entry.rdSumUsdt || ""}
                            onChange={(e) => handleValueChange(country.id, "rdSumUsdt", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="bg-slate-100 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Приёмки (доходы по платёжным системам)</CardTitle>
                    <Button
                      size="sm"
                      onClick={() => addPriemkaEntry(country.id)}
                      disabled={filteredPriemkas.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4">
                    {filteredPriemkas.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        Нет доступных приёмок для этой страны. Добавьте их в настройках.
                      </div>
                    ) : countryPriemkaEntries.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        Нет записей по приёмкам за {new Date(date).toLocaleDateString("ru-RU")}
                        <br />
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => addPriemkaEntry(country.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Добавить первую запись
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-slate-600 text-sm">
                                <th className="p-3 text-left font-medium border-b">Приёмка</th>
                                <th className="p-3 text-left font-medium border-b">Доход ({country.currency})</th>
                                <th className="p-3 text-left font-medium border-b">Доход (USDT)</th>
                                <th className="p-3 text-left font-medium border-b">Курс</th>
                                <th className="p-3 text-center font-medium border-b w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(priemkaEntries[country.id] || []).map((entry, index) => {
                                if (entry.isDeleted) return null;
                                return (
                                  <tr key={entry.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-2">
                                      <Select
                                        value={entry.priemkaId}
                                        onValueChange={(val) => updatePriemkaEntry(country.id, index, "priemkaId", val)}
                                      >
                                        <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder="Выберите" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {filteredPriemkas.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.name}
                                              {p.countryId === null && <span className="text-slate-400 ml-1">(все)</span>}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </td>
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={entry.revenueLocal || ""}
                                        onChange={(e) => updatePriemkaEntry(country.id, index, "revenueLocal", e.target.value)}
                                        placeholder="0.00"
                                        className="w-32"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={entry.revenueUsdt || ""}
                                        onChange={(e) => updatePriemkaEntry(country.id, index, "revenueUsdt", e.target.value)}
                                        placeholder="0.00"
                                        className="w-32"
                                      />
                                    </td>
                                    <td className="p-2 text-slate-600">
                                      {entry.exchangeRate > 0 ? entry.exchangeRate.toFixed(4) : "—"}
                                    </td>
                                    <td className="p-2 text-center">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removePriemkaEntry(country.id, index)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                                <td className="p-3 text-slate-700">Итого</td>
                                <td className="p-3 text-slate-700">{totals.totalLocal.toFixed(2)}</td>
                                <td className="p-3 text-slate-700">{totals.totalUsdt.toFixed(2)}</td>
                                <td className="p-3 text-slate-600">{totals.avgRate > 0 ? totals.avgRate.toFixed(4) : "—"}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
