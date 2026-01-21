import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cabinetId = searchParams.get("cabinetId");

    const desks = await prisma.desk.findMany({
      where: cabinetId ? { cabinetId } : undefined,
      include: {
        cabinet: {
          include: { country: true },
        },
        employee: true,
        _count: { select: { buyerMetrics: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(desks);
  } catch (error) {
    console.error("Error fetching desks:", error);
    return NextResponse.json({ error: "Failed to fetch desks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cabinetId, employeeId, description } = body;

    if (!name || !cabinetId) {
      return NextResponse.json({ error: "Name and cabinetId are required" }, { status: 400 });
    }

    const desk = await prisma.desk.create({
      data: {
        name,
        cabinetId,
        employeeId,
        description,
      },
      include: {
        cabinet: true,
        employee: true,
      },
    });

    return NextResponse.json(desk);
  } catch (error) {
    console.error("Error creating desk:", error);
    return NextResponse.json({ error: "Failed to create desk" }, { status: 500 });
  }
}
