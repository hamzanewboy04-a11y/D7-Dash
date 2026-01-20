"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CheckCircle, Clock, DollarSign, Users, Plus, Pencil, Trash2, Loader2, Calendar, AlertCircle, Wallet, CreditCard, History } from "lucide-react";

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

interface EmployeePayrollCalc {
  employeeId: string;
  employeeName: string;
  role: string;
  calculatedAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  activeProjects: number;
  details: {
    metric: string;
    value: number;
    rate: number;
    amount: number;
  }[];
}

interface PayrollSummary {
  totals: {
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
    payableNow: number;
    bufferAmount: number;
    calculatedTotal: number;
  };
  weeks: WeeklyPayroll[];
  countries: {
    name: string;
    code: string;
    totalPayroll: number;
    paidPayroll: number;
    unpaidPayroll: number;
  }[];
  employees: EmployeePayrollCalc[];
  bufferWeeks: number;
  cutoffDate: string;
  periodStart: string;
  periodEnd: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  countryId: string | null;
  country: Country | null;
  fixedRate: number | null;
  percentRate: number | null;
  percentageBase: string | null;
  fdBonusThreshold: number | null;
  fdBonus: number | null;
  notes: string | null;
  startDate: string | null;
  contractType: string | null;
  paymentType: string;
  bufferDays: number;
  paymentDay1: number | null;
  paymentDay2: number | null;
  currentBalance: number;
  isActive: boolean;
  unpaidBalance: number;
}

interface Payment {
  id: string;
  employeeId: string;
  employee: Employee;
  amount: number;
  paymentDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  nextPaymentDate: string | null;
  notes: string | null;
  paymentType: string;
  status: string;
  createdAt: string;
}

const paymentCategoryLabels: Record<string, string> = {
  salary: "Зарплата",
  bonus: "Бонус",
  advance: "Аванс",
  other: "Другое",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Ожидает",
  paid: "Выплачено",
};

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

const percentageBaseLabels: Record<string, string> = {
  spend: "От спенда",
  net_profit: "От чистой прибыли",
  gross_revenue: "От валового дохода",
  fd_sum: "От суммы ФД",
  rd_sum: "От суммы РД",
  all_payments: "От всех платежей",
};

const defaultRoles = ["buyer", "fd_handler", "rd_handler", "content", "designer", "head_designer", "reviewer"];

