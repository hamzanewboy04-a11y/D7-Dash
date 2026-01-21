import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEdit } from "@/lib/auth";

async function updateBalanceAmount(balanceId: string, amount: number, type: string) {
  let amountChange = amount;
  
  if (type === "spend" || type === "expense" || type === "transfer") {
    amountChange = -Math.abs(amount);
  } else if (type === "top_up") {
    amountChange = Math.abs(amount);
  }

  await prisma.balance.update({
    where: { id: balanceId },
    data: {
      currentAmount: {
        increment: amountChange,
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const balanceId = searchParams.get("balanceId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (balanceId) {
      where.balanceId = balanceId;
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

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where,
        include: {
          balance: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
            },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.balanceTransaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching balance transactions:", error);
    return NextResponse.json(
      { error: "Ошибка при получении транзакций" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!canEdit(currentUser)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await request.json();
    const { balanceId, type, amount, description, date, expenseId } = body;

    if (!balanceId || !type || amount === undefined || !date) {
      return NextResponse.json(
        { error: "balanceId, type, amount и date обязательны" },
        { status: 400 }
      );
    }

    if (!["top_up", "spend", "expense", "transfer"].includes(type)) {
      return NextResponse.json(
        { error: "Тип должен быть top_up, spend, expense или transfer" },
        { status: 400 }
      );
    }

    const balance = await prisma.balance.findUnique({
      where: { id: balanceId },
    });

    if (!balance) {
      return NextResponse.json(
        { error: "Баланс не найден" },
        { status: 404 }
      );
    }

    const transaction = await prisma.balanceTransaction.create({
      data: {
        balanceId,
        type,
        amount: parseFloat(String(amount)),
        description: description || null,
        expenseId: expenseId || null,
        date: new Date(date),
      },
      include: {
        balance: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
      },
    });

    await updateBalanceAmount(balanceId, parseFloat(String(amount)), type);

    const updatedBalance = await prisma.balance.findUnique({
      where: { id: balanceId },
    });

    return NextResponse.json({
      transaction,
      balance: updatedBalance,
    });
  } catch (error) {
    console.error("Error creating balance transaction:", error);
    return NextResponse.json(
      { error: "Ошибка при создании транзакции" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!canEdit(currentUser)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID транзакции обязателен" },
        { status: 400 }
      );
    }

    const transaction = await prisma.balanceTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Транзакция не найдена" },
        { status: 404 }
      );
    }

    let reverseAmount = transaction.amount;
    if (transaction.type === "top_up") {
      reverseAmount = -transaction.amount;
    } else {
      reverseAmount = transaction.amount;
    }

    await prisma.balance.update({
      where: { id: transaction.balanceId },
      data: {
        currentAmount: {
          increment: reverseAmount,
        },
      },
    });

    await prisma.balanceTransaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting balance transaction:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении транзакции" },
      { status: 500 }
    );
  }
}
