import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEditorAuth } from "@/lib/auth";
import { getCrossgifData, getFbmData } from "@/lib/google-sheets";

const CROSSGIF_SPREADSHEET_ID = "1juk7449zs4jpNuI-o5X7XCsKjbIAXWPjQAMji4MmS2g";
const FBM_SPREADSHEET_ID = "1NKS2CVJjf-gXs5oSXRnCfdj2xXZOIvmvpVS0AiHDwXM";

interface DeskCountryMapping {
  [deskName: string]: string;
}

async function getDeskCountryMapping(): Promise<DeskCountryMapping> {
  const setting = await prisma.settings.findUnique({
    where: { key: "desk_country_mapping" }
  });
  
  if (!setting) {
    return {
      "Desk1": "AR",
      "Desk2": "PE2",
      "Desk3": "PE",
    };
  }
  
  try {
    return JSON.parse(setting.value);
  } catch {
    return {};
  }
}

async function getFbmCountryCode(): Promise<string> {
  const setting = await prisma.settings.findUnique({
    where: { key: "fbm_country_mapping" }
  });
  
  return setting?.value || "IT_F";
}

export async function POST(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get("sheetName") || "1/2026";
    const fbmSheetName = searchParams.get("fbmSheetName") || "DailySpend_Jan26";
    const year = parseInt(searchParams.get("year") || "2026");
    const month = parseInt(sheetName.split('/')[0]) || 1;

    const results: {
      agency: string;
      country: string;
      daysUpdated: number;
      totalSpend: number;
    }[] = [];

    const crossgifData = await getCrossgifData(CROSSGIF_SPREADSHEET_ID, sheetName);
    const deskMapping = await getDeskCountryMapping();
    
    console.log("CROSSGIF deskSpends:", crossgifData.deskSpends.map(d => ({
      name: d.deskName,
      total: d.totalSpend,
      daysWithSpend: d.dailySpends.filter(s => s.amount > 0).length
    })));
    console.log("Desk mapping:", deskMapping);

    for (const desk of crossgifData.deskSpends) {
      const countryCode = deskMapping[desk.deskName];
      if (!countryCode) {
        console.log(`No country mapping for desk: ${desk.deskName}`);
        continue;
      }

      const country = await prisma.country.findFirst({
        where: { code: countryCode }
      });

      if (!country) {
        console.log(`Country not found: ${countryCode}`);
        continue;
      }

      let daysUpdated = 0;
      let totalSpendUpdated = 0;

      for (const dailySpend of desk.dailySpends) {
        if (dailySpend.amount <= 0) continue;

        const date = new Date(year, month - 1, dailySpend.day);
        date.setHours(12, 0, 0, 0);

        const existing = await prisma.dailyMetrics.findFirst({
          where: {
            countryId: country.id,
            date: {
              gte: new Date(year, month - 1, dailySpend.day, 0, 0, 0),
              lt: new Date(year, month - 1, dailySpend.day + 1, 0, 0, 0),
            }
          }
        });

        if (existing) {
          await prisma.dailyMetrics.update({
            where: { id: existing.id },
            data: {
              spendCrossgif: dailySpend.amount,
              totalSpend: existing.spendTrust + dailySpend.amount + existing.spendFbm,
            }
          });
        } else {
          await prisma.dailyMetrics.create({
            data: {
              countryId: country.id,
              date,
              spendCrossgif: dailySpend.amount,
              totalSpend: dailySpend.amount,
            }
          });
        }

        daysUpdated++;
        totalSpendUpdated += dailySpend.amount;
      }

      if (daysUpdated > 0) {
        results.push({
          agency: "CROSSGIF",
          country: country.name,
          daysUpdated,
          totalSpend: totalSpendUpdated,
        });
      }
    }

    const fbmCountryCode = await getFbmCountryCode();
    const fbmCountry = await prisma.country.findFirst({
      where: { code: fbmCountryCode }
    });

    if (fbmCountry) {
      try {
        const fbmData = await getFbmData(FBM_SPREADSHEET_ID, fbmSheetName);
        
        let fbmDaysUpdated = 0;
        let fbmTotalSpend = 0;

        for (const dailySpend of fbmData.dailySpends) {
          if (dailySpend.amount <= 0) continue;

          const date = new Date(year, month - 1, dailySpend.day);
          date.setHours(12, 0, 0, 0);

          const existing = await prisma.dailyMetrics.findFirst({
            where: {
              countryId: fbmCountry.id,
              date: {
                gte: new Date(year, month - 1, dailySpend.day, 0, 0, 0),
                lt: new Date(year, month - 1, dailySpend.day + 1, 0, 0, 0),
              }
            }
          });

          if (existing) {
            await prisma.dailyMetrics.update({
              where: { id: existing.id },
              data: {
                spendFbm: dailySpend.amount,
                totalSpend: existing.spendTrust + existing.spendCrossgif + dailySpend.amount,
              }
            });
          } else {
            await prisma.dailyMetrics.create({
              data: {
                countryId: fbmCountry.id,
                date,
                spendFbm: dailySpend.amount,
                totalSpend: dailySpend.amount,
              }
            });
          }

          fbmDaysUpdated++;
          fbmTotalSpend += dailySpend.amount;
        }

        if (fbmDaysUpdated > 0) {
          results.push({
            agency: "FBM",
            country: fbmCountry.name,
            daysUpdated: fbmDaysUpdated,
            totalSpend: fbmTotalSpend,
          });
        }
      } catch (err) {
        console.error("Error syncing FBM data:", err);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error syncing spends:", error);
    return NextResponse.json(
      { error: "Ошибка синхронизации спендов: " + String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const deskMapping = await getDeskCountryMapping();
    const fbmCountry = await getFbmCountryCode();

    const countries = await prisma.country.findMany({
      select: { code: true, name: true }
    });

    return NextResponse.json({
      deskMapping,
      fbmCountry,
      availableCountries: countries,
    });
  } catch (error) {
    console.error("Error getting spend sync config:", error);
    return NextResponse.json(
      { error: "Ошибка получения конфигурации" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireEditorAuth();
    if (authError) return authError;

    const body = await request.json();
    const { deskMapping, fbmCountry } = body;

    if (deskMapping) {
      await prisma.settings.upsert({
        where: { key: "desk_country_mapping" },
        create: {
          key: "desk_country_mapping",
          value: JSON.stringify(deskMapping),
          description: "Маппинг дексов CROSSGIF на страны",
        },
        update: {
          value: JSON.stringify(deskMapping),
        }
      });
    }

    if (fbmCountry) {
      await prisma.settings.upsert({
        where: { key: "fbm_country_mapping" },
        create: {
          key: "fbm_country_mapping",
          value: fbmCountry,
          description: "Страна для FBM агентства",
        },
        update: {
          value: fbmCountry,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Настройки сохранены",
    });
  } catch (error) {
    console.error("Error updating spend sync config:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения настроек" },
      { status: 500 }
    );
  }
}
