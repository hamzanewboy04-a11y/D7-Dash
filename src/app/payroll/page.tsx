"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, DollarSign, Users, Plus, Pencil, Trash2, Loader2, Calendar, AlertCircle, Wallet } from "lucide-react";

interface Country {
  id: string;
  name: string;
  code: string;
}

interface WeeklyPayroll {
  weekStart: string;
  weekEnd: string;
  totalPayroll: number;
  paidPayroll: number;
  unpaidPayroll: number;
  isPayable: boolean;
  countries: string[];
  days: number;
}

interface PayrollSummary {
  totals: {
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
    payableNow: number;
    bufferAmount: number;
  };
  weeks: WeeklyPayroll[];
  countries: {
    name: string;
    code: string;
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
  }[];
  bufferWeeks: number;
  cutoffDate: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  countryId: string | null;
  country: Country | null;
  fixedRate: number | null;
  percentRate: number | null;
  paymentType: string;
  bufferDays: number;
  paymentDay1: number | null;
  paymentDay2: number | null;
  currentBalance: number;
  isActive: boolean;
  unpaidBalance: number;
}

const paymentTypeLabels: Record<string, string> = {
  buffer: "С буфером",
  day_to_day: "День в день",
  twice_monthly: "2 раза в месяц",
  weekly: "Еженедельно",
  monthly: "Ежемесячно",
};

const roleLabels: Record<string, string> = {
  buyer: "Баер",
  fd_handler: "Обработчик ФД",
  rd_handler: "Обработчик РД",
  content: "Контент",
  designer: "Дизайнер",
  head_designer: "Хед дизайнер",
  reviewer: "Отзовик",
};

