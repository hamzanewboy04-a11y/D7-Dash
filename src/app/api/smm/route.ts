import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};
    
    if (countryId) where.countryId = countryId;
    if (employeeId) where.employeeId = employeeId;
    
    // Always filter to today or earlier to avoid showing future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    where.date = {};
    const startDateParsed = startDate ? new Date(startDate) : null;
    if (startDateParsed) (where.date as Record<string, Date>).gte = startDateParsed;
    
    // Use the earlier of endDate or today - never show future dates
    const requestedEnd = endDate ? new Date(endDate) : today;
    const effectiveEnd = requestedEnd > today ? today : requestedEnd;
    (where.date as Record<string, Date>).lte = effectiveEnd;

    // Calculate number of days in the period
    const effectiveStart = startDateParsed || new Date(0);
    const daysDiff = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const metrics = await prisma.smmMetrics.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, role: true } },
        country: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ date: "desc" }, { countryId: "asc" }],
    });

    // Get actual facts from records
    const factTotals = await prisma.smmMetrics.aggregate({
      where,
      _sum: {
        postsTotal: true,
        storiesTotal: true,
        miniReviewsTotal: true,
        bigReviewsTotal: true,
      },
    });

    // Get settings for plan calculation
    const settingsWhere = countryId ? { countryId } : {};
    const settings = await prisma.smmProjectSettings.findMany({
      where: settingsWhere,
    });

    // Calculate plan based on period days × daily settings
    let postsPlan = 0;
    let storiesPlan = 0;
    let miniReviewsPlan = 0;
    let bigReviewsPlan = 0;

    if (settings.length > 0) {
      for (const s of settings) {
        postsPlan += (s.postsPlanDaily || 0) * daysDiff;
        storiesPlan += (s.storiesPlanDaily || 0) * daysDiff;
        miniReviewsPlan += (s.miniReviewsPlanDaily || 0) * daysDiff;
        bigReviewsPlan += (s.bigReviewsPlanDaily || 0) * daysDiff;
      }
    }

    const totals = {
      _sum: {
        postsPlan,
        postsTotal: factTotals._sum?.postsTotal || 0,
        storiesPlan,
        storiesTotal: factTotals._sum?.storiesTotal || 0,
        miniReviewsPlan,
        miniReviewsTotal: factTotals._sum?.miniReviewsTotal || 0,
        bigReviewsPlan,
        bigReviewsTotal: factTotals._sum?.bigReviewsTotal || 0,
      },
    };

    return NextResponse.json({ metrics, totals, periodDays: daysDiff }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Error fetching SMM metrics:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    const recordDate = new Date(data.date);
    
    // Получаем настройки плана для страны
    const settings = await prisma.smmProjectSettings.findUnique({
      where: { countryId: data.countryId }
    });
    
    // Месячный план из настроек
    const postsPlanMonthly = settings?.postsPlanMonthly || 0;
    const storiesPlanMonthly = settings?.storiesPlanMonthly || 0;
    const miniReviewsPlanMonthly = settings?.miniReviewsPlanMonthly || 0;
    const bigReviewsPlanMonthly = settings?.bigReviewsPlanMonthly || 0;
    
    // Дневной план из настроек
    const postsPlanDaily = settings?.postsPlanDaily || data.postsPlanDaily || 0;
    const storiesPlanDaily = settings?.storiesPlanDaily || data.storiesPlanDaily || 0;
    const miniReviewsPlanDaily = settings?.miniReviewsPlanDaily || data.miniReviewsPlanDaily || 0;
    const bigReviewsPlanDaily = settings?.bigReviewsPlanDaily || data.bigReviewsPlanDaily || 0;
    
    // Считаем сумму фактов за текущий месяц для этой страны
    const monthStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), 1);
    const monthEnd = new Date(recordDate.getFullYear(), recordDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyTotals = await prisma.smmMetrics.aggregate({
      where: {
        countryId: data.countryId,
        date: { gte: monthStart, lte: monthEnd }
      },
      _sum: {
        postsTotal: true,
        storiesTotal: true,
        miniReviewsTotal: true,
        bigReviewsTotal: true,
      }
    });
    
    // Текущие факты за месяц + новые данные
    const existingPostsFact = monthlyTotals._sum?.postsTotal || 0;
    const existingStoriesFact = monthlyTotals._sum?.storiesTotal || 0;
    const existingMiniReviewsFact = monthlyTotals._sum?.miniReviewsTotal || 0;
    const existingBigReviewsFact = monthlyTotals._sum?.bigReviewsTotal || 0;
    
    const newPostsFact = data.postsTotal || 0;
    const newStoriesFact = data.storiesTotal || 0;
    const newMiniReviewsFact = data.miniReviewsTotal || 0;
    const newBigReviewsFact = data.bigReviewsTotal || 0;
    
    // Остаток = месячный план - (существующий факт за месяц + новый факт)
    const postsRemaining = Math.max(0, postsPlanMonthly - (existingPostsFact + newPostsFact));
    const storiesRemaining = Math.max(0, storiesPlanMonthly - (existingStoriesFact + newStoriesFact));
    const miniReviewsRemaining = Math.max(0, miniReviewsPlanMonthly - (existingMiniReviewsFact + newMiniReviewsFact));
    const bigReviewsRemaining = Math.max(0, bigReviewsPlanMonthly - (existingBigReviewsFact + newBigReviewsFact));

    const totalPlan = postsPlanDaily + storiesPlanDaily + miniReviewsPlanDaily + bigReviewsPlanDaily;
    const totalFact = newPostsFact + newStoriesFact + newMiniReviewsFact + newBigReviewsFact;
    const completionRate = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;

    const metric = await prisma.smmMetrics.create({
      data: {
        date: recordDate,
        countryId: data.countryId,
        employeeId: data.employeeId || null,
        postsPlan: postsPlanDaily,
        postsPlanDaily,
        postsFactDaily: newPostsFact,
        postsTotal: newPostsFact,
        postsRemaining,
        storiesPlan: storiesPlanDaily,
        storiesPlanDaily,
        storiesFactDaily: newStoriesFact,
        storiesTotal: newStoriesFact,
        storiesRemaining,
        miniReviewsPlan: miniReviewsPlanDaily,
        miniReviewsPlanDaily,
        miniReviewsFactDaily: newMiniReviewsFact,
        miniReviewsTotal: newMiniReviewsFact,
        miniReviewsRemaining,
        bigReviewsPlan: bigReviewsPlanDaily,
        bigReviewsPlanDaily,
        bigReviewsFactDaily: newBigReviewsFact,
        bigReviewsTotal: newBigReviewsFact,
        bigReviewsRemaining,
        completionRate,
        notes: data.notes,
      },
      include: {
        employee: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error("Error creating SMM metric:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
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
    
    // Получаем текущую запись, чтобы узнать дату и страну
    const existingRecord = await prisma.smmMetrics.findUnique({
      where: { id }
    });
    
    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    
    const recordDate = updateData.date ? new Date(updateData.date) : existingRecord.date;
    const countryId = updateData.countryId || existingRecord.countryId;
    
    // Получаем настройки плана для страны
    const settings = await prisma.smmProjectSettings.findUnique({
      where: { countryId }
    });
    
    const postsPlanMonthly = settings?.postsPlanMonthly || 0;
    const storiesPlanMonthly = settings?.storiesPlanMonthly || 0;
    const miniReviewsPlanMonthly = settings?.miniReviewsPlanMonthly || 0;
    const bigReviewsPlanMonthly = settings?.bigReviewsPlanMonthly || 0;
    
    const postsPlanDaily = settings?.postsPlanDaily || 0;
    const storiesPlanDaily = settings?.storiesPlanDaily || 0;
    const miniReviewsPlanDaily = settings?.miniReviewsPlanDaily || 0;
    const bigReviewsPlanDaily = settings?.bigReviewsPlanDaily || 0;
    
    // Считаем сумму фактов за месяц (исключая текущую запись)
    const monthStart = new Date(recordDate.getFullYear(), recordDate.getMonth(), 1);
    const monthEnd = new Date(recordDate.getFullYear(), recordDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const monthlyTotals = await prisma.smmMetrics.aggregate({
      where: {
        countryId,
        date: { gte: monthStart, lte: monthEnd },
        id: { not: id }
      },
      _sum: {
        postsTotal: true,
        storiesTotal: true,
        miniReviewsTotal: true,
        bigReviewsTotal: true,
      }
    });
    
    const existingPostsFact = monthlyTotals._sum?.postsTotal || 0;
    const existingStoriesFact = monthlyTotals._sum?.storiesTotal || 0;
    const existingMiniReviewsFact = monthlyTotals._sum?.miniReviewsTotal || 0;
    const existingBigReviewsFact = monthlyTotals._sum?.bigReviewsTotal || 0;
    
    const newPostsFact = updateData.postsTotal ?? existingRecord.postsTotal;
    const newStoriesFact = updateData.storiesTotal ?? existingRecord.storiesTotal;
    const newMiniReviewsFact = updateData.miniReviewsTotal ?? existingRecord.miniReviewsTotal;
    const newBigReviewsFact = updateData.bigReviewsTotal ?? existingRecord.bigReviewsTotal;
    
    const postsRemaining = Math.max(0, postsPlanMonthly - (existingPostsFact + newPostsFact));
    const storiesRemaining = Math.max(0, storiesPlanMonthly - (existingStoriesFact + newStoriesFact));
    const miniReviewsRemaining = Math.max(0, miniReviewsPlanMonthly - (existingMiniReviewsFact + newMiniReviewsFact));
    const bigReviewsRemaining = Math.max(0, bigReviewsPlanMonthly - (existingBigReviewsFact + newBigReviewsFact));

    const totalPlan = postsPlanDaily + storiesPlanDaily + miniReviewsPlanDaily + bigReviewsPlanDaily;
    const totalFact = newPostsFact + newStoriesFact + newMiniReviewsFact + newBigReviewsFact;
    const completionRate = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;

    const metric = await prisma.smmMetrics.update({
      where: { id },
      data: {
        date: recordDate,
        countryId,
        postsPlan: postsPlanDaily,
        postsPlanDaily,
        postsFactDaily: newPostsFact,
        postsTotal: newPostsFact,
        postsRemaining,
        storiesPlan: storiesPlanDaily,
        storiesPlanDaily,
        storiesFactDaily: newStoriesFact,
        storiesTotal: newStoriesFact,
        storiesRemaining,
        miniReviewsPlan: miniReviewsPlanDaily,
        miniReviewsPlanDaily,
        miniReviewsFactDaily: newMiniReviewsFact,
        miniReviewsTotal: newMiniReviewsFact,
        miniReviewsRemaining,
        bigReviewsPlan: bigReviewsPlanDaily,
        bigReviewsPlanDaily,
        bigReviewsFactDaily: newBigReviewsFact,
        bigReviewsTotal: newBigReviewsFact,
        bigReviewsRemaining,
        completionRate,
        notes: updateData.notes !== undefined ? updateData.notes : existingRecord.notes,
      },
      include: {
        employee: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error("Error updating SMM metric:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
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

    await prisma.smmMetrics.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SMM metric:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
