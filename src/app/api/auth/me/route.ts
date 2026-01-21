export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getCurrentUser, ensureDefaultAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await ensureDefaultAdmin();
    
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Не авторизован" },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Ошибка получения данных пользователя" },
      { status: 500 }
    );
  }
}
