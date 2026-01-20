import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/seed - Initialize database with default data
export async function POST() {
  try {
    // Create countries
    const countries = [
      { name: "Peru", code: "PE", currency: "SOL" },
      { name: "Italy (Women)", code: "IT_F", currency: "EUR" },
      { name: "Italy (Men)", code: "IT_M", currency: "EUR" },
      { name: "Argentina", code: "AR", currency: "ARS" },
      { name: "Chile", code: "CL", currency: "CLP" },
    ];

    const createdCountries = [];
    for (const countryData of countries) {
      const country = await prisma.country.upsert({
        where: { code: countryData.code },
        update: {},
        create: countryData,
      });
      createdCountries.push(country);
    }

    // Create ad accounts for each country
    const adAccountTypes = [
      { name: "TRUST", agencyFeeRate: 0.09 },
      { name: "CROSSGIF", agencyFeeRate: 0.08 },
      { name: "FBM", agencyFeeRate: 0.08 },
    ];

    const createdAdAccounts = [];
    for (const country of createdCountries) {
      for (const accountType of adAccountTypes) {
        const existingAccount = await prisma.adAccount.findFirst({
          where: {
            countryId: country.id,
            name: accountType.name,
          },
        });

        if (!existingAccount) {
          const account = await prisma.adAccount.create({
            data: {
              name: accountType.name,
              agencyFeeRate: accountType.agencyFeeRate,
              countryId: country.id,
            },
          });
          createdAdAccounts.push(account);
        }
      }
    }

    // Create default settings
    const settings = [
      { key: "trust_agency_fee", value: "0.09", description: "TRUST agency fee rate (9%)" },
      { key: "crossgif_agency_fee", value: "0.08", description: "CROSSGIF agency fee rate (8%)" },
      { key: "fbm_agency_fee", value: "0.08", description: "FBM agency fee rate (8%)" },
      { key: "priemka_commission", value: "0.15", description: "Partner (Priemka) commission rate (15%)" },
      { key: "buyer_rate", value: "0.12", description: "Buyer payroll rate (12% of spend)" },
      { key: "rd_handler_rate", value: "0.04", description: "RD Handler payroll rate (4%)" },
      { key: "head_designer_fixed", value: "10", description: "Head Designer fixed rate ($10)" },
      { key: "fd_tier1_rate", value: "3", description: "FD Handler tier 1 rate (count < 5)" },
      { key: "fd_tier2_rate", value: "4", description: "FD Handler tier 2 rate (5-10)" },
      { key: "fd_tier3_rate", value: "5", description: "FD Handler tier 3 rate (10+)" },
      { key: "fd_bonus_threshold", value: "5", description: "FD bonus threshold (count >= 5)" },
      { key: "fd_bonus", value: "15", description: "FD bonus amount ($15)" },
      { key: "fd_multiplier", value: "1.2", description: "FD payroll multiplier" },
    ];

    for (const setting of settings) {
      await prisma.settings.upsert({
        where: { key: setting.key },
        update: { value: setting.value, description: setting.description },
        create: setting,
      });
    }

    // Create sample employees
    const employees = [
      { name: "Buyer Peru 1", role: "buyer", countryCode: "PE", percentRate: 0.12 },
      { name: "Buyer Peru 2", role: "buyer", countryCode: "PE", percentRate: 0.12 },
      { name: "Buyer Italy 1", role: "buyer", countryCode: "IT_F", percentRate: 0.12 },
      { name: "FD Handler 1", role: "fd_handler", countryCode: "PE" },
      { name: "FD Handler 2", role: "fd_handler", countryCode: "IT_F" },
      { name: "RD Handler 1", role: "rd_handler", countryCode: "PE", percentRate: 0.04 },
      { name: "Content Manager", role: "content", countryCode: null },
      { name: "Designer 1", role: "designer", countryCode: null },
      { name: "Head Designer", role: "head_designer", countryCode: null, fixedRate: 10 },
      { name: "Reviewer 1", role: "reviewer", countryCode: null },
    ];

    for (const emp of employees) {
      const country = emp.countryCode
        ? createdCountries.find(c => c.code === emp.countryCode)
        : null;

      const existingEmployee = await prisma.employee.findFirst({
        where: { name: emp.name },
      });

      if (!existingEmployee) {
        await prisma.employee.create({
          data: {
            name: emp.name,
            role: emp.role,
            countryId: country?.id || null,
            fixedRate: emp.fixedRate || null,
            percentRate: emp.percentRate || null,
          },
        });
      }
    }

    return NextResponse.json({
      message: "Database seeded successfully",
      countries: createdCountries.length,
      adAccounts: createdAdAccounts.length,
      settings: settings.length,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check if database is seeded
export async function GET() {
  try {
    const countriesCount = await prisma.country.count();
    const adAccountsCount = await prisma.adAccount.count();
    const settingsCount = await prisma.settings.count();
    const employeesCount = await prisma.employee.count();

    return NextResponse.json({
      seeded: countriesCount > 0,
      counts: {
        countries: countriesCount,
        adAccounts: adAccountsCount,
        settings: settingsCount,
        employees: employeesCount,
      },
    });
  } catch (error) {
    console.error("Error checking seed status:", error);
    return NextResponse.json(
      { error: "Failed to check seed status", details: String(error) },
      { status: 500 }
    );
  }
}
