export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth, getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const projects = await prisma.smmProject.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching SMM projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();

    if (!data.name || !data.code) {
      return NextResponse.json(
        { error: "Название и код проекта обязательны" },
        { status: 400 }
      );
    }

    const project = await prisma.smmProject.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase().replace(/\s+/g, "_"),
        description: data.description || null,
        postsPlanMonthly: data.postsPlanMonthly || 0,
        storiesPlanMonthly: data.storiesPlanMonthly || 0,
        miniReviewsPlanMonthly: data.miniReviewsPlanMonthly || 0,
        bigReviewsPlanMonthly: data.bigReviewsPlanMonthly || 0,
        postsPlanDaily: data.postsPlanDaily || 0,
        storiesPlanDaily: data.storiesPlanDaily || 0,
        miniReviewsPlanDaily: data.miniReviewsPlanDaily || 0,
        bigReviewsPlanDaily: data.bigReviewsPlanDaily || 0,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating SMM project:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Проект с таким названием или кодом уже существует" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    const { id, name, code, description, isActive, postsPlanMonthly, storiesPlanMonthly, miniReviewsPlanMonthly, bigReviewsPlanMonthly, postsPlanDaily, storiesPlanDaily, miniReviewsPlanDaily, bigReviewsPlanDaily } = data;

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase().replace(/\s+/g, "_");
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (postsPlanMonthly !== undefined) updateData.postsPlanMonthly = parseInt(postsPlanMonthly) || 0;
    if (storiesPlanMonthly !== undefined) updateData.storiesPlanMonthly = parseInt(storiesPlanMonthly) || 0;
    if (miniReviewsPlanMonthly !== undefined) updateData.miniReviewsPlanMonthly = parseInt(miniReviewsPlanMonthly) || 0;
    if (bigReviewsPlanMonthly !== undefined) updateData.bigReviewsPlanMonthly = parseInt(bigReviewsPlanMonthly) || 0;
    if (postsPlanDaily !== undefined) updateData.postsPlanDaily = parseInt(postsPlanDaily) || 0;
    if (storiesPlanDaily !== undefined) updateData.storiesPlanDaily = parseInt(storiesPlanDaily) || 0;
    if (miniReviewsPlanDaily !== undefined) updateData.miniReviewsPlanDaily = parseInt(miniReviewsPlanDaily) || 0;
    if (bigReviewsPlanDaily !== undefined) updateData.bigReviewsPlanDaily = parseInt(bigReviewsPlanDaily) || 0;

    const project = await prisma.smmProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating SMM project:", error);
    return NextResponse.json({ error: "Ошибка обновления проекта" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Только администратор может удалять SMM проекты" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    await prisma.smmProjectMetrics.deleteMany({ where: { projectId: id } });
    await prisma.smmProject.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SMM project:", error);
    return NextResponse.json({ error: "Ошибка удаления проекта" }, { status: 500 });
  }
}
