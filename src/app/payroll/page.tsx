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

// Demo data
const payrollSummary = {
  total: 3450.00,
  paid: 2100.00,
  pending: 1350.00,
  employeeCount: 12,
};

const payrollByRole = [
  { role: "Buyer", description: "12% of spend", amount: 1692.00, employees: 3 },
  { role: "FD Handler", description: "Tiered by count", amount: 580.00, employees: 2 },
  { role: "RD Handler", description: "4% of RD sum", amount: 320.00, employees: 2 },
  { role: "Content", description: "Fixed + bonus", amount: 400.00, employees: 2 },
  { role: "Designer", description: "Per task", amount: 250.00, employees: 2 },
  { role: "Head Designer", description: "$10 fixed", amount: 50.00, employees: 1 },
  { role: "Reviews", description: "Per review", amount: 158.00, employees: 2 },
];

const employees = [
  { id: 1, name: "Alex Martinez", role: "Buyer", country: "Peru", earned: 564.00, paid: 564.00, pending: 0 },
  { id: 2, name: "Maria Garcia", role: "Buyer", country: "Italy", earned: 528.00, paid: 400.00, pending: 128.00 },
  { id: 3, name: "John Smith", role: "Buyer", country: "Argentina", earned: 600.00, paid: 600.00, pending: 0 },
  { id: 4, name: "Sofia Rodriguez", role: "FD Handler", country: "Peru", earned: 290.00, paid: 200.00, pending: 90.00 },
  { id: 5, name: "Luis Hernandez", role: "FD Handler", country: "Chile", earned: 290.00, paid: 0, pending: 290.00 },
  { id: 6, name: "Anna Chen", role: "Content", country: "All", earned: 200.00, paid: 200.00, pending: 0 },
  { id: 7, name: "Carlos Lopez", role: "Designer", country: "All", earned: 125.00, paid: 125.00, pending: 0 },
  { id: 8, name: "Elena Kowalski", role: "Head Designer", country: "All", earned: 50.00, paid: 50.00, pending: 0 },
];

const recentPayments = [
  { date: "2025-12-15", employee: "Alex Martinez", amount: 564.00, status: "completed" },
  { date: "2025-12-15", employee: "John Smith", amount: 600.00, status: "completed" },
  { date: "2025-12-14", employee: "Anna Chen", amount: 200.00, status: "completed" },
  { date: "2025-12-14", employee: "Carlos Lopez", amount: 125.00, status: "completed" },
  { date: "2025-12-13", employee: "Maria Garcia", amount: 400.00, status: "completed" },
];

export default function PayrollPage() {
  const paidPercent = (payrollSummary.paid / payrollSummary.total) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll (ФОТ)</h1>
          <p className="text-slate-500 mt-1">
            Manage team payments and track payroll expenses
          </p>
        </div>
        <Button>
          <DollarSign className="h-4 w-4 mr-2" />
          Process Payments
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${payrollSummary.total.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Paid
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
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              ${payrollSummary.pending.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollSummary.employeeCount}</div>
            <p className="text-xs text-slate-500 mt-1">Active employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="byRole">
        <TabsList>
          <TabsTrigger value="byRole">By Role</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        {/* By Role */}
        <TabsContent value="byRole" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll by Role</CardTitle>
              <CardDescription>
                Breakdown of payroll expenses by team role
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
                      <p className="text-sm text-slate-500">{item.employees} employees</p>
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
              <CardTitle>Employee Payroll</CardTitle>
              <CardDescription>Individual employee earnings and payment status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Status</TableHead>
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
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
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
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Last 5 processed payments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
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
                          Completed
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