const getRoleLabel = (role: string): string => {
  return roleLabels[role] || role;
};

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Form state for employee
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    countryId: "",
    fixedRate: "",
    percentRate: "",
    percentageBase: "",
    fdBonusThreshold: "",
    fdBonus: "",
    notes: "",
    startDate: "",
    contractType: "",
    paymentType: "buffer",
    bufferDays: "7",
    paymentDay1: "",
    paymentDay2: "",
    currentBalance: "0",
  });

  // Form state for payment
  const [paymentFormData, setPaymentFormData] = useState({
    employeeId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    periodStart: "",
    periodEnd: "",
    nextPaymentDate: "",
    notes: "",
    paymentType: "salary",
  });

  // Fetch employees, countries, payments, and payroll summary
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, countryRes, payrollRes, paymentsRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/countries"),
          fetch("/api/payroll/summary"),
          fetch("/api/payments"),
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

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json();
          setPayments(paymentsData);
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
      percentageBase: employee.percentageBase || "",
      fdBonusThreshold: employee.fdBonusThreshold?.toString() || "",
      fdBonus: employee.fdBonus?.toString() || "",
      notes: employee.notes || "",
      startDate: employee.startDate ? employee.startDate.split("T")[0] : "",
      contractType: employee.contractType || "",
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
      percentageBase: "",
      fdBonusThreshold: "",
      fdBonus: "",
      notes: "",
      startDate: "",
      contractType: "",
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

  // Payment functions
  const resetPaymentForm = () => {
    setPaymentFormData({
      employeeId: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      periodStart: "",
      periodEnd: "",
      nextPaymentDate: "",
      notes: "",
      paymentType: "salary",
    });
  };

  const openPaymentDialog = () => {
    resetPaymentForm();
    setIsPaymentDialogOpen(true);
  };

  const handleSavePayment = async () => {
    setSavingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentFormData),
      });

      if (res.ok) {
        const newPayment = await res.json();
        setPayments([newPayment, ...payments]);
        setIsPaymentDialogOpen(false);
        resetPaymentForm();
      }
    } catch (error) {
      console.error("Error saving payment:", error);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const res = await fetch("/api/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId, status: "paid" }),
      });

      if (res.ok) {
        setPayments(payments.map((p) =>
          p.id === paymentId ? { ...p, status: "paid" } : p
        ));
        // Refresh employee data
        const empRes = await fetch("/api/employees");
        if (empRes.ok) {
          setEmployees(await empRes.json());
        }
      }
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Удалить выплату?")) return;

    try {
      const res = await fetch(`/api/payments?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setPayments(payments.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
    }
  };

  // Calculate payment stats
  const totalPaymentsAmount = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPaymentsAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

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
        <div className="flex gap-2">
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openPaymentDialog} className="bg-blue-600 hover:bg-blue-700">
                <CreditCard className="h-4 w-4 mr-2" />
                Внести выплату
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Внести выплату</DialogTitle>
                <DialogDescription>
                  Заполните данные о выплате сотруднику
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-employee">Сотрудник *</Label>
                  <Select
                    value={paymentFormData.employeeId}
                    onValueChange={(v) => setPaymentFormData({ ...paymentFormData, employeeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(e => e.isActive).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({getRoleLabel(emp.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Сумма ($) *</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Дата выплаты *</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-type">Тип выплаты</Label>
                  <Select
                    value={paymentFormData.paymentType}
                    onValueChange={(v) => setPaymentFormData({ ...paymentFormData, paymentType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentCategoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">Период (необязательно)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="period-start">Начало периода</Label>
                      <Input
                        id="period-start"
                        type="date"
                        value={paymentFormData.periodStart}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, periodStart: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period-end">Конец периода</Label>
                      <Input
                        id="period-end"
                        type="date"
                        value={paymentFormData.periodEnd}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, periodEnd: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next-payment-date">Следующая выплата (необязательно)</Label>
                  <Input
                    id="next-payment-date"
                    type="date"
                    value={paymentFormData.nextPaymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, nextPaymentDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-notes">Заметки (необязательно)</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder="Дополнительная информация о выплате..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  onClick={handleSavePayment}
                  disabled={savingPayment || !paymentFormData.employeeId || !paymentFormData.amount || !paymentFormData.paymentDate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {savingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Добавить сотрудника
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Редактировать сотрудника" : "Новый сотрудник"}
              </DialogTitle>
              <DialogDescription>
                Укажите данные сотрудника и условия оплаты
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2">
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
                  <Input
                    id="role"
                    list="role-suggestions"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="Введите или выберите роль"
                  />
                  <datalist id="role-suggestions">
                    {defaultRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </datalist>
                  {formData.role && roleDescriptions[formData.role] && (
                    <p className="text-xs text-slate-500">{roleDescriptions[formData.role]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Страна (необязательно)</Label>
                  <Select
                    value={formData.countryId || undefined}
                    onValueChange={(v) => setFormData({ ...formData, countryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Все страны" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">Ставки</h4>
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
                  
                  {formData.percentRate && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="percentageBase">Процент от чего</Label>
                      <Select
                        value={formData.percentageBase || undefined}
                        onValueChange={(v) => setFormData({ ...formData, percentageBase: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите базу для процента" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(percentageBaseLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">Бонус (необязательно)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fdBonusThreshold">Порог бонуса</Label>
                      <Input
                        id="fdBonusThreshold"
                        type="number"
                        step="1"
                        value={formData.fdBonusThreshold}
                        onChange={(e) => setFormData({ ...formData, fdBonusThreshold: e.target.value })}
                        placeholder="5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fdBonus">Сумма бонуса ($)</Label>
                      <Input
                        id="fdBonus"
                        type="number"
                        step="0.5"
                        value={formData.fdBonus}
                        onChange={(e) => setFormData({ ...formData, fdBonus: e.target.value })}
                        placeholder="15"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">Дополнительная информация</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Дата начала работы</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contractType">Тип контракта</Label>
                        <Select
                          value={formData.contractType || undefined}
                          onValueChange={(v) => setFormData({ ...formData, contractType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Полная занятость</SelectItem>
                            <SelectItem value="part-time">Частичная занятость</SelectItem>
                            <SelectItem value="contractor">Подрядчик</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Заметки</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Дополнительные заметки о сотруднике..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
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

                <div className="border-t pt-4 mt-2">
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
            </div>

            <DialogFooter className="mt-4 pt-4 border-t">
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
      <Tabs defaultValue="calculated">
        <TabsList>
          <TabsTrigger value="calculated" className="text-emerald-600 data-[state=active]:bg-emerald-50">
            <DollarSign className="h-4 w-4 mr-1" />
            Начислено
          </TabsTrigger>
          <TabsTrigger value="history" className="text-blue-600 data-[state=active]:bg-blue-50">
            <History className="h-4 w-4 mr-1" />
            История выплат
          </TabsTrigger>
          <TabsTrigger value="periods">Периоды выплат</TabsTrigger>
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
          <TabsTrigger value="byRole">По ролям</TabsTrigger>
          <TabsTrigger value="rates">Ставки и условия</TabsTrigger>
        </TabsList>

        {/* Calculated Payroll - Начислено */}
        <TabsContent value="calculated" className="space-y-6">
          {payrollSummary && payrollSummary.employees && payrollSummary.employees.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-emerald-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-600">
                      Всего начислено
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                      ${payrollSummary.totals.calculatedTotal?.toFixed(2) || "0.00"}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      За период {payrollSummary.periodStart} — {payrollSummary.periodEnd}
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
                    <div className="text-2xl font-bold">
                      ${payrollSummary.employees.reduce((sum, e) => sum + e.paidAmount, 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">За период</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600">
                      Остаток к выплате
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ${payrollSummary.employees.reduce((sum, e) => sum + Math.max(0, e.unpaidAmount), 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Начислено - Выплачено</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Сотрудников
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{payrollSummary.employees.length}</div>
                    <p className="text-xs text-slate-500 mt-1">С начислениями</p>
                  </CardContent>
                </Card>
              </div>

              {/* Employee Payroll Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Начисления по сотрудникам</CardTitle>
                  <CardDescription>
                    Расчёт ФОТ за период {payrollSummary.periodStart} — {payrollSummary.periodEnd}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Сотрудник</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Проекты</TableHead>
                        <TableHead>Расчёт</TableHead>
                        <TableHead className="text-right">Начислено</TableHead>
                        <TableHead className="text-right">Выплачено</TableHead>
                        <TableHead className="text-right">Остаток</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollSummary.employees.map((emp) => (
                        <TableRow key={emp.employeeId}>
                          <TableCell className="font-medium">{emp.employeeName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getRoleLabel(emp.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{emp.activeProjects}</Badge>
                          </TableCell>
                          <TableCell>
                            {emp.details.length > 0 && (
                              <div className="text-xs text-slate-500">
                                {emp.details.map((d, i) => (
                                  <div key={i}>
                                    {d.metric}: {d.value.toFixed(2)} × {d.rate}%
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            ${emp.calculatedAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${emp.paidAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {emp.unpaidAmount > 0 ? (
                              <span className="text-orange-500 font-medium">
                                ${emp.unpaidAmount.toFixed(2)}
                              </span>
                            ) : emp.unpaidAmount < 0 ? (
                              <span className="text-blue-500 font-medium">
                                +${Math.abs(emp.unpaidAmount).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">$0.00</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет данных о начислениях</p>
                <p className="text-sm">Добавьте сотрудников и дневные метрики с данными об активности</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="history" className="space-y-6">
          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600">
                  Всего выплат
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {payments.length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Записей в истории</p>
              </CardContent>
            </Card>

            <Card className="border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600">
                  Выплачено
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  ${totalPaymentsAmount.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-1">Подтверждённые выплаты</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">
                  Ожидает выплаты
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ${pendingPaymentsAmount.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500 mt-1">В ожидании</p>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>История выплат</CardTitle>
              <CardDescription>
                Все записи о выплатах сотрудникам
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет записей о выплатах</p>
                  <p className="text-sm">Используйте кнопку &quot;Внести выплату&quot; для добавления</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Сотрудник</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                      <TableHead>Период</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {new Date(payment.paymentDate).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.employee?.name || "—"}</p>
                            <p className="text-xs text-slate-500">
                              {getRoleLabel(payment.employee?.role || "")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {payment.periodStart && payment.periodEnd ? (
                            <span className="text-sm">
                              {new Date(payment.periodStart).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                              })} — {new Date(payment.periodEnd).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {paymentCategoryLabels[payment.paymentType] || payment.paymentType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.status === "paid" ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Выплачено
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700">
                              <Clock className="h-3 w-3 mr-1" />
                              Ожидает
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {payment.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-emerald-600"
                                onClick={() => handleMarkAsPaid(payment.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Payment Periods */}
        <TabsContent value="periods" className="space-y-6">
          {payrollSummary ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Буферный период
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{payrollSummary.bufferWeeks} нед.</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Минимальный буфер для выплат
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Доступно к выплате
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-500">
                      ${payrollSummary.totals.payableNow.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      После буферного периода
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      В буфере
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      ${payrollSummary.totals.bufferAmount.toFixed(2)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Ожидает истечения буфера
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Недельные периоды</CardTitle>
                  <CardDescription>
                    Разбивка ФОТ по неделям с учётом буферного периода
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Период</TableHead>
                        <TableHead>Дней</TableHead>
                        <TableHead>Страны</TableHead>
                        <TableHead className="text-right">Всего</TableHead>
                        <TableHead className="text-right">Выплачено</TableHead>
                        <TableHead className="text-right">Осталось</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollSummary.weeks.map((week, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {week.weekStart} — {week.weekEnd}
                          </TableCell>
                          <TableCell>{week.days}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {week.countries.slice(0, 3).map((c) => (
                                <Badge key={c} variant="outline" className="text-xs">
                                  {c}
                                </Badge>
                              ))}
                              {week.countries.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{week.countries.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${week.totalPayroll.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${week.paidPayroll.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            ${week.unpaidPayroll.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {week.isPayable ? (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                К выплате
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600">
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
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нет данных о периодах выплат</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Employees List */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Список сотрудников</CardTitle>
              <CardDescription>
                Все сотрудники и их текущие балансы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Страна</TableHead>
                    <TableHead>Тип выплат</TableHead>
                    <TableHead className="text-right">К выплате</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getRoleLabel(emp.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{emp.country?.name || "Все"}</TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {paymentTypeLabels[emp.paymentType] || emp.paymentType}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(emp.unpaidBalance || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {emp.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            Активен
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Неактивен
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(emp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDelete(emp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Role */}
        <TabsContent value="byRole">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(byRole).map(([role, data]) => (
              <Card key={role}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {getRoleLabel(role)}
                  </CardTitle>
                  <CardDescription>
                    {roleDescriptions[role] || "Специальная роль"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold">{data.count}</div>
                      <p className="text-xs text-slate-500">сотрудников</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-medium text-orange-500">
                        ${data.unpaid.toFixed(2)}
                      </div>
                      <p className="text-xs text-slate-500">к выплате</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rates and Conditions */}
        <TabsContent value="rates">
          <Card>
            <CardHeader>
              <CardTitle>Ставки и условия оплаты</CardTitle>
              <CardDescription>
                Индивидуальные настройки оплаты для каждого сотрудника
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Фикс. ставка</TableHead>
                    <TableHead>% ставка</TableHead>
                    <TableHead>Процент от</TableHead>
                    <TableHead>Бонус</TableHead>
                    <TableHead>Тип выплат</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getRoleLabel(emp.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.fixedRate ? `$${emp.fixedRate}` : "—"}
                      </TableCell>
                      <TableCell>
                        {emp.percentRate ? `${emp.percentRate}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {emp.percentageBase ? (
                          <span className="text-sm">
                            {percentageBaseLabels[emp.percentageBase] || emp.percentageBase}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.fdBonus && emp.fdBonusThreshold ? (
                          <span className="text-sm">
                            ${emp.fdBonus} (при {emp.fdBonusThreshold}+)
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {paymentTypeLabels[emp.paymentType] || emp.paymentType}
                          {emp.paymentType === "buffer" && ` (${emp.bufferDays}д)`}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