const roleDescriptions: Record<string, string> = {
  buyer: "12% от спенда",
  fd_handler: "По тирам (3-5$/шт)",
  rd_handler: "4% от суммы РД",
  content: "Фикс ставка за день",
  designer: "% от суммы или фикс",
  head_designer: "$10 фикс за день",
  reviewer: "За отзыв",
};

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    countryId: "",
    fixedRate: "",
    percentRate: "",
    paymentType: "buffer",
    bufferDays: "7",
    paymentDay1: "",
    paymentDay2: "",
    currentBalance: "0",
  });

  // Fetch employees, countries, and payroll summary
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, countryRes, payrollRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/countries"),
          fetch("/api/payroll/summary"),
        ]);

        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(empData);
        }

        if (countryRes.ok) {
          const countryData = await countryRes.json();
          setCountries(countryData);
        }

        if (payrollRes.ok) {
          const payrollData = await payrollRes.json();
          setPayrollSummary(payrollData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate summaries
  const totalUnpaid = employees.reduce((sum, e) => sum + (e.unpaidBalance || 0), 0);
  const activeEmployees = employees.filter((e) => e.isActive).length;

  // Group by role
  const byRole = employees.reduce((acc, emp) => {
    if (!acc[emp.role]) {
      acc[emp.role] = { count: 0, unpaid: 0 };
    }
    acc[emp.role].count++;
    acc[emp.role].unpaid += emp.unpaidBalance || 0;
    return acc;
  }, {} as Record<string, { count: number; unpaid: number }>);

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      role: employee.role,
      countryId: employee.countryId || "",
      fixedRate: employee.fixedRate?.toString() || "",
      percentRate: employee.percentRate?.toString() || "",
      paymentType: employee.paymentType || "buffer",
      bufferDays: employee.bufferDays?.toString() || "7",
      paymentDay1: employee.paymentDay1?.toString() || "",
      paymentDay2: employee.paymentDay2?.toString() || "",
      currentBalance: employee.currentBalance?.toString() || "0",
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingEmployee(null);
    setFormData({
      name: "",
      role: "",
      countryId: "",
      fixedRate: "",
      percentRate: "",
      paymentType: "buffer",
      bufferDays: "7",
      paymentDay1: "",
      paymentDay2: "",
      currentBalance: "0",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingEmployee ? "PUT" : "POST";
      const body = editingEmployee
        ? { id: editingEmployee.id, ...formData }
        : formData;

      const res = await fetch("/api/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        // Refresh employees
        const empRes = await fetch("/api/employees");
        if (empRes.ok) {
          setEmployees(await empRes.json());
        }
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error saving employee:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить сотрудника?")) return;

    try {
      const res = await fetch(`/api/employees?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEmployees(employees.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ФОТ и Сотрудники</h1>
          <p className="text-slate-500 mt-1">
            Управление сотрудниками, ставками и выплатами
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить сотрудника
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Редактировать сотрудника" : "Новый сотрудник"}
              </DialogTitle>
              <DialogDescription>
                Укажите данные сотрудника и условия оплаты
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Имя сотрудника"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Роль</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите роль" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Страна (необязательно)</Label>
                <Select
                  value={formData.countryId}
                  onValueChange={(v) => setFormData({ ...formData, countryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Все страны" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все страны</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fixedRate">Фикс. ставка ($)</Label>
                  <Input
                    id="fixedRate"
                    type="number"
                    step="0.01"
                    value={formData.fixedRate}
                    onChange={(e) => setFormData({ ...formData, fixedRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentRate">% ставка</Label>
                  <Input
                    id="percentRate"
                    type="number"
                    step="0.01"
                    value={formData.percentRate}
                    onChange={(e) => setFormData({ ...formData, percentRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Настройки выплат</h4>

                <div className="space-y-2">
                  <Label htmlFor="paymentType">Тип выплаты</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(v) => setFormData({ ...formData, paymentType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentType === "buffer" && (
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="bufferDays">Дней буфера</Label>
                    <Input
                      id="bufferDays"
                      type="number"
                      value={formData.bufferDays}
                      onChange={(e) => setFormData({ ...formData, bufferDays: e.target.value })}
                      placeholder="7"
                    />
                  </div>
                )}

                {formData.paymentType === "twice_monthly" && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div className="space-y-2">
                      <Label htmlFor="paymentDay1">День 1 (1-28)</Label>
                      <Input
                        id="paymentDay1"
                        type="number"
                        min="1"
                        max="28"
                        value={formData.paymentDay1}
                        onChange={(e) => setFormData({ ...formData, paymentDay1: e.target.value })}
                        placeholder="15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentDay2">День 2 (1-28)</Label>
                      <Input
                        id="paymentDay2"
                        type="number"
                        min="1"
                        max="28"
                        value={formData.paymentDay2}
                        onChange={(e) => setFormData({ ...formData, paymentDay2: e.target.value })}
                        placeholder="30"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Баланс</h4>
                <div className="space-y-2">
                  <Label htmlFor="currentBalance">Текущий баланс к выплате ($)</Label>
                  <Input
                    id="currentBalance"
                    type="number"
                    step="0.01"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500">
                    Ручное редактирование баланса сотрудника
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.name || !formData.role}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingEmployee ? "Сохранить" : "Создать"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Сотрудников
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees}</div>
            <p className="text-xs text-slate-500 mt-1">Активных</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              К выплате
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              ${totalUnpaid.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Невыплаченный баланс</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Ролей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(byRole).length}</div>
            <p className="text-xs text-slate-500 mt-1">Типов позиций</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Стран
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries.length}</div>
            <p className="text-xs text-slate-500 mt-1">Регионов работы</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="periods">
        <TabsList>
          <TabsTrigger value="periods">Периоды выплат</TabsTrigger>
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
          <TabsTrigger value="byRole">По ролям</TabsTrigger>
          <TabsTrigger value="rates">Ставки и условия</TabsTrigger>
        </TabsList>

        {/* Payment Periods */}
        <TabsContent value="periods" className="space-y-6">
          {/* Summary Cards */}
          {payrollSummary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Всего ФОТ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${payrollSummary.totals.totalPayroll.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">За всё время</p>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-600">
                      К выплате сейчас
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                      ${payrollSummary.totals.payableNow.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Готово к выплате</p>
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-amber-600">
                      В буфере
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600">
                      ${payrollSummary.totals.bufferAmount.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Буфер {payrollSummary.bufferWeeks} нед.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Выплачено
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-400">
                      ${payrollSummary.totals.paidPayroll.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Уже выплачено</p>
                  </CardContent>
                </Card>
              </div>

              {/* By Country */}
              <Card>
                <CardHeader>
                  <CardTitle>ФОТ по странам</CardTitle>
                  <CardDescription>
                    Распределение фонда оплаты труда по странам
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {payrollSummary.countries.map((country) => (
                      <div
                        key={country.code}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                      >
                        <div>
                          <p className="font-medium">{country.name}</p>
                          <p className="text-sm text-slate-500">Код: {country.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">
                            Всего: ${country.totalPayroll.toFixed(2)}
                          </p>
                          {country.unpaidPayroll > 0 && (
                            <p className="font-bold text-orange-500">
                              К выплате: ${country.unpaidPayroll.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Недельные периоды</CardTitle>
                  <CardDescription>
                    ФОТ по неделям (буфер: {payrollSummary.bufferWeeks} нед., дата отсечки: {payrollSummary.cutoffDate})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Неделя</TableHead>
                        <TableHead>Дней</TableHead>
                        <TableHead>Страны</TableHead>
                        <TableHead className="text-right">Всего ФОТ</TableHead>
                        <TableHead className="text-right">К выплате</TableHead>
                        <TableHead className="text-right">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollSummary.weeks.map((week) => (
                        <TableRow key={week.weekStart}>
                          <TableCell className="font-medium">
                            {new Date(week.weekStart).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                            })} — {new Date(week.weekEnd).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </TableCell>
                          <TableCell>{week.days}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {week.countries.map((c) => (
                                <Badge key={c} variant="outline" className="text-xs">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ${week.totalPayroll.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {week.unpaidPayroll > 0 ? (
                              <span className={week.isPayable ? "text-emerald-600 font-medium" : "text-amber-500"}>
                                ${week.unpaidPayroll.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">$0.00</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {week.isPayable ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Готово
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Буфер
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {!payrollSummary && (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет данных о ФОТ</p>
                <p className="text-sm">Добавьте дневные метрики с данными о ФОТ</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Список сотрудников</CardTitle>
              <CardDescription>Все сотрудники команды</CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет сотрудников</p>
                  <p className="text-sm">Добавьте первого сотрудника</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Страна</TableHead>
                      <TableHead className="text-right">Фикс. ставка</TableHead>
                      <TableHead className="text-right">% ставка</TableHead>
                      <TableHead className="text-right">К выплате</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {roleLabels[employee.role] || employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.country?.name || "Все"}</TableCell>
                        <TableCell className="text-right">
                          {employee.fixedRate ? `$${employee.fixedRate.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {employee.percentRate ? `${employee.percentRate}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {employee.unpaidBalance > 0 ? (
                            <span className="text-orange-500 font-medium">
                              ${employee.unpaidBalance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(employee)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Role */}
        <TabsContent value="byRole" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сотрудники по ролям</CardTitle>
              <CardDescription>
                Количество сотрудников и суммы к выплате по ролям
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(roleLabels).map(([role, label]) => {
                  const data = byRole[role] || { count: 0, unpaid: 0 };
                  return (
                    <div
                      key={role}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-slate-500">
                            {roleDescriptions[role]}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">{data.count} сотр.</p>
                        {data.unpaid > 0 && (
                          <p className="font-bold text-orange-500">
                            ${data.unpaid.toFixed(2)} к выплате
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rates */}
        <TabsContent value="rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Условия оплаты</CardTitle>
              <CardDescription>
                Стандартные ставки и формулы расчёта ФОТ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Баер</h4>
                  <p className="text-sm text-slate-600">
                    12% от общего спенда за день. Автоматически рассчитывается из данных метрик.
                  </p>
                  <code className="mt-2 block text-xs bg-slate-100 p-2 rounded">
                    ФОТ = totalSpend × 0.12
                  </code>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Обработчик ФД</h4>
                  <p className="text-sm text-slate-600">
                    По тирам: менее 5 ФД = $3/шт, 5-9 ФД = $4/шт + $15 бонус, 10+ ФД = $5/шт + $15 бонус.
                    Умножается на коэффициент 1.2.
                  </p>
                  <code className="mt-2 block text-xs bg-slate-100 p-2 rounded">
                    ФОТ = (fdCount × rate + bonus) × 1.2
                  </code>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Обработчик РД</h4>
                  <p className="text-sm text-slate-600">
                    4% от суммы РД в USDT.
                  </p>
                  <code className="mt-2 block text-xs bg-slate-100 p-2 rounded">
                    ФОТ = rdSumUsdt × 0.04
                  </code>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Контент</h4>
                  <p className="text-sm text-slate-600">
                    Фиксированная ставка за день работы. Указывается вручную или из Excel ($10/день типично).
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Хед дизайнер</h4>
                  <p className="text-sm text-slate-600">
                    Фиксированная ставка $10 за день.
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Дизайнер</h4>
                  <p className="text-sm text-slate-600">
                    Процент от суммы или фиксированная ставка. Указывается вручную.
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
                  <h4 className="font-medium mb-2 text-amber-800">Периоды выплат</h4>
                  <p className="text-sm text-amber-700">
                    Рекомендуемый буфер: 1 неделя. Выплата производится за работу прошлых недель.
                    Например, если сотрудник работает 3 недели, выплата идёт за первые две.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
