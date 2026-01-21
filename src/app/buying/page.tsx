"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Plus,
  RefreshCw,
  Calendar,
  Edit,
  Trash2,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Loader2,
} from "lucide-react";

const DATE_RANGE_OPTIONS = [
  { value: "1", label: "Сегодня" },
  { value: "7", label: "Последняя неделя" },
  { value: "30", label: "Последний месяц" },
  { value: "90", label: "Последние 3 месяца" },
  { value: "all", label: "Всё время" },
  { value: "custom", label: "Свой диапазон" },
];

interface Country {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  country: Country | null;
}

interface BuyerMetric {
  id: string;
  date: string;
  spend: number;
  spendManual: number | null;
  subscriptions: number;
  dialogs: number;
  fdCount: number;
  costPerSubscription: number;
  costPerFd: number;
  conversionRate: number;
  payrollAmount: number;
  deskName: string | null;
  platformName: string | null;
  notes: string | null;
  employee: {
    id: string;
    name: string;
    role: string;
  } | null;
  country: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface Totals {
  _sum: {
    spend: number | null;
    subscriptions: number | null;
    dialogs: number | null;
    fdCount: number | null;
    payrollAmount: number | null;
  };
  _avg: {
    costPerSubscription: number | null;
    costPerFd: number | null;
    conversionRate: number | null;
  };
}

interface FormData {
  date: string;
  employeeId: string;
  countryId: string;
  spendManual: string;
  subscriptions: string;
  dialogs: string;
  fdCount: string;
  deskName: string;
  platformName: string;
  notes: string;
}

const emptyForm: FormData = {
  date: new Date().toISOString().split("T")[0],
  employeeId: "",
  countryId: "",
  spendManual: "",
  subscriptions: "",
  dialogs: "",
  fdCount: "",
  deskName: "",
  platformName: "",
  notes: "",
};

const countryNames: Record<string, string> = {
  Peru: "Перу",
  "Italy (Women)": "Италия (Ж)",
  "Italy (Men)": "Италия (М)",
  Argentina: "Аргентина",
  Chile: "Чили",
};

const getCountryNameRu = (name: string): string => {
  return countryNames[name] || name;
};

export default function BuyingPage() {
  const router = useRouter();
  const { user, loading: authLoading, canEdit } = useAuth();

  const [metrics, setMetrics] = useState<BuyerMetric[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dateRange, setDateRange] = useState<string>("30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<BuyerMetric | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const getDateRangeParams = () => {
    if (dateRange === "all") {
      return {};
    }
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    const days = parseInt(dateRange);
    if (!isNaN(days)) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    }
    return {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateParams = getDateRangeParams();
      const params = new URLSearchParams();
      if (dateParams.startDate) params.set("startDate", dateParams.startDate);
      if (dateParams.endDate) params.set("endDate", dateParams.endDate);
      if (selectedCountry !== "all") params.set("countryId", selectedCountry);
      if (selectedEmployee !== "all") params.set("employeeId", selectedEmployee);

      console.log('[Buying Page] Fetching with params:', {
        dateRange,
        selectedCountry,
        selectedEmployee,
        params: params.toString()
      });

      const response = await fetch(`/api/buying?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Buying Page] Received metrics count:', data.metrics?.length);
        const countryCounts: Record<string, number> = {};
        (data.metrics || []).forEach((m: BuyerMetric) => {
          const countryName = m.country?.name || 'Unknown';
          countryCounts[countryName] = (countryCounts[countryName] || 0) + 1;
        });
        console.log('[Buying Page] Metrics by country:', countryCounts);
        // Filter out records with missing employee or country
        const validMetrics = (data.metrics || []).filter((m: BuyerMetric) => m.employee && m.country);
        setMetrics(validMetrics);
        setTotals(data.totals || null);
      }
    } catch (error) {
      console.error("Error fetching buyer metrics:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.ok) {
        const data = await response.json();
        const buyers = data.filter(
          (emp: Employee) =>
            emp.role.toLowerCase().includes("buyer") ||
            emp.role.toLowerCase().includes("баер") ||
            emp.role.toLowerCase() === "баєр"
        );
        setEmployees(buyers.length > 0 ? buyers : data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCountries();
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, dateRange, customStartDate, customEndDate, selectedCountry, selectedEmployee]);

  const handleOpenDialog = (metric?: BuyerMetric) => {
    if (metric) {
      setEditingMetric(metric);
      setFormData({
        date: metric.date.split("T")[0],
        employeeId: metric.employee?.id || "",
        countryId: metric.country?.id || "",
        spendManual: metric.spendManual?.toString() || metric.spend.toString(),
        subscriptions: metric.subscriptions.toString(),
        dialogs: metric.dialogs.toString(),
        fdCount: metric.fdCount.toString(),
        deskName: metric.deskName || "",
        platformName: metric.platformName || "",
        notes: metric.notes || "",
      });
    } else {
      setEditingMetric(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMetric(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async () => {
    if (!formData.employeeId || !formData.countryId || !formData.date) {
      alert("Заполните обязательные поля: дата, баер, страна");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...(editingMetric && { id: editingMetric.id }),
        date: formData.date,
        employeeId: formData.employeeId,
        countryId: formData.countryId,
        spendManual: parseFloat(formData.spendManual) || 0,
        subscriptions: parseInt(formData.subscriptions) || 0,
        dialogs: parseInt(formData.dialogs) || 0,
        fdCount: parseInt(formData.fdCount) || 0,
        deskName: formData.deskName || null,
        platformName: formData.platformName || null,
        notes: formData.notes || null,
      };

      const response = await fetch("/api/buying", {
        method: editingMetric ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        handleCloseDialog();
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка сохранения");
      }
    } catch (error) {
      console.error("Error saving metric:", error);
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить эту запись?")) return;

    try {
      const response = await fetch(`/api/buying?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting metric:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalSpend = totals?._sum?.spend || 0;
  const totalFd = totals?._sum?.fdCount || 0;
  const avgConversion = totals?._avg?.conversionRate || 0;
  const totalPayroll = totals?._sum?.payrollAmount || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Баинг</h1>
          <p className="text-slate-500 mt-1">
            Метрики баеров: спенд, подписки, конверсия
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {dateRange === "custom" && (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-slate-500">—</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[140px]"
              />
            </div>
          )}
          <Button
            onClick={() => fetchData()}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          {canEdit && (
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#3b82f6]" />
              Общий спенд
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">
              ${totalSpend.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Target className="h-4 w-4 text-[#3b82f6]" />
              Всего ФД
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">{totalFd}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#3b82f6]" />
              Средняя конверсия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">
              {avgConversion.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#3b82f6]" />
              Общая ЗП
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#1e40af]">
              ${totalPayroll.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Метрики баеров</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Все страны" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все страны</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCountryNameRu(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Все баеры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все баеры</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#3b82f6]" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Нет данных за выбранный период
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Дата</TableHead>
                  <TableHead>Баер</TableHead>
                  <TableHead>Страна</TableHead>
                  <TableHead className="text-right">Спенд</TableHead>
                  <TableHead className="text-right">Подписки</TableHead>
                  <TableHead className="text-right">Диалоги</TableHead>
                  <TableHead className="text-right">ФД</TableHead>
                  <TableHead className="text-right">Цена подписки</TableHead>
                  <TableHead className="text-right">Цена ФД</TableHead>
                  <TableHead className="text-right">Конверсия %</TableHead>
                  <TableHead className="text-right">ЗП</TableHead>
                  {canEdit && <TableHead className="text-right">Действия</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <TableRow key={m.id} className="hover:bg-slate-50">
                    <TableCell>
                      {new Date(m.date).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell className="font-medium">{m.employee?.name || '-'}</TableCell>
                    <TableCell>{getCountryNameRu(m.country?.name || '')}</TableCell>
                    <TableCell className="text-right">
                      ${m.spend.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">{m.subscriptions}</TableCell>
                    <TableCell className="text-right">{m.dialogs}</TableCell>
                    <TableCell className="text-right">{m.fdCount}</TableCell>
                    <TableCell className="text-right">
                      ${m.costPerSubscription.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${m.costPerFd.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          m.conversionRate >= 10
                            ? "text-emerald-600"
                            : m.conversionRate >= 5
                            ? "text-amber-600"
                            : "text-red-600"
                        }
                      >
                        {m.conversionRate.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      ${m.payrollAmount.toFixed(2)}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenDialog(m)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(m.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMetric ? "Редактировать запись" : "Добавить метрику баера"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Дата *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="employee">Баер *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите баера" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="country">Страна *</Label>
              <Select
                value={formData.countryId}
                onValueChange={(v) => setFormData({ ...formData, countryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите страну" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getCountryNameRu(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="spend">Спенд ($)</Label>
                <Input
                  id="spend"
                  type="number"
                  step="0.01"
                  value={formData.spendManual}
                  onChange={(e) => setFormData({ ...formData, spendManual: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="subscriptions">Подписки</Label>
                <Input
                  id="subscriptions"
                  type="number"
                  value={formData.subscriptions}
                  onChange={(e) => setFormData({ ...formData, subscriptions: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dialogs">Диалоги</Label>
                <Input
                  id="dialogs"
                  type="number"
                  value={formData.dialogs}
                  onChange={(e) => setFormData({ ...formData, dialogs: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="fdCount">ФД</Label>
                <Input
                  id="fdCount"
                  type="number"
                  value={formData.fdCount}
                  onChange={(e) => setFormData({ ...formData, fdCount: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deskName">Деск</Label>
                <Input
                  id="deskName"
                  value={formData.deskName}
                  onChange={(e) => setFormData({ ...formData, deskName: e.target.value })}
                  placeholder="Название деска"
                />
              </div>
              <div>
                <Label htmlFor="platformName">Платформа</Label>
                <Input
                  id="platformName"
                  value={formData.platformName}
                  onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                  placeholder="Facebook, TikTok..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#1e40af] hover:bg-[#3b82f6]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : editingMetric ? (
                "Сохранить"
              ) : (
                "Добавить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
