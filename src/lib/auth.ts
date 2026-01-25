import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "d7_session";
const SESSION_EXPIRY_DAYS = 7;

export type UserRole = "admin" | "editor" | "viewer";

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  email: string | null;
  mustChangePassword: boolean;
  allowedSections: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function getSessionFromCookie(): Promise<{ userId: string; token: string } | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await deleteSession(sessionToken);
    }
    return null;
  }

  return { userId: session.userId, token: session.token };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSessionFromCookie();

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      email: true,
      mustChangePassword: true,
      allowedSections: true,
    },
  });

  if (!user) {
    return null;
  }

  return user as AuthUser;
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canEditByRole(role: UserRole): boolean {
  return hasRole(role, "editor");
}

export function canEdit(user: AuthUser): boolean {
  return hasRole(user.role, "editor");
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export async function ensureDefaultAdmin(): Promise<void> {
  const adminExists = await prisma.user.findFirst({
    where: { role: "admin" },
  });

  if (!adminExists) {
    const passwordHash = await hashPassword("admin123");
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        role: "admin",
        mustChangePassword: true,
      },
    });
    console.log("Default admin user created: admin / admin123");
  }
}

export async function cleanExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

import { NextResponse } from "next/server";

export async function requireAuth(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireEditorAuth(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canEdit(user)) {
    return NextResponse.json({ error: "Forbidden: Editor role required" }, { status: 403 });
  }
  return null;
}

export async function requireAdminAuth(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
  }
  return null;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }
  return null;
}
