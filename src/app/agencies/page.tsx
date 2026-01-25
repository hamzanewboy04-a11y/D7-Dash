"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Building2, TrendingUp, DollarSign, Calendar, Users, AlertCircle, CheckCircle } from "lucide-react";

interface CrossgifData {
  success: boolean;
  agency: string;
  canUseBalance: number;
  remainingBalance: number;
  totalSpend: number;
  dailySpends: { date: string; amount: number }[];
  desks: { name: string; id: string; canUse: number }[];
}

interface FbmData {
  success: boolean;
  agency: string;
  perMonth: number;
  totalBalance: number;
  dailySpends: { day: number; amount: number }[];
  accounts: { date: string; bayer: string; ads: string; status: string; deposit: number; balance: number }[];
}

interface SyncResult {
  success: boolean;
  results: { agency: string; success: boolean; balance?: number; perMonth?: number; error?: string }[];
  syncedAt: string;
}

export default function AgenciesPage() {
  const [crossgifData, setCrossgifData] = useState<CrossgifData | null>(null);
  const [fbmData, setFbmData] = useState<FbmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [crossgifRes, fbmRes] = await Promise.all([
        fetch("/api/sheets/crossgif?sheetName=1/2026"),
        fetch("/api/sheets/fbm?sheetName=DailySpend_Jan26"),
      ]);

      if (crossgifRes.ok) {
        setCrossgifData(await crossgifRes.json());
      }
      if (fbmRes.ok) {
        setFbmData(await fbmRes.json());
      }
    } catch (err) {
      setError("Ошибка загрузки данных");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/sheets/sync-all", { method: "POST" });
      const data = await response.json();
      setSyncResult(data);
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Агентства</h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Синхронизация..." : "Синхронизировать из Google Sheets"}
        </button>
      </div>

      {syncResult && (
        <div className={`mb-6 p-4 rounded-lg border ${syncResult.success ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            {syncResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="font-medium">Результат синхронизации:</span>
          </div>
          <div className="text-sm space-y-1">
            {syncResult.results.map((r, i) => (
              <div key={i} className={r.success ? "text-green-700" : "text-red-700"}>
                {r.agency}: {r.success ? `✓ Баланс: ${formatMoney(r.balance || 0)}` : `✗ ${r.error}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          {/* CROSSGIF Section */}
          {crossgifData && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">CROSSGIF</h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Can Use</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700">
                      {formatMoney(crossgifData.canUseBalance)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Остаток</span>
                    </div>
                    <div className={`text-2xl font-bold ${crossgifData.remainingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatMoney(crossgifData.remainingBalance)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Спенд за период</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatMoney(crossgifData.totalSpend)}
                    </div>
                  </div>
                </div>

                {crossgifData.dailySpends.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Ежедневные спенды</h3>
                    <div className="flex flex-wrap gap-2">
                      {crossgifData.dailySpends.map((d, i) => (
                        <div key={i} className="bg-slate-100 rounded px-3 py-1 text-sm">
                          <span className="text-slate-500">{d.date}:</span>
                          <span className="font-medium ml-1">{formatMoney(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {crossgifData.desks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Дески</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {crossgifData.desks.map((desk, i) => (
                        <div key={i} className="border border-slate-200 rounded-lg p-3">
                          <div className="font-medium text-slate-900">{desk.name}</div>
                          <div className="text-xs text-slate-500 truncate">{desk.id}</div>
                          <div className="text-sm text-green-600 mt-1">{formatMoney(desk.canUse)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FBM Section */}
          {fbmData && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
                <h2 className="text-xl font-bold text-white">FBM</h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Общий баланс</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatMoney(fbmData.totalBalance)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Per Month</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatMoney(fbmData.perMonth)}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-600 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Аккаунтов</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-700">
                      {fbmData.accounts.filter(a => a.status === "ACTIVE").length}
                    </div>
                  </div>
                </div>

                {fbmData.dailySpends.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Ежедневные спенды</h3>
                    <div className="flex flex-wrap gap-2">
                      {fbmData.dailySpends.map((d, i) => (
                        <div key={i} className="bg-slate-100 rounded px-3 py-1 text-sm">
                          <span className="text-slate-500">{d.day}:</span>
                          <span className="font-medium ml-1">{formatMoney(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fbmData.accounts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">Аккаунты</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Дата</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Баер</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600">Статус</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Депозит</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600">Баланс</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fbmData.accounts.slice(0, 15).map((acc, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-600">{acc.date}</td>
                              <td className="py-2 px-3 font-medium">{acc.bayer}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${acc.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {acc.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">{formatMoney(acc.deposit)}</td>
                              <td className="py-2 px-3 text-right font-medium">{formatMoney(acc.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
