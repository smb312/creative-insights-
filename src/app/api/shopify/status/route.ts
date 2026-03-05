import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = await prisma.shopifyStore.findUnique({
      where: { userId },
      select: {
        shopDomain: true,
        storeName: true,
        status: true,
        currency: true,
        lastSyncAt: true,
      },
    });

    if (!store || store.status !== "ACTIVE") {
      return NextResponse.json({ connected: false, store: null });
    }

    return NextResponse.json({
      connected: true,
      store: {
        shopDomain: store.shopDomain,
        storeName: store.storeName,
        status: store.status,
        currency: store.currency,
        lastSyncAt: store.lastSyncAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Shopify status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
