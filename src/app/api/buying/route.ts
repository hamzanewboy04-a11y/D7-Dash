import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireEditorAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

function mapPlatformToBalanceCode(platform: string | null | undefined): string | null {
  if (!platform) return null;
  
  const normalized = platform.toUpperCase().trim();
  
  if (normalized === "CROSSGIF" || normalized === "КРОССГИФ") {
    return "CROSSGIF";
  }
  if (normalized === "FBM") {
    return "FBM";
  }
  if (normalized === "TRUST" || normalized === "ТРАСТ") {
    return "TRUST";
  }
  
  return normalized;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

async function createSpendTransaction(
  metricId: string,
  spend: number,
  date: Date,
  cabinetId: string | null | undefined,
  deskName: string | null | undefined
): Promise<void> {
  if (spend <= 0 || !cabinetId) {
    return;
  }

  try {
    const cabinet = await prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { name: true, platform: true },
    });

    if (!cabinet) {
      console.log('[Buying API] Cabinet not found for spend transaction:', cabinetId);
      return;
    }

    const balanceCode = mapPlatformToBalanceCode(cabinet.platform);
    if (!balanceCode) {
      console.log('[Buying API] Could not map platform to balance code:', cabinet.platform);
      return;
    }

    const balance = await prisma.balance.findFirst({
      where: { code: balanceCode, type: "agency" },
    });

    if (!balance) {
      console.log('[Buying API] Balance not found for code:', balanceCode);
      return;
    }

    const description = `Спенд баера ${formatDate(date)} - ${deskName || cabinet.name} (metric:${metricId})`;

    await prisma.balanceTransaction.create({
      data: {
        balanceId: balance.id,
        type: "spend",
        amount: spend,
        description,
        date,
      },
    });

    await prisma.balance.update({
      where: { id: balance.id },
      data: {
        currentAmount: {
          decrement: spend,
        },
      },
    });

    console.log('[Buying API] Created spend transaction:', { metricId, spend, balanceCode });
  } catch (error) {
    console.error('[Buying API] Error creating spend transaction:', error);
  }
}

