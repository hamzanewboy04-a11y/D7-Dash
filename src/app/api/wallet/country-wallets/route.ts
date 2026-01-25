import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth, requireEditorAuth } from "@/lib/auth";

export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const wallets = await prisma.countryWallet.findMany({
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json(wallets);
  } catch (error) {
    console.error("Error fetching country wallets:", error);
    return NextResponse.json(
      { error: "Ошибка при получении кошельков стран" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const body = await request.json();
    const { address, countryId, name } = body;

    if (!address || !countryId) {
      return NextResponse.json(
        { error: "Адрес и страна обязательны" },
        { status: 400 }
      );
    }

    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return NextResponse.json(
        { error: "Страна не найдена" },
        { status: 404 }
      );
    }

    const existingWallet = await prisma.countryWallet.findUnique({
      where: { address },
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "Кошелёк с таким адресом уже существует" },
        { status: 400 }
      );
    }

    const wallet = await prisma.countryWallet.create({
      data: {
        address,
        countryId,
        name: name || null,
        isActive: true,
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

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("Error creating country wallet:", error);
    return NextResponse.json(
      { error: "Ошибка при создании кошелька страны" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const body = await request.json();
    const { id, address, countryId, name, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID кошелька обязателен" },
        { status: 400 }
      );
    }

    const existingWallet = await prisma.countryWallet.findUnique({
      where: { id },
    });

    if (!existingWallet) {
      return NextResponse.json(
        { error: "Кошелёк не найден" },
        { status: 404 }
      );
    }

    if (address && address !== existingWallet.address) {
      const duplicateWallet = await prisma.countryWallet.findUnique({
        where: { address },
      });

      if (duplicateWallet) {
        return NextResponse.json(
          { error: "Кошелёк с таким адресом уже существует" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (address !== undefined) updateData.address = address;
    if (countryId !== undefined) updateData.countryId = countryId;
    if (name !== undefined) updateData.name = name || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const wallet = await prisma.countryWallet.update({
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

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("Error updating country wallet:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении кошелька страны" },
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

    const wallet = await prisma.countryWallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Кошелёк не найден" },
        { status: 404 }
      );
    }

    await prisma.countryWallet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting country wallet:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении кошелька страны" },
      { status: 500 }
    );
  }
}
