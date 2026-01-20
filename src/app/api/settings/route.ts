import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Default settings
const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  trustAgencyFee: { value: "9", description: "TRUST комиссия агентства (%)" },
  crossgifAgencyFee: { value: "8", description: "CROSSGIF комиссия агентства (%)" },
  fbmAgencyFee: { value: "8", description: "FBM комиссия агентства (%)" },
  priemkaCommission: { value: "15", description: "Комиссия приёмки (%)" },
  buyerRate: { value: "12", description: "Ставка баера (% от спенда)" },
  rdHandlerRate: { value: "4", description: "Ставка обработчика РД (%)" },
  headDesignerFixed: { value: "10", description: "Хед дизайнер фикс ($)" },
  contentFixedRate: { value: "15", description: "Контент фикс за день ($)" },
  designerFixedRate: { value: "20", description: "Дизайнер фикс за проект/день ($)" },
  reviewerFixedRate: { value: "10", description: "Отзовик фикс за проект/день ($)" },
  fdTier1Rate: { value: "3", description: "ФД Тир 1 (< 5) $" },
  fdTier2Rate: { value: "4", description: "ФД Тир 2 (5-10) $" },
  fdTier3Rate: { value: "5", description: "ФД Тир 3 (> 10) $" },
  fdBonusThreshold: { value: "5", description: "Порог бонуса ФД (кол-во)" },
  fdBonus: { value: "15", description: "Сумма бонуса ФД ($)" },
  fdMultiplier: { value: "1.2", description: "Множитель ФД" },
  filterZeroSpend: { value: "true", description: "Исключать дни с нулевым спендом" },
};

// GET /api/settings - Get all settings
export async function GET() {
  try {
    // Get settings from database
    const dbSettings = await prisma.settings.findMany();

    // Merge with defaults
    const settings: Record<string, string> = {};

    // First, apply defaults
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      settings[key] = def.value;
    }

    // Then override with database values
    for (const setting of dbSettings) {
      settings[setting.key] = setting.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST /api/settings - Save settings
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate that body is an object with string keys and values
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid settings format" },
        { status: 400 }
      );
    }

    // Upsert each setting
    const updates = [];
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        const stringValue = String(value);
        const description = DEFAULT_SETTINGS[key]?.description || null;

        updates.push(
          prisma.settings.upsert({
            where: { key },
            create: { key, value: stringValue, description },
            update: { value: stringValue },
          })
        );
      }
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
