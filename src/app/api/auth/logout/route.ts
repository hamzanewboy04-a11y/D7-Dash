import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie, deleteSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSessionFromCookie();

    if (session) {
      await deleteSession(session.token);
    }

    const cookieStore = await cookies();
    cookieStore.delete("d7_session");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Ошибка выхода из системы" },
      { status: 500 }
    );
  }
}
