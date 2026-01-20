import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth } from "@/lib/auth";

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
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    const metrics = await prisma.smmMetrics.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, role: true } },
        country: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ date: "desc" }, { countryId: "asc" }],
    });

    const totals = await prisma.smmMetrics.aggregate({
      where,
      _sum: {
        postsPlan: true,
        postsTotal: true,
        storiesPlan: true,
        storiesTotal: true,
        miniReviewsPlan: true,
        miniReviewsTotal: true,
        bigReviewsPlan: true,
        bigReviewsTotal: true,
      },
    });

    return NextResponse.json({ metrics, totals });
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

    const totalPlan = (data.postsPlan || 0) + (data.storiesPlan || 0) + 
                      (data.miniReviewsPlan || 0) + (data.bigReviewsPlan || 0);
    const totalFact = (data.postsTotal || 0) + (data.storiesTotal || 0) + 
                      (data.miniReviewsTotal || 0) + (data.bigReviewsTotal || 0);
    const completionRate = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;

    const metric = await prisma.smmMetrics.create({
      data: {
        date: new Date(data.date),
        countryId: data.countryId,
        employeeId: data.employeeId || null,
        postsPlan: data.postsPlan || 0,
        postsPlanDaily: data.postsPlanDaily || 0,
        postsFactDaily: data.postsFactDaily || 0,
        postsTotal: data.postsTotal || 0,
        postsRemaining: data.postsRemaining || 0,
        storiesPlan: data.storiesPlan || 0,
        storiesPlanDaily: data.storiesPlanDaily || 0,
        storiesFactDaily: data.storiesFactDaily || 0,
        storiesTotal: data.storiesTotal || 0,
        storiesRemaining: data.storiesRemaining || 0,
        miniReviewsPlan: data.miniReviewsPlan || 0,
        miniReviewsPlanDaily: data.miniReviewsPlanDaily || 0,
        miniReviewsFactDaily: data.miniReviewsFactDaily || 0,
        miniReviewsTotal: data.miniReviewsTotal || 0,
        miniReviewsRemaining: data.miniReviewsRemaining || 0,
        bigReviewsPlan: data.bigReviewsPlan || 0,
        bigReviewsPlanDaily: data.bigReviewsPlanDaily || 0,
        bigReviewsFactDaily: data.bigReviewsFactDaily || 0,
        bigReviewsTotal: data.bigReviewsTotal || 0,
        bigReviewsRemaining: data.bigReviewsRemaining || 0,
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

    const totalPlan = (updateData.postsPlan || 0) + (updateData.storiesPlan || 0) + 
                      (updateData.miniReviewsPlan || 0) + (updateData.bigReviewsPlan || 0);
    const totalFact = (updateData.postsTotal || 0) + (updateData.storiesTotal || 0) + 
                      (updateData.miniReviewsTotal || 0) + (updateData.bigReviewsTotal || 0);
    const completionRate = totalPlan > 0 ? (totalFact / totalPlan) * 100 : 0;

    const metric = await prisma.smmMetrics.update({
      where: { id },
      data: {
        ...updateData,
        date: updateData.date ? new Date(updateData.date) : undefined,
        completionRate,
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
