import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    const roleError = await requireRole(["admin", "editor"]);
    if (roleError) return roleError;

    const { id } = await params;
    const body = await request.json();
    const { comment, countryId } = body;

    const updateData: Record<string, unknown> = {};
    
    if (comment !== undefined) {
      updateData.comment = comment;
    }
    
    if (countryId !== undefined) {
      updateData.countryId = countryId || null;
    }

    const transaction = await prisma.walletTransaction.update({
      where: { id },
      data: updateData,
      include: {
        countryWallet: {
          include: {
            country: true,
          },
        },
      },
    });

    const country = transaction.countryWallet?.country || 
      (transaction.countryId ? await prisma.country.findUnique({ where: { id: transaction.countryId } }) : null);

    return NextResponse.json({
      ...transaction,
      country,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
