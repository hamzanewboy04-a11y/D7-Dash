import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";

export async function GET() {
  try {
    const agencyWallets = await prisma.agencyWallet.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agencyWallets);
  } catch (error) {
    console.error("Error fetching agency wallets:", error);
    return NextResponse.json(
      { error: "Ошибка при получении кошельков агентств" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const body = await request.json();
    const { balanceId, address, name } = body;

    if (!balanceId || !address) {
      return NextResponse.json(
        { error: "Баланс и адрес обязательны" },
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

    if (balance.type !== "agency") {
      return NextResponse.json(
        { error: "Можно добавлять кошельки только для агентств (TRUST, CROSSGIF, FBM)" },
        { status: 400 }
      );
    }

    const existingWallet = await prisma.agencyWallet.findUnique({
      where: { address },
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "Кошелёк с таким адресом уже существует" },
        { status: 400 }
      );
    }

    const agencyWallet = await prisma.agencyWallet.create({
      data: {
        balanceId,
        address,
        name: name || null,
        isActive: true,
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

    return NextResponse.json(agencyWallet);
  } catch (error) {
    console.error("Error creating agency wallet:", error);
    return NextResponse.json(
      { error: "Ошибка при создании кошелька агентства" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID кошелька обязателен" },
        { status: 400 }
      );
    }

    await prisma.agencyWallet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting agency wallet:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении кошелька агентства" },
      { status: 500 }
    );
  }
}
