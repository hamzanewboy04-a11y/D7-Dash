import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Получить список расходов
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const countryId = searchParams.get("countryId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (date) {
      // Конкретная дата
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = {
        gte: d,
        lt: nextDay,
      };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (countryId) {
      where.countryId = countryId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Ошибка при получении расходов" },
      { status: 500 }
    );
  }
}

// POST - Создать расход
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, amount, description, category, countryId } = body;

    if (!date || amount === undefined || !description) {
      return NextResponse.json(
        { error: "Дата, сумма и назначение обязательны" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date),
        amount: parseFloat(amount),
        description,
        category: category || "other",
        countryId: countryId || null,
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

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Ошибка при создании расхода" },
      { status: 500 }
    );
  }
}

// PUT - Обновить расход
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, date, amount, description, category, countryId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID расхода обязателен" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (countryId !== undefined) updateData.countryId = countryId || null;

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении расхода" },
      { status: 500 }
    );
  }
}

// DELETE - Удалить расход
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID расхода обязателен" },
        { status: 400 }
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении расхода" },
      { status: 500 }
    );
  }
}
