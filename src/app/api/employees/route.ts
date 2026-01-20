import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canEdit } from "@/lib/auth";

// GET - Получить список сотрудников
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");

    const where: Record<string, unknown> = {};
    if (countryId) {
      where.countryId = countryId;
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        payrollRecords: {
          where: {
            isPaid: false,
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

    // Calculate unpaid balance for each employee
    const employeesWithBalance = employees.map((emp) => ({
      ...emp,
      unpaidBalance: emp.currentBalance + emp.payrollRecords.reduce((sum, r) => sum + r.amount, 0),
      payrollRecords: undefined, // Remove the records from response
    }));

    return NextResponse.json(employeesWithBalance);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Ошибка при получении списка сотрудников" },
      { status: 500 }
    );
  }
}

// POST - Создать нового сотрудника
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canEdit(user)) {
      return NextResponse.json(
        { error: "Недостаточно прав для выполнения операции" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      role,
      countryId,
      fixedRate,
      percentRate,
      paymentType,
      bufferDays,
      paymentDay1,
      paymentDay2,
      currentBalance,
      // Buyer tiers
      buyerTier1Threshold,
      buyerTier1Rate,
      buyerTier2Threshold,
      buyerTier2Rate,
      buyerTier3Threshold,
      buyerTier3Rate,
      buyerBonusThreshold,
      buyerBonusAmount,
      // RD Handler tiers
      rdTier1Threshold,
      rdTier1Rate,
      rdTier2Threshold,
      rdTier2Rate,
      rdTier3Threshold,
      rdTier3Rate,
      rdBonusThreshold,
      rdBonusAmount,
      // FD Handler tiers
      fdTier1Rate,
      fdTier1MaxCount,
      fdTier2Rate,
      fdTier2MaxCount,
      fdTier3Rate,
      fdTier3MaxCount,
      fdTier4Rate,
      fdTier4MaxCount,
      fdTier5Rate,
      fdBonusThreshold,
      fdBonus,
      // Additional fields
      notes,
      startDate,
      contractType,
    } = body;

    if (!name || !role) {
      return NextResponse.json(
        { error: "Имя и роль обязательны" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        role,
        countryId: countryId || null,
        fixedRate: fixedRate ? parseFloat(fixedRate) : null,
        percentRate: percentRate ? parseFloat(percentRate) : null,
        paymentType: paymentType || "buffer",
        bufferDays: bufferDays ? parseInt(bufferDays) : 7,
        paymentDay1: paymentDay1 ? parseInt(paymentDay1) : null,
        paymentDay2: paymentDay2 ? parseInt(paymentDay2) : null,
        currentBalance: currentBalance ? parseFloat(currentBalance) : 0,
        // Buyer tiers
        buyerTier1Threshold: buyerTier1Threshold ? parseFloat(buyerTier1Threshold) : null,
        buyerTier1Rate: buyerTier1Rate ? parseFloat(buyerTier1Rate) : null,
        buyerTier2Threshold: buyerTier2Threshold ? parseFloat(buyerTier2Threshold) : null,
        buyerTier2Rate: buyerTier2Rate ? parseFloat(buyerTier2Rate) : null,
        buyerTier3Threshold: buyerTier3Threshold ? parseFloat(buyerTier3Threshold) : null,
        buyerTier3Rate: buyerTier3Rate ? parseFloat(buyerTier3Rate) : null,
        buyerBonusThreshold: buyerBonusThreshold ? parseFloat(buyerBonusThreshold) : null,
        buyerBonusAmount: buyerBonusAmount ? parseFloat(buyerBonusAmount) : null,
        // RD Handler tiers
        rdTier1Threshold: rdTier1Threshold ? parseFloat(rdTier1Threshold) : null,
        rdTier1Rate: rdTier1Rate ? parseFloat(rdTier1Rate) : null,
        rdTier2Threshold: rdTier2Threshold ? parseFloat(rdTier2Threshold) : null,
        rdTier2Rate: rdTier2Rate ? parseFloat(rdTier2Rate) : null,
        rdTier3Threshold: rdTier3Threshold ? parseFloat(rdTier3Threshold) : null,
        rdTier3Rate: rdTier3Rate ? parseFloat(rdTier3Rate) : null,
        rdBonusThreshold: rdBonusThreshold ? parseFloat(rdBonusThreshold) : null,
        rdBonusAmount: rdBonusAmount ? parseFloat(rdBonusAmount) : null,
        // FD Handler tiers
        fdTier1Rate: fdTier1Rate ? parseFloat(fdTier1Rate) : null,
        fdTier1MaxCount: fdTier1MaxCount ? parseInt(fdTier1MaxCount) : null,
        fdTier2Rate: fdTier2Rate ? parseFloat(fdTier2Rate) : null,
        fdTier2MaxCount: fdTier2MaxCount ? parseInt(fdTier2MaxCount) : null,
        fdTier3Rate: fdTier3Rate ? parseFloat(fdTier3Rate) : null,
        fdTier3MaxCount: fdTier3MaxCount ? parseInt(fdTier3MaxCount) : null,
        fdTier4Rate: fdTier4Rate ? parseFloat(fdTier4Rate) : null,
        fdTier4MaxCount: fdTier4MaxCount ? parseInt(fdTier4MaxCount) : null,
        fdTier5Rate: fdTier5Rate ? parseFloat(fdTier5Rate) : null,
        fdBonusThreshold: fdBonusThreshold ? parseInt(fdBonusThreshold) : null,
        fdBonus: fdBonus ? parseFloat(fdBonus) : null,
        // Additional fields
        notes: notes || null,
        startDate: startDate ? new Date(startDate) : null,
        contractType: contractType || null,
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Ошибка при создании сотрудника" },
      { status: 500 }
    );
  }
}

// PUT - Обновить сотрудника
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canEdit(user)) {
      return NextResponse.json(
        { error: "Недостаточно прав для выполнения операции" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      role,
      countryId,
      fixedRate,
      percentRate,
      isActive,
      paymentType,
      bufferDays,
      paymentDay1,
      paymentDay2,
      currentBalance,
      // Buyer tiers
      buyerTier1Threshold,
      buyerTier1Rate,
      buyerTier2Threshold,
      buyerTier2Rate,
      buyerTier3Threshold,
      buyerTier3Rate,
      buyerBonusThreshold,
      buyerBonusAmount,
      // RD Handler tiers
      rdTier1Threshold,
      rdTier1Rate,
      rdTier2Threshold,
      rdTier2Rate,
      rdTier3Threshold,
      rdTier3Rate,
      rdBonusThreshold,
      rdBonusAmount,
      // FD Handler tiers
      fdTier1Rate,
      fdTier1MaxCount,
      fdTier2Rate,
      fdTier2MaxCount,
      fdTier3Rate,
      fdTier3MaxCount,
      fdTier4Rate,
      fdTier4MaxCount,
      fdTier5Rate,
      fdBonusThreshold,
      fdBonus,
      // Additional fields
      notes,
      startDate,
      contractType,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID сотрудника обязателен" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (countryId !== undefined) updateData.countryId = countryId || null;
    if (fixedRate !== undefined) updateData.fixedRate = fixedRate ? parseFloat(fixedRate) : null;
    if (percentRate !== undefined) updateData.percentRate = percentRate ? parseFloat(percentRate) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (paymentType !== undefined) updateData.paymentType = paymentType;
    if (bufferDays !== undefined) updateData.bufferDays = parseInt(bufferDays);
    if (paymentDay1 !== undefined) updateData.paymentDay1 = paymentDay1 ? parseInt(paymentDay1) : null;
    if (paymentDay2 !== undefined) updateData.paymentDay2 = paymentDay2 ? parseInt(paymentDay2) : null;
    if (currentBalance !== undefined) updateData.currentBalance = parseFloat(currentBalance);
    // Buyer tiers
    if (buyerTier1Threshold !== undefined) updateData.buyerTier1Threshold = buyerTier1Threshold ? parseFloat(buyerTier1Threshold) : null;
    if (buyerTier1Rate !== undefined) updateData.buyerTier1Rate = buyerTier1Rate ? parseFloat(buyerTier1Rate) : null;
    if (buyerTier2Threshold !== undefined) updateData.buyerTier2Threshold = buyerTier2Threshold ? parseFloat(buyerTier2Threshold) : null;
    if (buyerTier2Rate !== undefined) updateData.buyerTier2Rate = buyerTier2Rate ? parseFloat(buyerTier2Rate) : null;
    if (buyerTier3Threshold !== undefined) updateData.buyerTier3Threshold = buyerTier3Threshold ? parseFloat(buyerTier3Threshold) : null;
    if (buyerTier3Rate !== undefined) updateData.buyerTier3Rate = buyerTier3Rate ? parseFloat(buyerTier3Rate) : null;
    if (buyerBonusThreshold !== undefined) updateData.buyerBonusThreshold = buyerBonusThreshold ? parseFloat(buyerBonusThreshold) : null;
    if (buyerBonusAmount !== undefined) updateData.buyerBonusAmount = buyerBonusAmount ? parseFloat(buyerBonusAmount) : null;
    // RD Handler tiers
    if (rdTier1Threshold !== undefined) updateData.rdTier1Threshold = rdTier1Threshold ? parseFloat(rdTier1Threshold) : null;
    if (rdTier1Rate !== undefined) updateData.rdTier1Rate = rdTier1Rate ? parseFloat(rdTier1Rate) : null;
    if (rdTier2Threshold !== undefined) updateData.rdTier2Threshold = rdTier2Threshold ? parseFloat(rdTier2Threshold) : null;
    if (rdTier2Rate !== undefined) updateData.rdTier2Rate = rdTier2Rate ? parseFloat(rdTier2Rate) : null;
    if (rdTier3Threshold !== undefined) updateData.rdTier3Threshold = rdTier3Threshold ? parseFloat(rdTier3Threshold) : null;
    if (rdTier3Rate !== undefined) updateData.rdTier3Rate = rdTier3Rate ? parseFloat(rdTier3Rate) : null;
    if (rdBonusThreshold !== undefined) updateData.rdBonusThreshold = rdBonusThreshold ? parseFloat(rdBonusThreshold) : null;
    if (rdBonusAmount !== undefined) updateData.rdBonusAmount = rdBonusAmount ? parseFloat(rdBonusAmount) : null;
    // FD Handler tiers
    if (fdTier1Rate !== undefined) updateData.fdTier1Rate = fdTier1Rate ? parseFloat(fdTier1Rate) : null;
    if (fdTier1MaxCount !== undefined) updateData.fdTier1MaxCount = fdTier1MaxCount ? parseInt(fdTier1MaxCount) : null;
    if (fdTier2Rate !== undefined) updateData.fdTier2Rate = fdTier2Rate ? parseFloat(fdTier2Rate) : null;
    if (fdTier2MaxCount !== undefined) updateData.fdTier2MaxCount = fdTier2MaxCount ? parseInt(fdTier2MaxCount) : null;
    if (fdTier3Rate !== undefined) updateData.fdTier3Rate = fdTier3Rate ? parseFloat(fdTier3Rate) : null;
    if (fdTier3MaxCount !== undefined) updateData.fdTier3MaxCount = fdTier3MaxCount ? parseInt(fdTier3MaxCount) : null;
    if (fdTier4Rate !== undefined) updateData.fdTier4Rate = fdTier4Rate ? parseFloat(fdTier4Rate) : null;
    if (fdTier4MaxCount !== undefined) updateData.fdTier4MaxCount = fdTier4MaxCount ? parseInt(fdTier4MaxCount) : null;
    if (fdTier5Rate !== undefined) updateData.fdTier5Rate = fdTier5Rate ? parseFloat(fdTier5Rate) : null;
    if (fdBonusThreshold !== undefined) updateData.fdBonusThreshold = fdBonusThreshold ? parseInt(fdBonusThreshold) : null;
    if (fdBonus !== undefined) updateData.fdBonus = fdBonus ? parseFloat(fdBonus) : null;
    // Additional fields
    if (notes !== undefined) updateData.notes = notes || null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (contractType !== undefined) updateData.contractType = contractType || null;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Ошибка при обновлении сотрудника" },
      { status: 500 }
    );
  }
}

// DELETE - Удалить сотрудника
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !canEdit(user)) {
      return NextResponse.json(
        { error: "Недостаточно прав для выполнения операции" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID сотрудника обязателен" },
        { status: 400 }
      );
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Ошибка при удалении сотрудника" },
      { status: 500 }
    );
  }
}
