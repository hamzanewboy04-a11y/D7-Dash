import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const desk = await prisma.desk.findUnique({
      where: { id },
      include: {
        cabinet: { include: { country: true } },
        employee: true,
        _count: { select: { buyerMetrics: true } },
      },
    });

    if (!desk) {
      return NextResponse.json({ error: "Desk not found" }, { status: 404 });
    }

    return NextResponse.json(desk);
  } catch (error) {
    console.error("Error fetching desk:", error);
    return NextResponse.json({ error: "Failed to fetch desk" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, cabinetId, employeeId, description, isActive } = body;

    const desk = await prisma.desk.update({
      where: { id },
      data: {
        name,
        cabinetId,
        employeeId,
        description,
        isActive,
      },
      include: {
        cabinet: true,
        employee: true,
      },
    });

    return NextResponse.json(desk);
  } catch (error) {
    console.error("Error updating desk:", error);
    return NextResponse.json({ error: "Failed to update desk" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.desk.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting desk:", error);
    return NextResponse.json({ error: "Failed to delete desk" }, { status: 500 });
  }
}
