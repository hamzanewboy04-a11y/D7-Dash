"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Database } from "lucide-react";

interface Country {
  id: string;
  name: string;
  code: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  total: number;
  columnMapping?: {
    matched: Record<string, string>;
    unmatched: string[];
  };
  sampleData?: Array<{
    date: string;
    totalRevenueUsdt: number;
    revenueUsdtOwn: number;
    totalSpend: number;
  }>;
  errors?: string[];
  parseErrors?: string[];
}

export default function ImportPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await fetch("/api/countries");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCountries(data);
        if (data.length > 0 && !selectedCountry) {
          setSelectedCountry(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching countries:", err);
    } finally {
      setLoadingCountries(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializing(true);
    setInitError(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        setInitError(errorMsg || "Ошибка инициализации");
        return;
      }
      await fetchCountries();
    } catch (err) {
      console.error("Error initializing:", err);
      setInitError(`Не удалось подключиться к серверу: ${err}`);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.match(/\.(xlsx|xls)$/i)) {
        setFile(droppedFile);
        setResult(null);
        setError(null);
      } else {
        setError("Загрузите файл Excel (.xlsx или .xls)");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedCountry) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("countryId", selectedCountry);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка импорта");
        if (data.details) {
          setError(`${data.error}: ${data.details.join(", ")}`);
        }
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Не удалось подключиться к серверу");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Импорт данных</h1>
        <p className="text-slate-500 mt-1">
          Загрузите данные из Excel таблицы
        </p>
      </div>

      {countries.length === 0 && !loadingCountries && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Database className="h-8 w-8 text-amber-600" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">База данных не инициализирована</p>
                  <p className="text-sm text-amber-600">Нажмите кнопку для создания стран и настроек</p>
                </div>
                <Button onClick={initializeDatabase} disabled={initializing}>
                  {initializing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Инициализация...
                    </>
                  ) : (
                    "Инициализировать"
                  )}
                </Button>
              </div>
              {initError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                  {initError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Загрузка Excel файла</CardTitle>
            <CardDescription>
              Загрузите таблицу с ежедневными метриками
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Country Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Страна</label>
              {loadingCountries ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка...
                </div>
              ) : countries.length > 0 ? (
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите страну" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        <span className="mr-2">{getCountryFlag(country.code)}</span>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-slate-500">Сначала инициализируйте базу данных</p>
              )}
            </div>

            {/* File Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : file
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-300 hover:border-slate-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-emerald-600" />
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} МБ
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                  >
                    Удалить
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-700">
                      Перетащите Excel файл сюда
                    </p>
                    <p className="text-sm text-slate-500">или нажмите для выбора</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Выбрать файл
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || !selectedCountry || loading || countries.length === 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Импортировать данные
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Ошибка импорта</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Display */}
            {result && result.success && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-emerald-800">Импорт завершён</p>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="secondary" className="bg-emerald-100">
                        {result.imported} добавлено
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100">
                        {result.updated} обновлено
                      </Badge>
                      <Badge variant="secondary">
                        {result.total} всего строк
                      </Badge>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2 text-sm text-amber-700">
                        <p className="font-medium">Предупреждения:</p>
                        <ul className="list-disc list-inside">
                          {result.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>...и ещё {result.errors.length - 5}</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {/* Sample saved data */}
                    {result.sampleData && result.sampleData.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        <p className="font-medium text-emerald-800 text-sm mb-2">Проверка сохраненных данных:</p>
                        <div className="space-y-1 text-xs">
                          {result.sampleData.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-emerald-50 p-2 rounded">
                              <span className="font-mono">{new Date(item.date).toLocaleDateString("ru-RU")}</span>
                              <span className="text-slate-600">Доход: <strong className="text-emerald-700">${item.totalRevenueUsdt.toFixed(2)}</strong></span>
                              <span className="text-slate-600">USDT Наш: <strong>${item.revenueUsdtOwn.toFixed(2)}</strong></span>
                              <span className="text-slate-600">Спенд: <strong>${item.totalSpend.toFixed(2)}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Column mapping info */}
                    {result.columnMapping && (
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        <p className="font-medium text-emerald-800 text-sm mb-2">Сопоставление колонок:</p>
                        <div className="space-y-1 text-xs">
                          {Object.entries(result.columnMapping.matched).map(([col, field]) => (
                            <div key={col} className="flex items-center gap-2">
                              <span className="text-emerald-600">✓</span>
                              <span className="font-mono bg-emerald-100 px-1 rounded">{col}</span>
                              <span className="text-slate-500">→</span>
                              <span className="text-slate-700">{field}</span>
                            </div>
                          ))}
                        </div>
                        {result.columnMapping.unmatched.length > 0 && (
                          <div className="mt-2">
                            <p className="text-amber-700 text-xs">Не распознаны:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {result.columnMapping.unmatched.map((col) => (
                                <span key={col} className="font-mono text-xs bg-amber-100 px-1 rounded text-amber-800">
                                  {col}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Формат файла</CardTitle>
            <CardDescription>
              Убедитесь, что в Excel файле есть нужные колонки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Обязательные колонки</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Дата</Badge>
                  Дата (ДД.ММ.ГГГГ)
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Траст спенд</Badge>
                  Расход на рекламу Trust
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Кросгиф спенд</Badge>
                  Расход на рекламу Crossgif
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">FBM спенд</Badge>
                  Расход на рекламу FBM
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход SOL Приёмка</Badge>
                  Доход в местной валюте (Приёмка)
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход USDT Приёмка</Badge>
                  Доход в USDT (Приёмка)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Дополнительные колонки</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">ФД кол-во</Badge>
                  Количество ФД
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">ФД сумма SOL</Badge>
                  Сумма ФД в местной валюте
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход SOL Наш</Badge>
                  Наш доход в местной валюте
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход USDT Наш</Badge>
                  Наш доход в USDT
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Chatterfy</Badge>
                  Расходы на Chatterfy
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доп расходы</Badge>
                  Дополнительные расходы
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Автоматические расчёты</h4>
              <p className="text-sm text-slate-600">
                Следующие поля рассчитываются автоматически:
              </p>
              <ul className="mt-2 text-sm text-slate-500 list-disc list-inside">
                <li>Комиссия агентства (9% Trust, 8% Crossgif/FBM)</li>
                <li>Комиссия Приёмки (15%)</li>
                <li>ФОТ (Баер 12%, Обработчик ФД по тарифу, Обработчик РД 4%)</li>
                <li>Чистая прибыль и ROI</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
