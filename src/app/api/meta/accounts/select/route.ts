import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId, adAccountId } = await request.json();

    if (!brandId || !adAccountId) {
      return NextResponse.json(
        { error: "brandId and adAccountId are required" },
        { status: 400 }
      );
    }

    // Verify brand ownership
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
      include: { adAccounts: true },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Verify the selected account belongs to this brand
    const selectedAccount = brand.adAccounts.find((a) => a.id === adAccountId);
    if (!selectedAccount) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    // Set the selected account to ACTIVE
    await prisma.adAccount.update({
      where: { id: adAccountId },
      data: { status: "ACTIVE" },
    });

    // Set all other accounts for this brand to DISCONNECTED
    await prisma.adAccount.updateMany({
      where: {
        brandId,
        id: { not: adAccountId },
      },
      data: { status: "DISCONNECTED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account selection error:", error);
    return NextResponse.json(
      { error: "Failed to select ad account" },
      { status: 500 }
    );
  }
}
