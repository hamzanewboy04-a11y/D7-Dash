import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, isAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        mustChangePassword: true,
        allowedSections: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Ошибка получения пользователей" }, { status: 500 });
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
    const { username, password, role, email, allowedSections } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Имя пользователя и пароль обязательны" },
        { status: 400 }
      );
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Недопустимая роль" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким именем уже существует" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        email: email || null,
        allowedSections: Array.isArray(allowedSections) ? allowedSections.join(',') : "",
        mustChangePassword: false,
      },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        allowedSections: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Ошибка создания пользователя" }, { status: 500 });
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
    const { id, role, password, mustChangePassword, allowedSections } = body;

    if (!id) {
      return NextResponse.json({ error: "ID пользователя обязателен" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (role && ["admin", "editor", "viewer"].includes(role)) {
      updateData.role = role;
    }

    if (password) {
      updateData.passwordHash = await hashPassword(password);
      updateData.mustChangePassword = false;
    }

    if (typeof mustChangePassword === "boolean") {
      updateData.mustChangePassword = mustChangePassword;
    }

    if (Array.isArray(allowedSections)) {
      updateData.allowedSections = allowedSections.join(',');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        mustChangePassword: true,
        allowedSections: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Ошибка обновления пользователя" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID пользователя обязателен" }, { status: 400 });
    }

    if (id === currentUser.id) {
      return NextResponse.json({ error: "Нельзя удалить самого себя" }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (!userToDelete) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (userToDelete.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Нельзя удалить последнего администратора" },
          { status: 400 }
        );
      }
    }

    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Ошибка удаления пользователя" }, { status: 500 });
  }
}
