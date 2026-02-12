import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adAccountId } = await request.json();

    if (!adAccountId) {
      return NextResponse.json(
        { error: "adAccountId is required" },
        { status: 400 }
      );
    }

    // Verify the selected account belongs to this user
    const selectedAccount = await prisma.adAccount.findFirst({
      where: { id: adAccountId, userId },
    });

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

    // Set all other accounts for this user to DISCONNECTED
    await prisma.adAccount.updateMany({
      where: {
        userId,
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
