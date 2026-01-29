import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/countries/settings?countryId=xxx - Get country-specific settings
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");

    if (!countryId) {
      return NextResponse.json(
        { error: "countryId is required" },
        { status: 400 }
      );
    }

    // Get country settings or return null if not found
    const settings = await prisma.countrySettings.findUnique({
      where: { countryId },
      include: { country: true },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching country settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch country settings" },
      { status: 500 }
    );
  }
}

// POST /api/countries/settings - Create or update country settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { countryId, ...settingsData } = body;

    if (!countryId) {
      return NextResponse.json(
        { error: "countryId is required" },
        { status: 400 }
      );
    }

    // Verify country exists
    const country = await prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return NextResponse.json(
        { error: "Country not found" },
        { status: 404 }
      );
    }

    // Upsert settings
    const settings = await prisma.countrySettings.upsert({
      where: { countryId },
      create: {
        countryId,
        ...settingsData,
      },
      update: settingsData,
      include: { country: true },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving country settings:", error);
    return NextResponse.json(
      { error: "Failed to save country settings" },
      { status: 500 }
    );
  }
}

// DELETE /api/countries/settings?countryId=xxx - Delete country settings (reset to defaults)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");

    if (!countryId) {
      return NextResponse.json(
        { error: "countryId is required" },
        { status: 400 }
      );
    }

    await prisma.countrySettings.delete({
      where: { countryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting country settings:", error);
    return NextResponse.json(
      { error: "Failed to delete country settings" },
      { status: 500 }
    );
  }
}
