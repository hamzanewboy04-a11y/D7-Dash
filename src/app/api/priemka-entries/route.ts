import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEdit } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};
    if (countryId) where.countryId = countryId;
    if (date) where.date = new Date(date);
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const entries = await prisma.priemkaEntry.findMany({
      where,
      include: {
        priemka: true,
      },
      orderBy: [{ date: "desc" }, { priemka: { name: "asc" } }],
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Get priemka entries error:", error);
    return NextResponse.json({ error: "Ошибка получения записей" }, { status: 500 });
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
    const { priemkaId, countryId, date, revenueLocal, revenueUsdt, exchangeRate } = body;

    if (!priemkaId || !countryId || !date) {
      return NextResponse.json({ error: "Приёмка, страна и дата обязательны" }, { status: 400 });
    }

    const existingEntry = await prisma.priemkaEntry.findFirst({
      where: {
        priemkaId,
        countryId,
        date: new Date(date),
      },
    });

    if (existingEntry) {
      const updated = await prisma.priemkaEntry.update({
        where: { id: existingEntry.id },
        data: {
          revenueLocal: parseFloat(revenueLocal) || 0,
          revenueUsdt: parseFloat(revenueUsdt) || 0,
          exchangeRate: parseFloat(exchangeRate) || 0,
        },
        include: {
          priemka: true,
        },
      });
      return NextResponse.json(updated);
    }

    const entry = await prisma.priemkaEntry.create({
      data: {
        priemkaId,
        countryId,
        date: new Date(date),
        revenueLocal: parseFloat(revenueLocal) || 0,
        revenueUsdt: parseFloat(revenueUsdt) || 0,
        exchangeRate: parseFloat(exchangeRate) || 0,
      },
      include: {
        priemka: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Create priemka entry error:", error);
    return NextResponse.json({ error: "Ошибка создания записи" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    if (!canEdit(currentUser)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await request.json();
    const { id, priemkaId, revenueLocal, revenueUsdt, exchangeRate } = body;

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (priemkaId !== undefined) updateData.priemkaId = priemkaId;
    if (revenueLocal !== undefined) updateData.revenueLocal = parseFloat(revenueLocal);
    if (revenueUsdt !== undefined) updateData.revenueUsdt = parseFloat(revenueUsdt);
    if (exchangeRate !== undefined) updateData.exchangeRate = parseFloat(exchangeRate);

    const entry = await prisma.priemkaEntry.update({
      where: { id },
      data: updateData,
      include: {
        priemka: true,
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Update priemka entry error:", error);
    return NextResponse.json({ error: "Ошибка обновления записи" }, { status: 500 });
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
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    await prisma.priemkaEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete priemka entry error:", error);
    return NextResponse.json({ error: "Ошибка удаления записи" }, { status: 500 });
  }
}
