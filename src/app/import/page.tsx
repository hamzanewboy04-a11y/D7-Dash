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
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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
  errors?: string[];
  parseErrors?: string[];
}

export default function ImportPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetch("/api/countries")
      .then((res) => res.json())
      .then((data) => {
        setCountries(data);
        if (data.length > 0) {
          setSelectedCountry(data[0].id);
        }
      })
      .catch(console.error);
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
        setError("Please upload an Excel file (.xlsx or .xls)");
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
        setError(data.error || "Import failed");
        if (data.details) {
          setError(`${data.error}: ${data.details.join(", ")}`);
        }
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Failed to connect to server");
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
        <h1 className="text-3xl font-bold text-slate-900">Import Data</h1>
        <p className="text-slate-500 mt-1">
          Import daily metrics from your Excel spreadsheet
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Excel File</CardTitle>
            <CardDescription>
              Upload your daily metrics spreadsheet to import data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Country Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Country</label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
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
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-slate-400" />
                  <div>
                    <p className="font-medium text-slate-700">
                      Drag and drop your Excel file here
                    </p>
                    <p className="text-sm text-slate-500">or click to browse</p>
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
                      Select File
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={!file || !selectedCountry || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Import Error</p>
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
                    <p className="font-medium text-emerald-800">Import Successful</p>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="secondary" className="bg-emerald-100">
                        {result.imported} imported
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100">
                        {result.updated} updated
                      </Badge>
                      <Badge variant="secondary">
                        {result.total} total rows
                      </Badge>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2 text-sm text-amber-700">
                        <p className="font-medium">Warnings:</p>
                        <ul className="list-disc list-inside">
                          {result.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>...and {result.errors.length - 5} more</li>
                          )}
                        </ul>
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
            <CardTitle>File Format</CardTitle>
            <CardDescription>
              Ensure your Excel file has the correct column names
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Required Columns</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Дата</Badge>
                  Date (DD.MM.YYYY or YYYY-MM-DD)
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Траст спенд</Badge>
                  Trust ad spend
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Кросгиф спенд</Badge>
                  Crossgif ad spend
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">FBM спенд</Badge>
                  FBM ad spend
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход SOL Приёмка</Badge>
                  Revenue in local currency (Priemka)
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход USDT Приёмка</Badge>
                  Revenue in USDT (Priemka)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Optional Columns</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">ФД кол-во</Badge>
                  FD count
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">ФД сумма SOL</Badge>
                  FD sum in local currency
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход SOL Наш</Badge>
                  Own revenue in local
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доход USDT Наш</Badge>
                  Own revenue in USDT
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Chatterfy</Badge>
                  Chatterfy cost
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">Доп расходы</Badge>
                  Additional expenses
                </li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Auto-Calculated Fields</h4>
              <p className="text-sm text-slate-600">
                The following fields are automatically calculated based on your input:
              </p>
              <ul className="mt-2 text-sm text-slate-500 list-disc list-inside">
                <li>Agency fees (9% Trust, 8% Crossgif/FBM)</li>
                <li>Priemka commission (15%)</li>
                <li>Payroll (Buyer 12%, FD Handler tiered, RD Handler 4%)</li>
                <li>Net profit and ROI</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
