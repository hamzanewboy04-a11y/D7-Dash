import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth";

const DEFAULT_BALANCES = [
  { type: "exchange", name: "Биржа", code: "EXCHANGE" },
  { type: "agency", name: "TRUST", code: "TRUST" },
  { type: "agency", name: "CROSSGIF", code: "CROSSGIF" },
  { type: "agency", name: "FBM", code: "FBM" },
];

async function seedBalancesIfNeeded() {
  const count = await prisma.balance.count();
  if (count === 0) {
    await prisma.balance.createMany({
      data: DEFAULT_BALANCES.map((b) => ({
        type: b.type,
        name: b.name,
        code: b.code,
        currentAmount: 0,
        currency: "USDT",
        isActive: true,
      })),
    });
  }
}

export async function GET() {
  try {
    await seedBalancesIfNeeded();

    const balances = await prisma.balance.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(balances);
  } catch (error) {
    console.error("Error fetching balances:", error);
    return NextResponse.json(
      { error: "Ошибка при получении балансов" },
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

    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await request.json();
    const { type, name, code, currency } = body;

    if (!type || !name || !code) {
      return NextResponse.json(
        { error: "Тип, название и код обязательны" },
        { status: 400 }
      );
    }

    if (!["exchange", "agency"].includes(type)) {
      return NextResponse.json(
        { error: "Тип должен быть exchange или agency" },
        { status: 400 }
      );
    }

    const existingBalance = await prisma.balance.findUnique({
      where: { code },
    });

    if (existingBalance) {
      return NextResponse.json(
        { error: "Баланс с таким кодом уже существует" },
        { status: 400 }
      );
    }

    const balance = await prisma.balance.create({
      data: {
        type,
        name,
        code: code.toUpperCase(),
        currency: currency || "USDT",
        currentAmount: 0,
        isActive: true,
      },
    });

    return NextResponse.json(balance);
  } catch (error) {
    console.error("Error creating balance:", error);
    return NextResponse.json(
      { error: "Ошибка при создании баланса" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, isActive, currentAmount } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID баланса обязателен" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    if (typeof currentAmount === "number") {
      updateData.currentAmount = currentAmount;
    }

    const balance = await prisma.balance.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(balance);
  } catch (error) {
    console.error("Error updating balance:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении баланса" },
      { status: 500 }
    );
  }
}
