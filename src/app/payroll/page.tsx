"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, DollarSign, Users } from "lucide-react";

// Демо данные
const payrollSummary = {
  total: 3450.00,
  paid: 2100.00,
  pending: 1350.00,
  employeeCount: 12,
};

const payrollByRole = [
  { role: "Баер", description: "12% от спенда", amount: 1692.00, employees: 3 },
  { role: "Обработчик ФД", description: "По тирам", amount: 580.00, employees: 2 },
  { role: "Обработчик РД", description: "4% от суммы РД", amount: 320.00, employees: 2 },
  { role: "Контент", description: "Фикс + бонус", amount: 400.00, employees: 2 },
  { role: "Дизайнер", description: "За задачу", amount: 250.00, employees: 2 },
  { role: "Хед дизайнер", description: "$10 фикс", amount: 50.00, employees: 1 },
  { role: "Отзовик", description: "За отзыв", amount: 158.00, employees: 2 },
];

const employees = [
  { id: 1, name: "Алекс Мартинез", role: "Баер", country: "Перу", earned: 564.00, paid: 564.00, pending: 0 },
  { id: 2, name: "Мария Гарсия", role: "Баер", country: "Италия", earned: 528.00, paid: 400.00, pending: 128.00 },
  { id: 3, name: "Джон Смит", role: "Баер", country: "Аргентина", earned: 600.00, paid: 600.00, pending: 0 },
  { id: 4, name: "София Родригез", role: "Обраб. ФД", country: "Перу", earned: 290.00, paid: 200.00, pending: 90.00 },
  { id: 5, name: "Луис Эрнандез", role: "Обраб. ФД", country: "Чили", earned: 290.00, paid: 0, pending: 290.00 },
  { id: 6, name: "Анна Чен", role: "Контент", country: "Все", earned: 200.00, paid: 200.00, pending: 0 },
  { id: 7, name: "Карлос Лопез", role: "Дизайнер", country: "Все", earned: 125.00, paid: 125.00, pending: 0 },
  { id: 8, name: "Елена Ковальски", role: "Хед диз.", country: "Все", earned: 50.00, paid: 50.00, pending: 0 },
];

const recentPayments = [
  { date: "15.12.2025", employee: "Алекс Мартинез", amount: 564.00, status: "completed" },
  { date: "15.12.2025", employee: "Джон Смит", amount: 600.00, status: "completed" },
  { date: "14.12.2025", employee: "Анна Чен", amount: 200.00, status: "completed" },
  { date: "14.12.2025", employee: "Карлос Лопез", amount: 125.00, status: "completed" },
  { date: "13.12.2025", employee: "Мария Гарсия", amount: 400.00, status: "completed" },
];

export default function PayrollPage() {
  const paidPercent = (payrollSummary.paid / payrollSummary.total) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ФОТ</h1>
          <p className="text-slate-500 mt-1">
            Управление выплатами команде и отслеживание расходов на ФОТ
          </p>
        </div>
        <Button>
          <DollarSign className="h-4 w-4 mr-2" />
          Провести выплаты
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Общий ФОТ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payrollSummary.total.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">За этот месяц</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Выплачено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${payrollSummary.paid.toFixed(2)}
            </div>
            <Progress value={paidPercent} className="mt-2 h-2" />
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
              ${payrollSummary.pending.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Ожидает оплаты</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Сотрудников
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollSummary.employeeCount}</div>
            <p className="text-xs text-slate-500 mt-1">Активных</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="byRole">
        <TabsList>
          <TabsTrigger value="byRole">По ролям</TabsTrigger>
          <TabsTrigger value="employees">Сотрудники</TabsTrigger>
          <TabsTrigger value="history">История выплат</TabsTrigger>
        </TabsList>

        {/* By Role */}
        <TabsContent value="byRole" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ФОТ по ролям</CardTitle>
              <CardDescription>
                Разбивка расходов на ФОТ по ролям в команде
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payrollByRole.map((item) => (
                  <div
                    key={item.role}
                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{item.role}</p>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${item.amount.toFixed(2)}</p>
                      <p className="text-sm text-slate-500">{item.employees} сотр.</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees */}
        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Зарплаты сотрудников</CardTitle>
              <CardDescription>Заработок и статус выплат по каждому сотруднику</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Страна</TableHead>
                    <TableHead className="text-right">Заработано</TableHead>
                    <TableHead className="text-right">Выплачено</TableHead>
                    <TableHead className="text-right">К выплате</TableHead>
                    <TableHead className="text-right">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{employee.country}</TableCell>
                      <TableCell className="text-right">${employee.earned.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        ${employee.paid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-orange-500">
                        ${employee.pending.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.pending === 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Оплачено
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Ожидает
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Последние выплаты</CardTitle>
              <CardDescription>Последние 5 проведённых выплат</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{payment.date}</TableCell>
                      <TableCell>{payment.employee}</TableCell>
                      <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Выполнено
                        </Badge>
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
