"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Building2, TrendingUp, DollarSign, Calendar, Users, AlertCircle, CheckCircle } from "lucide-react";

function SpendCalendar({ 
  spends, 
  formatMoney 
}: { 
  spends: { date: string; amount: number }[] | { day: number; amount: number }[];
  formatMoney: (amount: number) => string;
}) {
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  const normalizedSpends = spends.map((s, i) => {
    if ('day' in s) {
      return { day: s.day, amount: s.amount };
    }
    const dayNum = parseInt(s.date.split('/')[0]) || (i + 1);
    return { day: dayNum, amount: s.amount };
  });

  const maxAmount = Math.max(...normalizedSpends.map(s => s.amount), 1);
  
  const getIntensity = (amount: number) => {
    if (amount === 0) return 'bg-slate-100';
    const ratio = amount / maxAmount;
    if (ratio < 0.25) return 'bg-green-100';
    if (ratio < 0.5) return 'bg-yellow-100';
    if (ratio < 0.75) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const firstDayOffset = 2;
  const totalDays = Math.max(...normalizedSpends.map(s => s.day), 31);
  const weeks: (typeof normalizedSpends[0] | null)[][] = [];
  
  let currentWeek: (typeof normalizedSpends[0] | null)[] = Array(firstDayOffset).fill(null);
  
  for (let day = 1; day <= totalDays; day++) {
    const spend = normalizedSpends.find(s => s.day === day) || { day, amount: 0 };
    currentWeek.push(spend);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {daysOfWeek.map((day, i) => (
          <div key={i} className="text-center py-2 text-xs font-medium text-slate-500">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
          {week.map((spend, dayIdx) => (
            <div
              key={dayIdx}
              className={`p-2 min-h-[60px] border-r border-slate-100 last:border-r-0 ${
                spend ? getIntensity(spend.amount) : 'bg-slate-50'
              }`}
            >
              {spend && (
                <>
                  <div className="text-xs font-medium text-slate-600 mb-1">{spend.day}</div>
                  <div className={`text-xs font-semibold ${spend.amount > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formatMoney(spend.amount)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className={`rounded-lg p-4 ${crossgifData.remainingBalance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${crossgifData.remainingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Баланс</span>
                    </div>
                    <div className={`text-2xl font-bold ${crossgifData.remainingBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatMoney(crossgifData.remainingBalance)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Общий спенд</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatMoney(crossgifData.totalSpend)}
                    </div>
                  </div>
                </div>

                {crossgifData.dailySpends.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Ежедневные спенды (Январь 2026)
                    </h3>
                    <SpendCalendar spends={crossgifData.dailySpends} formatMoney={formatMoney} />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className={`rounded-lg p-4 ${fbmData.totalBalance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${fbmData.totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Баланс</span>
                    </div>
                    <div className={`text-2xl font-bold ${fbmData.totalBalance >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {formatMoney(fbmData.totalBalance)}
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Общий спенд</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatMoney(fbmData.dailySpends.reduce((sum, d) => sum + d.amount, 0))}
                    </div>
                  </div>
                </div>

                {fbmData.dailySpends.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Ежедневные спенды (Январь 2026)
                    </h3>
                    <SpendCalendar spends={fbmData.dailySpends} formatMoney={formatMoney} />
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
