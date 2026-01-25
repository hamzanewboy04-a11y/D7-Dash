"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ArrowDownCircle, ArrowUpCircle, Filter, RefreshCw, ExternalLink } from "lucide-react";

interface Transaction {
  id: string;
  txId: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenSymbol: string;
  timestamp: string;
  isIncoming: boolean;
  isProcessed: boolean;
  processedAt: string | null;
  country: {
    id: string;
    name: string;
    code: string;
  } | null;
  countryWalletName: string | null;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState({
    countryId: "",
    startDate: "",
    endDate: "",
    direction: "", // "incoming", "outgoing", ""
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      
      if (filters.countryId) params.set("countryId", filters.countryId);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await fetch(`/api/wallet/transactions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch");
      
      const data = await response.json();
      
      let txList = data.transactions || [];
      if (filters.direction === "incoming") {
        txList = txList.filter((tx: Transaction) => tx.isIncoming);
      } else if (filters.direction === "outgoing") {
        txList = txList.filter((tx: Transaction) => !tx.isIncoming);
      }
      
      setTransactions(txList);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchCountries = async () => {
    try {
      const response = await fetch("/api/countries");
      if (response.ok) {
        const data = await response.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getBscScanUrl = (txHash: string) => {
    return `https://bscscan.com/tx/${txHash}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      countryId: "",
      startDate: "",
      endDate: "",
      direction: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const totalIncoming = transactions
    .filter((tx) => tx.isIncoming)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalOutgoing = transactions
    .filter((tx) => !tx.isIncoming)
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              История транзакций
            </h1>
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Обновить
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Входящие</p>
                  <p className="text-lg font-semibold text-green-600">
                    +{formatAmount(totalIncoming)} USDT
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ArrowUpCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Исходящие</p>
                  <p className="text-lg font-semibold text-red-600">
                    -{formatAmount(totalOutgoing)} USDT
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Filter className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Всего транзакций</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {pagination.total}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Страна
                </label>
                <select
                  value={filters.countryId}
                  onChange={(e) => handleFilterChange("countryId", e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все страны</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Направление
                </label>
                <select
                  value={filters.direction}
                  onChange={(e) => handleFilterChange("direction", e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все</option>
                  <option value="incoming">Входящие</option>
                  <option value="outgoing">Исходящие</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  С даты
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  По дату
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                Сбросить
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Транзакции не найдены
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Дата
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Тип
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Страна
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Сумма
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          От / Кому
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Статус
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                          TX
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">
                            {formatDate(tx.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {tx.isIncoming ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <ArrowDownCircle className="w-3 h-3" />
                                Входящий
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                <ArrowUpCircle className="w-3 h-3" />
                                Исходящий
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {tx.country ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {tx.country.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-right ${
                            tx.isIncoming ? "text-green-600" : "text-red-600"
                          }`}>
                            {tx.isIncoming ? "+" : "-"}{formatAmount(tx.amount)} {tx.tokenSymbol}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 font-mono">
                            {tx.isIncoming 
                              ? shortenAddress(tx.fromAddress)
                              : shortenAddress(tx.toAddress)
                            }
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {tx.isProcessed ? (
                              <span className="inline-flex px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                Обработан
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                Ожидает
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <a
                              href={getBscScanUrl(tx.txId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                            >
                              <ExternalLink className="w-3 h-3" />
                              BSCScan
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                      Показано {(pagination.page - 1) * pagination.limit + 1} -{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} из{" "}
                      {pagination.total}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        disabled={pagination.page <= 1}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Назад
                      </button>
                      <span className="px-3 py-1 text-sm text-slate-600">
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Вперёд
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
