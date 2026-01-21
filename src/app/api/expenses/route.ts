import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

async function reverseBalanceAmount(balanceId: string, amount: number, type: string) {
  let reverseAmount = amount;
  if (type === "top_up") {
    reverseAmount = -amount;
  } else {
    reverseAmount = amount;
  }

  await prisma.balance.update({
    where: { id: balanceId },
    data: {
      currentAmount: {
        increment: reverseAmount,
      },
    },
  });
}

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
    const { date, amount, description, category, countryId, targetBalanceCode } = body;

    if (!date || amount === undefined || !description) {
      return NextResponse.json(
        { error: "Дата, сумма и назначение обязательны" },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(amount);
    const expenseDate = new Date(date);
    const expenseCategory = category || "other";

    const expense = await prisma.expense.create({
      data: {
        date: expenseDate,
        amount: parsedAmount,
        description,
        category: expenseCategory,
        countryId: countryId || null,
        targetBalanceCode: expenseCategory === "agency_topup" ? targetBalanceCode : null,
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

    // Handle balance transactions
    const exchangeBalance = await prisma.balance.findUnique({
      where: { code: "EXCHANGE" },
    });

    if (expenseCategory === "agency_topup" && targetBalanceCode) {
      // Agency top-up: decrease exchange, increase agency
      const targetBalance = await prisma.balance.findUnique({
        where: { code: targetBalanceCode },
      });

      if (exchangeBalance && targetBalance) {
        await prisma.balanceTransaction.create({
          data: {
            balanceId: exchangeBalance.id,
            type: "expense",
            amount: parsedAmount,
            description: `Пополнение агентства ${targetBalanceCode}: ${description}`,
            expenseId: expense.id,
            date: expenseDate,
          },
        });
        await updateBalanceAmount(exchangeBalance.id, parsedAmount, "expense");

        await prisma.balanceTransaction.create({
          data: {
            balanceId: targetBalance.id,
            type: "top_up",
            amount: parsedAmount,
            description: `Пополнение с биржи: ${description}`,
            expenseId: expense.id,
            date: expenseDate,
          },
        });
        await updateBalanceAmount(targetBalance.id, parsedAmount, "top_up");
      }
    } else if (exchangeBalance) {
      // Regular expense: decrease exchange balance only
      await prisma.balanceTransaction.create({
        data: {
          balanceId: exchangeBalance.id,
          type: "expense",
          amount: parsedAmount,
          description: `Расход (${expenseCategory}): ${description}`,
          expenseId: expense.id,
          date: expenseDate,
        },
      });
      await updateBalanceAmount(exchangeBalance.id, parsedAmount, "expense");
    }

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
    const { id, date, amount, description, category, countryId, targetBalanceCode } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID расхода обязателен" },
        { status: 400 }
      );
    }

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: "Расход не найден" },
        { status: 404 }
      );
    }

    // Reverse existing transactions for this expense
    const relatedTransactions = await prisma.balanceTransaction.findMany({
      where: { expenseId: id },
    });

    for (const transaction of relatedTransactions) {
      await reverseBalanceAmount(transaction.balanceId, transaction.amount, transaction.type);
    }

    await prisma.balanceTransaction.deleteMany({
      where: { expenseId: id },
    });

    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (countryId !== undefined) updateData.countryId = countryId || null;
    if (targetBalanceCode !== undefined) {
      updateData.targetBalanceCode = (category || existingExpense.category) === "agency_topup" ? targetBalanceCode : null;
    }

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

    const newCategory = category !== undefined ? category : existingExpense.category;
    const newTargetBalanceCode = targetBalanceCode !== undefined ? targetBalanceCode : existingExpense.targetBalanceCode;
    const parsedAmount = amount !== undefined ? parseFloat(amount) : existingExpense.amount;
    const expenseDate = date !== undefined ? new Date(date) : existingExpense.date;
    const expenseDescription = description !== undefined ? description : existingExpense.description;

    // Create new balance transactions
    const exchangeBalance = await prisma.balance.findUnique({
      where: { code: "EXCHANGE" },
    });

    if (newCategory === "agency_topup" && newTargetBalanceCode) {
      // Agency top-up: decrease exchange, increase agency
      const targetBalance = await prisma.balance.findUnique({
        where: { code: newTargetBalanceCode },
      });

      if (exchangeBalance && targetBalance) {
        await prisma.balanceTransaction.create({
          data: {
            balanceId: exchangeBalance.id,
            type: "expense",
            amount: parsedAmount,
            description: `Пополнение агентства ${newTargetBalanceCode}: ${expenseDescription}`,
            expenseId: expense.id,
            date: expenseDate,
          },
        });
        await updateBalanceAmount(exchangeBalance.id, parsedAmount, "expense");

        await prisma.balanceTransaction.create({
          data: {
            balanceId: targetBalance.id,
            type: "top_up",
            amount: parsedAmount,
            description: `Пополнение с биржи: ${expenseDescription}`,
            expenseId: expense.id,
            date: expenseDate,
          },
        });
        await updateBalanceAmount(targetBalance.id, parsedAmount, "top_up");
      }
    } else if (exchangeBalance) {
      // Regular expense: decrease exchange balance only
      await prisma.balanceTransaction.create({
        data: {
          balanceId: exchangeBalance.id,
          type: "expense",
          amount: parsedAmount,
          description: `Расход (${newCategory}): ${expenseDescription}`,
          expenseId: expense.id,
          date: expenseDate,
        },
      });
      await updateBalanceAmount(exchangeBalance.id, parsedAmount, "expense");
    }

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

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Расход не найден" },
        { status: 404 }
      );
    }

    // Reverse all related transactions before deleting
    const relatedTransactions = await prisma.balanceTransaction.findMany({
      where: { expenseId: id },
    });

    for (const transaction of relatedTransactions) {
      await reverseBalanceAmount(transaction.balanceId, transaction.amount, transaction.type);
    }

    await prisma.balanceTransaction.deleteMany({
      where: { expenseId: id },
    });

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
