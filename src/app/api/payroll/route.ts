import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get payroll records with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const countryId = searchParams.get("countryId");
    const isPaid = searchParams.get("isPaid");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (isPaid !== null) {
      where.isPaid = isPaid === "true";
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Filter by country if specified
    if (countryId) {
      where.employee = { countryId };
    }

    const records = await prisma.payrollRecord.findMany({
      where,
      include: {
        employee: {
          include: {
            country: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching payroll records:", error);
    return NextResponse.json(
      { error: "Ошибка при получении записей ФОТ" },
      { status: 500 }
    );
  }
}

// POST - Create payroll record(s)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, date, amount, notes, records } = body;

    // Bulk create from array
    if (records && Array.isArray(records)) {
      const created = await prisma.payrollRecord.createMany({
        data: records.map((r: { employeeId: string; date: string; amount: number; notes?: string }) => ({
          employeeId: r.employeeId,
          date: new Date(r.date),
          amount: r.amount,
          isPaid: false,
          notes: r.notes || null,
        })),
      });

      return NextResponse.json({ count: created.count });
    }

    // Single record
    if (!employeeId || !date || amount === undefined) {
      return NextResponse.json(
        { error: "employeeId, date и amount обязательны" },
        { status: 400 }
      );
    }

    const record = await prisma.payrollRecord.create({
      data: {
        employeeId,
        date: new Date(date),
        amount: parseFloat(amount),
        isPaid: false,
        notes: notes || null,
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error creating payroll record:", error);
    return NextResponse.json(
      { error: "Ошибка при создании записи ФОТ" },
      { status: 500 }
    );
  }
}

// PUT - Mark records as paid
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { ids, isPaid, paidAt } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: "ids обязателен (массив)" },
        { status: 400 }
      );
    }

    const updated = await prisma.payrollRecord.updateMany({
      where: { id: { in: ids } },
      data: {
        isPaid: isPaid !== undefined ? isPaid : true,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });

    return NextResponse.json({ count: updated.count });
  } catch (error) {
    console.error("Error updating payroll records:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении записей ФОТ" },
      { status: 500 }
    );
  }
}

// DELETE - Delete payroll record(s)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");

    if (ids) {
      const idArray = ids.split(",");
      await prisma.payrollRecord.deleteMany({
        where: { id: { in: idArray } },
      });
      return NextResponse.json({ success: true, count: idArray.length });
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID обязателен" },
        { status: 400 }
      );
    }

    await prisma.payrollRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payroll record:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении записи ФОТ" },
      { status: 500 }
    );
  }
}
