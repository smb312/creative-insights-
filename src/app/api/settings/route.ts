import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the user's active ad account, brand profile, and Shopify store in parallel
    const [adAccount, profile, shopifyStore] = await Promise.all([
      prisma.adAccount.findFirst({
        where: { userId, status: "ACTIVE" },
        select: {
          metaAccountName: true,
          status: true,
          lastSyncAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.brandProfile.findUnique({
        where: { userId },
        select: {
          brandName: true,
          industry: true,
          monthlyRevenueRange: true,
          briefsPaused: true,
        },
      }),
      prisma.shopifyStore.findUnique({
        where: { userId },
        select: {
          shopDomain: true,
          storeName: true,
          status: true,
          lastSyncAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      adAccount: adAccount
        ? {
            name: adAccount.metaAccountName,
            status: adAccount.status,
            lastSyncAt: adAccount.lastSyncAt?.toISOString() ?? null,
          }
        : null,
      profile: profile
        ? {
            brandName: profile.brandName,
            industry: profile.industry,
            monthlyRevenueRange: profile.monthlyRevenueRange,
            briefsPaused: profile.briefsPaused,
          }
        : null,
      shopifyStore:
        shopifyStore && shopifyStore.status === "ACTIVE"
          ? {
              shopDomain: shopifyStore.shopDomain,
              storeName: shopifyStore.storeName,
              lastSyncAt: shopifyStore.lastSyncAt?.toISOString() ?? null,
            }
          : null,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
