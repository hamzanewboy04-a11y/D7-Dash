import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");

    if (countryId) {
      const settings = await prisma.smmProjectSettings.findUnique({
        where: { countryId },
        include: {
          country: { select: { id: true, name: true, code: true } },
        },
      });
      return NextResponse.json(settings);
    }

    const allSettings = await prisma.smmProjectSettings.findMany({
      include: {
        country: { select: { id: true, name: true, code: true } },
      },
      orderBy: { country: { name: "asc" } },
    });

    return NextResponse.json(allSettings);
  } catch (error) {
    console.error("Error fetching SMM settings:", error);
    return NextResponse.json({ error: "Ошибка загрузки настроек" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    const { countryId, ...settingsData } = data;

    if (!countryId) {
      return NextResponse.json({ error: "countryId обязателен" }, { status: 400 });
    }

    const settings = await prisma.smmProjectSettings.upsert({
      where: { countryId },
      update: {
        postsPlanMonthly: settingsData.postsPlanMonthly || 0,
        storiesPlanMonthly: settingsData.storiesPlanMonthly || 0,
        miniReviewsPlanMonthly: settingsData.miniReviewsPlanMonthly || 0,
        bigReviewsPlanMonthly: settingsData.bigReviewsPlanMonthly || 0,
        postsPlanDaily: settingsData.postsPlanDaily || 0,
        storiesPlanDaily: settingsData.storiesPlanDaily || 0,
        miniReviewsPlanDaily: settingsData.miniReviewsPlanDaily || 0,
        bigReviewsPlanDaily: settingsData.bigReviewsPlanDaily || 0,
      },
      create: {
        countryId,
        postsPlanMonthly: settingsData.postsPlanMonthly || 0,
        storiesPlanMonthly: settingsData.storiesPlanMonthly || 0,
        miniReviewsPlanMonthly: settingsData.miniReviewsPlanMonthly || 0,
        bigReviewsPlanMonthly: settingsData.bigReviewsPlanMonthly || 0,
        postsPlanDaily: settingsData.postsPlanDaily || 0,
        storiesPlanDaily: settingsData.storiesPlanDaily || 0,
        miniReviewsPlanDaily: settingsData.miniReviewsPlanDaily || 0,
        bigReviewsPlanDaily: settingsData.bigReviewsPlanDaily || 0,
      },
      include: {
        country: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating SMM settings:", error);
    return NextResponse.json({ error: "Ошибка сохранения настроек" }, { status: 500 });
  }
}
