import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, ensureDefaultAdmin } from "@/lib/auth";
import { cookies } from "next/headers";
import { validateBody, loginSchema } from "@/lib/validation";
import { asyncHandler, unauthorizedError, validationError } from "@/lib/errors";

export const POST = asyncHandler('POST /api/auth/login', async (request: Request) => {
  await ensureDefaultAdmin();

  const body = await request.json();
  
  // Validate input
  const validation = validateBody(loginSchema, body);
  if (!validation.success) {
    throw validationError(validation.error);
  }

  const { username, password } = validation.data;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    throw unauthorizedError("Неверное имя пользователя или пароль");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw unauthorizedError("Неверное имя пользователя или пароль");
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
});
