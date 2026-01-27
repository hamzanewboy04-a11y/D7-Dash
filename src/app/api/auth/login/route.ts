import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, ensureDefaultAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import { validateBody, loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const body = await request.json();
    
    // Validate input
    const validation = validateBody(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Неверное имя пользователя или пароль" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Неверное имя пользователя или пароль" },
        { status: 401 }
      );
    }

    const token = await createSession(user.id);

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    cookieStore.set("d7_session", token, {
      httpOnly: true,
      secure: isProduction,
      // Use 'strict' for better CSRF protection in production
      // Use 'lax' in development for easier testing
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Ошибка входа в систему" },
      { status: 500 }
    );
  }
}
