import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");

    const cabinets = await prisma.cabinet.findMany({
      where: countryId ? { countryId } : undefined,
      include: {
        desks: {
          include: {
            employee: true,
            _count: {
              select: { buyerMetrics: true },
            },
          },
        },
        country: true,
        _count: {
          select: { buyerMetrics: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(cabinets);
  } catch (error) {
    console.error("Error fetching cabinets:", error);
    return NextResponse.json({ error: "Failed to fetch cabinets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, platform, platformId, countryId, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const cabinet = await prisma.cabinet.create({
      data: {
        name,
        platform,
        platformId,
        countryId,
        description,
      },
      include: {
        desks: true,
        country: true,
      },
    });

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error("Error creating cabinet:", error);
    return NextResponse.json({ error: "Failed to create cabinet" }, { status: 500 });
  }
}
