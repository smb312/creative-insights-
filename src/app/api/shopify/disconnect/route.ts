import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.shopifyStore.findUnique({ where: { userId } });
    if (!store) {
      return NextResponse.json(
        { error: "No Shopify store connected" },
        { status: 404 }
      );
    }

    // Attempt to revoke the access token via Shopify API
    try {
      await fetch(
        `https://${store.shopDomain}/admin/api/2024-01/access_tokens/current.json`,
        {
          method: "DELETE",
          headers: { "X-Shopify-Access-Token": store.accessToken },
        }
      );
    } catch {
      // Revocation failure is non-critical
    }

    // Set status to DISCONNECTED
    await prisma.shopifyStore.update({
      where: { userId },
      data: { status: "DISCONNECTED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shopify disconnect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
