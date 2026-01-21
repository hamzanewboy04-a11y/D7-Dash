import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canEdit } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const priemkas = await prisma.priemka.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(priemkas);
  } catch (error) {
    console.error("Get priemkas error:", error);
    return NextResponse.json({ error: "Ошибка получения приёмок" }, { status: 500 });
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
    const { name, code, commissionRate, description } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Название и код обязательны" }, { status: 400 });
    }

    const existing = await prisma.priemka.findFirst({
      where: { OR: [{ name }, { code }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Приёмка с таким названием или кодом уже существует" }, { status: 400 });
    }

    const priemka = await prisma.priemka.create({
      data: {
        name,
        code: code.toUpperCase(),
        commissionRate: parseFloat(commissionRate) || 15,
        description: description || null,
      },
    });

    return NextResponse.json(priemka);
  } catch (error) {
    console.error("Create priemka error:", error);
    return NextResponse.json({ error: "Ошибка создания приёмки" }, { status: 500 });
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
    const { id, name, code, commissionRate, description, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (commissionRate !== undefined) updateData.commissionRate = parseFloat(commissionRate);
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const priemka = await prisma.priemka.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(priemka);
  } catch (error) {
    console.error("Update priemka error:", error);
    return NextResponse.json({ error: "Ошибка обновления приёмки" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    if (currentUser.role !== "admin") {
      return NextResponse.json({ error: "Только администратор может удалять приёмки" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    await prisma.priemkaEntry.deleteMany({ where: { priemkaId: id } });
    await prisma.priemka.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete priemka error:", error);
    return NextResponse.json({ error: "Ошибка удаления приёмки" }, { status: 500 });
  }
}
