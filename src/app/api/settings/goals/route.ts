import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_GOAL_SETTINGS: Record<string, { value: string; description: string }> = {
  dailyProfitGoal: { value: "500", description: "Дневная цель прибыли ($)" },
  monthlyProfitGoal: { value: "10000", description: "Месячная цель прибыли ($)" },
  targetROI: { value: "50", description: "Целевой ROI (%)" },
  milestone1Amount: { value: "1000", description: "Первый milestone ($)" },
  milestone2Amount: { value: "5000", description: "Второй milestone ($)" },
  milestone3Amount: { value: "10000", description: "Мастер milestone ($)" },
  weekInProfitDays: { value: "7", description: "Дней для 'Неделя в плюсе'" },
  monthOfStabilityDays: { value: "30", description: "Дней для 'Стабильность'" },
};

export async function GET() {
  try {
    const goalKeys = Object.keys(DEFAULT_GOAL_SETTINGS);
    const dbSettings = await prisma.settings.findMany({
      where: {
        key: {
          in: goalKeys,
        },
      },
    });

    const settings: Record<string, string> = {};

    for (const [key, def] of Object.entries(DEFAULT_GOAL_SETTINGS)) {
      settings[key] = def.value;
    }

    for (const setting of dbSettings) {
      settings[setting.key] = setting.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching goal settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch goal settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Invalid settings format" },
        { status: 400 }
      );
    }

    const updates = [];
    const goalKeys = Object.keys(DEFAULT_GOAL_SETTINGS);

    for (const [key, value] of Object.entries(body)) {
      if (goalKeys.includes(key) && (typeof value === "string" || typeof value === "number")) {
        const stringValue = String(value);
        const description = DEFAULT_GOAL_SETTINGS[key]?.description || null;

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
    console.error("Error saving goal settings:", error);
    return NextResponse.json(
      { error: "Failed to save goal settings" },
      { status: 500 }
    );
  }
}
