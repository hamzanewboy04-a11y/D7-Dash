import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Получить список сотрудников
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");

    const where: Record<string, unknown> = {};
    if (countryId) {
      where.countryId = countryId;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        payrollRecords: {
          where: {
            isPaid: false,
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

    // Calculate unpaid balance for each employee
    const employeesWithBalance = employees.map((emp) => ({
      ...emp,
      unpaidBalance: emp.payrollRecords.reduce((sum, r) => sum + r.amount, 0),
      payrollRecords: undefined, // Remove the records from response
    }));

    return NextResponse.json(employeesWithBalance);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Ошибка при получении списка сотрудников" },
      { status: 500 }
    );
  }
}

// POST - Создать нового сотрудника
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, countryId, fixedRate, percentRate } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Имя и роль обязательны" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        role,
        countryId: countryId || null,
        fixedRate: fixedRate ? parseFloat(fixedRate) : null,
        percentRate: percentRate ? parseFloat(percentRate) : null,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Ошибка при создании сотрудника" },
      { status: 500 }
    );
  }
}

// PUT - Обновить сотрудника
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, role, countryId, fixedRate, percentRate, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID сотрудника обязателен" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        role,
        countryId: countryId || null,
        fixedRate: fixedRate !== undefined ? (fixedRate ? parseFloat(fixedRate) : null) : undefined,
        percentRate: percentRate !== undefined ? (percentRate ? parseFloat(percentRate) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении сотрудника" },
      { status: 500 }
    );
  }
}

// DELETE - Удалить сотрудника
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID сотрудника обязателен" },
        { status: 400 }
      );
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении сотрудника" },
      { status: 500 }
    );
  }
}
