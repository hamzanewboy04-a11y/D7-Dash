export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth, getCurrentUser } from "@/lib/auth";

async function checkOverlappingPeriods(projectId: string, startDate: Date, endDate: Date, excludeId?: string) {
  const overlapping = await prisma.smmPlanPeriod.findFirst({
    where: {
      projectId,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: startDate } }
          ]
        },
        {
          AND: [
            { startDate: { lte: endDate } },
            { endDate: { gte: endDate } }
          ]
        },
        {
          AND: [
            { startDate: { gte: startDate } },
            { endDate: { lte: endDate } }
          ]
        }
      ]
    }
  });
  return overlapping;
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId обязателен" },
        { status: 400 }
      );
    }

    const periods = await prisma.smmPlanPeriod.findMany({
      where: { projectId },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(periods);
  } catch (error) {
    console.error("Error fetching plan periods:", error);
    return NextResponse.json({ error: "Failed to fetch plan periods" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();

    if (!data.projectId || !data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: "projectId, startDate и endDate обязательны" },
        { status: 400 }
      );
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "Дата окончания должна быть >= дата начала" },
        { status: 400 }
      );
    }

    const project = await prisma.smmProject.findUnique({
      where: { id: data.projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: "Проект не найден" },
        { status: 404 }
      );
    }

    const overlapping = await checkOverlappingPeriods(data.projectId, startDate, endDate);
    if (overlapping) {
      return NextResponse.json(
        { error: "Период пересекается с существующим периодом" },
        { status: 400 }
      );
    }

    const period = await prisma.smmPlanPeriod.create({
      data: {
        projectId: data.projectId,
        startDate,
        endDate,
        postsPlan: parseInt(data.postsPlan) || 0,
        storiesPlan: parseInt(data.storiesPlan) || 0,
        miniReviewsPlan: parseInt(data.miniReviewsPlan) || 0,
        bigReviewsPlan: parseInt(data.bigReviewsPlan) || 0,
      },
    });

    return NextResponse.json(period, { status: 201 });
  } catch (error) {
    console.error("Error creating plan period:", error);
    return NextResponse.json({ error: "Failed to create plan period" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    const { id, startDate, endDate, postsPlan, storiesPlan, miniReviewsPlan, bigReviewsPlan } = data;

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    const existingPeriod = await prisma.smmPlanPeriod.findUnique({
      where: { id }
    });

    if (!existingPeriod) {
      return NextResponse.json({ error: "Период не найден" }, { status: 404 });
    }

    const newStartDate = startDate ? new Date(startDate) : existingPeriod.startDate;
    const newEndDate = endDate ? new Date(endDate) : existingPeriod.endDate;

    if (newEndDate < newStartDate) {
      return NextResponse.json(
        { error: "Дата окончания должна быть >= дата начала" },
        { status: 400 }
      );
    }

    if (startDate || endDate) {
      const overlapping = await checkOverlappingPeriods(
        existingPeriod.projectId,
        newStartDate,
        newEndDate,
        id
      );
      if (overlapping) {
        return NextResponse.json(
          { error: "Период пересекается с существующим периодом" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (startDate !== undefined) updateData.startDate = newStartDate;
    if (endDate !== undefined) updateData.endDate = newEndDate;
    if (postsPlan !== undefined) updateData.postsPlan = parseInt(postsPlan) || 0;
    if (storiesPlan !== undefined) updateData.storiesPlan = parseInt(storiesPlan) || 0;
    if (miniReviewsPlan !== undefined) updateData.miniReviewsPlan = parseInt(miniReviewsPlan) || 0;
    if (bigReviewsPlan !== undefined) updateData.bigReviewsPlan = parseInt(bigReviewsPlan) || 0;

    const period = await prisma.smmPlanPeriod.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(period);
  } catch (error) {
    console.error("Error updating plan period:", error);
    return NextResponse.json({ error: "Ошибка обновления периода" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }
  if (currentUser.role !== "admin") {
    return NextResponse.json({ error: "Только администратор может удалять периоды планов" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID обязателен" }, { status: 400 });
    }

    await prisma.smmPlanPeriod.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plan period:", error);
    return NextResponse.json({ error: "Ошибка удаления периода" }, { status: 500 });
  }
}
