import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/countries - Get all countries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const status = searchParams.get("status"); // active, paused, disabled

    const where: Record<string, unknown> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (status) {
      where.status = status;
    }

    const countries = await prisma.country.findMany({
      where,
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
    const { name, code, currency, status } = body;

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
        status: status || "active",
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

// PATCH /api/countries - Update country status (bulk)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, isActive, name, code, currency } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Country ID is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!["active", "paused", "disabled"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be active, paused, or disabled" },
          { status: 400 }
        );
      }
      updateData.status = status;
      // Auto-update isActive based on status
      updateData.isActive = status !== "disabled";
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (code !== undefined) {
      updateData.code = code;
    }

    if (currency !== undefined) {
      updateData.currency = currency;
    }

    const country = await prisma.country.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(country);
  } catch (error) {
    console.error("Error updating country:", error);
    return NextResponse.json(
      { error: "Failed to update country" },
      { status: 500 }
    );
  }
}

// DELETE /api/countries - Delete a country
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Country ID is required" },
        { status: 400 }
      );
    }

    // Check if country has any metrics
    const metricsCount = await prisma.dailyMetrics.count({
      where: { countryId: id },
    });

    if (metricsCount > 0) {
      // Soft delete - just disable
      await prisma.country.update({
        where: { id },
        data: { isActive: false, status: "disabled" },
      });
      return NextResponse.json({
        success: true,
        message: "Country disabled (has existing data)",
      });
    }

    // Hard delete if no data
    await prisma.country.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Country deleted" });
  } catch (error) {
    console.error("Error deleting country:", error);
    return NextResponse.json(
      { error: "Failed to delete country" },
      { status: 500 }
    );
  }
}
