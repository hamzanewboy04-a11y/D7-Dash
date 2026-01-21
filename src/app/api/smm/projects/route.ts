import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const projects = await prisma.smmProject.findMany({
      where: { isActive: true },
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

export async function PUT(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const project = await prisma.smmProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error updating SMM project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.smmProject.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SMM project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