async function reverseSpendTransaction(metricId: string): Promise<number> {
  try {
    const transaction = await prisma.balanceTransaction.findFirst({
      where: {
        description: { contains: `(metric:${metricId})` },
        type: "spend",
      },
    });

    if (!transaction) {
      return 0;
    }

    await prisma.balance.update({
      where: { id: transaction.balanceId },
      data: {
        currentAmount: {
          increment: transaction.amount,
        },
      },
    });

    await prisma.balanceTransaction.delete({
      where: { id: transaction.id },
    });

    console.log('[Buying API] Reversed spend transaction:', { metricId, amount: transaction.amount });
    return transaction.amount;
  } catch (error) {
    console.error('[Buying API] Error reversing spend transaction:', error);
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log('[Buying API] Query params:', { countryId, employeeId, startDate, endDate });

    const where: Record<string, unknown> = {};
    
    if (countryId) where.countryId = countryId;
    if (employeeId) where.employeeId = employeeId;
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, Date>).lte = new Date(endDate);
    }

    console.log('[Buying API] Where clause:', JSON.stringify(where));

    const totalRecords = await prisma.buyerMetrics.count();
    const countryStats = await prisma.buyerMetrics.groupBy({
      by: ['countryId'],
      _count: { id: true }
    });
    console.log('[Buying API] Total records in DB:', totalRecords);
    console.log('[Buying API] Records by countryId:', JSON.stringify(countryStats));

    const metrics = await prisma.buyerMetrics.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, role: true } },
        country: { select: { id: true, name: true, code: true } },
        cabinet: { select: { id: true, name: true, platform: true } },
        desk: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { deskId: "asc" }],
    });

    const countryCounts: Record<string, number> = {};
    metrics.forEach(m => {
      const countryName = m.country?.name || 'Unknown';
      countryCounts[countryName] = (countryCounts[countryName] || 0) + 1;
    });
    console.log('[Buying API] Results by country:', countryCounts, 'Total:', metrics.length);

    const totals = await prisma.buyerMetrics.aggregate({
      where,
      _sum: {
        spend: true,
        subscriptions: true,
        dialogs: true,
        fdCount: true,
        payrollAmount: true,
      },
      _avg: {
        costPerSubscription: true,
        costPerFd: true,
        conversionRate: true,
      },
    });

    return NextResponse.json({ metrics, totals }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Error fetching buyer metrics:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    
    const spend = data.spendManual || data.spend || 0;
    const subscriptions = data.subscriptions || 0;
    const fdCount = data.fdCount || 0;
    const dialogs = data.dialogs || 0;
    
    const costPerSubscription = subscriptions > 0 ? spend / subscriptions : 0;
    const costPerFd = fdCount > 0 ? spend / fdCount : 0;
    const conversionRate = subscriptions > 0 ? (dialogs / subscriptions) * 100 : 0;
    const payrollAmount = spend * 0.10;

    const metricDate = new Date(data.date);

    const metric = await prisma.buyerMetrics.create({
      data: {
        date: metricDate,
        employeeId: data.employeeId,
        countryId: data.countryId,
        cabinetId: data.cabinetId,
        deskId: data.deskId,
        spendManual: data.spendManual,
        spend,
        subscriptions,
        dialogs,
        fdCount,
        costPerSubscription,
        costPerFd,
        conversionRate,
        payrollAmount,
        deskName: data.deskName,
        platformName: data.platformName,
        notes: data.notes,
      },
      include: {
        employee: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        cabinet: { select: { id: true, name: true, platform: true } },
        desk: { select: { id: true, name: true } },
      },
    });

    if (spend > 0 && data.cabinetId) {
      await createSpendTransaction(
        metric.id,
        spend,
        metricDate,
        data.cabinetId,
        data.deskName || metric.desk?.name
      );
    }

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error("Error creating buyer metric:", error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existingMetric = await prisma.buyerMetrics.findUnique({
      where: { id },
      include: {
        cabinet: { select: { id: true, name: true, platform: true } },
        desk: { select: { id: true, name: true } },
      },
    });

    if (!existingMetric) {
      return NextResponse.json({ error: "Metric not found" }, { status: 404 });
    }

    const spend = updateData.spendManual || updateData.spend || 0;
    const subscriptions = updateData.subscriptions || 0;
    const fdCount = updateData.fdCount || 0;
    const dialogs = updateData.dialogs || 0;

    const costPerSubscription = subscriptions > 0 ? spend / subscriptions : 0;
    const costPerFd = fdCount > 0 ? spend / fdCount : 0;
    const conversionRate = subscriptions > 0 ? (dialogs / subscriptions) * 100 : 0;
    const payrollAmount = spend * 0.10;

    const metricDate = updateData.date ? new Date(updateData.date) : existingMetric.date;
    const newCabinetId = updateData.cabinetId !== undefined ? updateData.cabinetId : existingMetric.cabinetId;

    const oldSpend = existingMetric.spend || 0;
    const spendChanged = Math.abs(spend - oldSpend) > 0.001;
    const cabinetChanged = newCabinetId !== existingMetric.cabinetId;

    if (spendChanged || cabinetChanged) {
      await reverseSpendTransaction(id);
      
      if (spend > 0 && newCabinetId) {
        const deskName = updateData.deskName !== undefined ? updateData.deskName : existingMetric.deskName;
        await createSpendTransaction(id, spend, metricDate, newCabinetId, deskName || existingMetric.desk?.name);
      }
    }

    const metric = await prisma.buyerMetrics.update({
      where: { id },
      data: {
        ...updateData,
        date: metricDate,
        spend,
        costPerSubscription,
        costPerFd,
        conversionRate,
        payrollAmount,
      },
      include: {
        employee: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        cabinet: { select: { id: true, name: true, platform: true } },
        desk: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error("Error updating buyer metric:", error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireEditorAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await reverseSpendTransaction(id);

    await prisma.buyerMetrics.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting buyer metric:", error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
