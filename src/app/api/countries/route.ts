import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/countries - Get all countries
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      include: {
        adAccounts: true,
        _count: {
          select: { dailyMetrics: true, employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}

// POST /api/countries - Create a new country
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, currency } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const country = await prisma.country.create({
      data: {
        name,
        code,
        currency: currency || "USDT",
      },
    });

    return NextResponse.json(country, { status: 201 });
  } catch (error) {
    console.error("Error creating country:", error);
    return NextResponse.json(
      { error: "Failed to create country" },
      { status: 500 }
    );
  }
}
