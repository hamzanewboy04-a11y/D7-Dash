import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canEdit } from "@/lib/auth";
import { z } from "zod";

// Validation schema for country settings
const countrySettingsSchema = z.object({
  countryId: z.string().min(1),
  priemkaCommissionRate: z.number().min(0).max(1).optional(),
  buyerPayrollRate: z.number().min(0).max(1).optional(),
  rdHandlerRate: z.number().min(0).max(1).optional(),
  fdTier1Rate: z.number().min(0).max(1000).optional(),
  fdTier2Rate: z.number().min(0).max(1000).optional(),
  fdTier3Rate: z.number().min(0).max(1000).optional(),
  fdBonusThreshold: z.number().int().min(0).max(100).optional(),
  fdBonus: z.number().min(0).max(1000).optional(),
  fdMultiplier: z.number().min(0).max(10).optional(),
  headDesignerFixed: z.number().min(0).max(10000).optional(),
  contentFixedRate: z.number().min(0).max(10000).optional(),
  designerFixedRate: z.number().min(0).max(10000).optional(),
  reviewerFixedRate: z.number().min(0).max(10000).optional(),
  chatterfyCostDefault: z.number().min(0).max(10000).optional(),
});

// GET /api/countries/settings?countryId=xxx - Get country-specific settings
export async function GET(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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
    // Check authentication and permissions
    const user = await getCurrentUser();
    if (!user || !canEdit(user)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validation = countrySettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { countryId, ...settingsData } = validation.data;

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
    // Check authentication and permissions
    const user = await getCurrentUser();
    if (!user || !canEdit(user)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

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
