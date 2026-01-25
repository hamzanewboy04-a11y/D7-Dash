import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const settings = await prisma.walletSettings.findFirst({
      where: { isActive: true },
    });

    if (!settings) {
      return NextResponse.json({
        mainAddress: null,
        lastBalance: 0,
        lastBalanceTrx: 0,
        lastSyncedAt: null,
      });
    }

    return NextResponse.json({
      id: settings.id,
      mainAddress: settings.mainAddress,
      lastBalance: settings.lastBalance,
      lastBalanceTrx: settings.lastBalanceTrx,
      lastSyncedAt: settings.lastSyncedAt,
    });
  } catch (error) {
    console.error("Error fetching wallet settings:", error);
    return NextResponse.json(
      { error: "Ошибка при получении настроек кошелька" },
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

    const body = await request.json();
    const { mainAddress, lastBalance, lastBalanceTrx } = body;

    if (!mainAddress) {
      return NextResponse.json(
        { error: "Адрес кошелька обязателен" },
        { status: 400 }
      );
    }

    const existingSettings = await prisma.walletSettings.findFirst({
      where: { isActive: true },
    });

    let settings;
    if (existingSettings) {
      settings = await prisma.walletSettings.update({
        where: { id: existingSettings.id },
        data: {
          mainAddress,
          ...(lastBalance !== undefined && { lastBalance: parseFloat(lastBalance) }),
          ...(lastBalanceTrx !== undefined && { lastBalanceTrx: parseFloat(lastBalanceTrx) }),
        },
      });
    } else {
      settings = await prisma.walletSettings.create({
        data: {
          mainAddress,
          lastBalance: lastBalance ? parseFloat(lastBalance) : 0,
          lastBalanceTrx: lastBalanceTrx ? parseFloat(lastBalanceTrx) : 0,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      id: settings.id,
      mainAddress: settings.mainAddress,
      lastBalance: settings.lastBalance,
      lastBalanceTrx: settings.lastBalanceTrx,
      lastSyncedAt: settings.lastSyncedAt,
    });
  } catch (error) {
    console.error("Error saving wallet settings:", error);
    return NextResponse.json(
      { error: "Ошибка при сохранении настроек кошелька" },
      { status: 500 }
    );
  }
}
