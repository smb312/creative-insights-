import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { decryptAccessToken } from "@/lib/meta-api";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all active/pending accounts for this user
    const accounts = await prisma.adAccount.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PENDING_SELECTION"] },
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No connected Meta account found" },
        { status: 404 }
      );
    }

    // Revoke each token with Meta, then mark as DISCONNECTED
    for (const account of accounts) {
      try {
        const token = decryptAccessToken(account.encryptedAccessToken);
        // Best-effort revoke — Meta's permissions endpoint
        await fetch(
          `https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(token)}`,
          { method: "DELETE" }
        );
      } catch {
        // Token may already be expired/invalid — continue with disconnect
      }
    }

    // Mark all user accounts as DISCONNECTED
    await prisma.adAccount.updateMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PENDING_SELECTION"] },
      },
      data: { status: "DISCONNECTED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Meta account" },
      { status: 500 }
    );
  }
}
