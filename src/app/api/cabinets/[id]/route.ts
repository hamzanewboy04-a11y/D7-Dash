import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    
    const cabinet = await prisma.cabinet.findUnique({
      where: { id },
      include: {
        desks: {
          include: {
            employee: true,
            _count: { select: { buyerMetrics: true } },
          },
        },
        country: true,
        _count: { select: { buyerMetrics: true } },
      },
    });

    if (!cabinet) {
      return NextResponse.json({ error: "Cabinet not found" }, { status: 404 });
    }

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error("Error fetching cabinet:", error);
    return NextResponse.json({ error: "Failed to fetch cabinet" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, platform, platformId, countryId, description, isActive } = body;

    const cabinet = await prisma.cabinet.update({
      where: { id },
      data: {
        name,
        platform,
        platformId,
        countryId,
        description,
        isActive,
      },
      include: {
        desks: true,
        country: true,
      },
    });

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error("Error updating cabinet:", error);
    return NextResponse.json({ error: "Failed to update cabinet" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const { id } = await params;

    await prisma.cabinet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cabinet:", error);
    return NextResponse.json({ error: "Failed to delete cabinet" }, { status: 500 });
  }
}
