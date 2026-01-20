import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        employee: {
          include: {
            country: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Ошибка при получении выплат" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      amount,
      paymentDate,
      periodStart,
      periodEnd,
      nextPaymentDate,
      notes,
      paymentType,
      status,
    } = body;

    if (!employeeId || amount === undefined || !paymentDate) {
      return NextResponse.json(
        { error: "employeeId, amount и paymentDate обязательны" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        employeeId,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : null,
        notes: notes || null,
        paymentType: paymentType || "salary",
        status: status || "pending",
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Ошибка при создании выплаты" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID выплаты обязателен" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};

    if (status) {
      data.status = status;
    }

    if (updateData.amount !== undefined) {
      data.amount = parseFloat(updateData.amount);
    }

    if (updateData.paymentDate) {
      data.paymentDate = new Date(updateData.paymentDate);
    }

    if (updateData.periodStart !== undefined) {
      data.periodStart = updateData.periodStart ? new Date(updateData.periodStart) : null;
    }

    if (updateData.periodEnd !== undefined) {
      data.periodEnd = updateData.periodEnd ? new Date(updateData.periodEnd) : null;
    }

    if (updateData.nextPaymentDate !== undefined) {
      data.nextPaymentDate = updateData.nextPaymentDate ? new Date(updateData.nextPaymentDate) : null;
    }

    if (updateData.notes !== undefined) {
      data.notes = updateData.notes || null;
    }

    if (updateData.paymentType) {
      data.paymentType = updateData.paymentType;
    }

    const payment = await prisma.payment.update({
      where: { id },
      data,
      include: {
        employee: true,
      },
    });

    if (status === "paid") {
      await prisma.employee.update({
        where: { id: payment.employeeId },
        data: {
          currentBalance: {
            decrement: payment.amount,
          },
        },
      });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении выплаты" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID выплаты обязателен" },
        { status: 400 }
      );
    }

    await prisma.payment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении выплаты" },
      { status: 500 }
    );
  }
}
