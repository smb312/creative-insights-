import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { calculatePacing } from "@/lib/pacing";
import type { MonthlyTargets, MtdActuals } from "@/lib/pacing";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

    // Get monthly targets
    const monthlyTarget = await prisma.monthlyTarget.findUnique({
      where: { userId_month: { userId, month: monthStart } },
    });

    if (!monthlyTarget) {
      return NextResponse.json({ pacing: null });
    }

    // Get user's ad IDs
    const userAds = await prisma.metaAd.findMany({
      where: { userId },
      select: { id: true },
    });
    const adIds = userAds.map((a) => a.id);

    if (adIds.length === 0) {
      return NextResponse.json({ pacing: null });
    }

    // Get MTD performance
    const mtdPerf = await prisma.metaAdPerformance.findMany({
      where: {
        metaAdId: { in: adIds },
        date: { gte: monthStart, lte: now },
      },
      select: { spend: true, conversions: true, conversionValue: true },
    });

    const mtdActuals: MtdActuals = {
      spend: mtdPerf.reduce((sum, r) => sum + r.spend, 0),
      conversions: mtdPerf.reduce((sum, r) => sum + r.conversions, 0),
      conversionValue: mtdPerf.reduce((sum, r) => sum + r.conversionValue, 0),
    };

    // Check for Shopify data — use Shopify revenue/orders for pacing if available
    let shopifyConnected = false;
    let shopifyMtdAov: number | null = null;

    try {
      const shopifyStore = await prisma.shopifyStore.findUnique({
        where: { userId },
      });

      if (shopifyStore && shopifyStore.status === "ACTIVE") {
        const shopifyMtd = await prisma.shopifyDailyMetric.findMany({
          where: {
            storeId: shopifyStore.id,
            date: { gte: monthStart, lte: now },
          },
          select: { totalRevenue: true, totalOrders: true },
        });

        if (shopifyMtd.length > 0) {
          shopifyConnected = true;
          const shopifyRevenue = shopifyMtd.reduce((s, r) => s + r.totalRevenue, 0);
          const shopifyOrders = shopifyMtd.reduce((s, r) => s + r.totalOrders, 0);
          shopifyMtdAov = shopifyOrders > 0 ? shopifyRevenue / shopifyOrders : 0;

          // Override with Shopify actuals for more accurate pacing
          mtdActuals.conversionValue = shopifyRevenue;
          mtdActuals.conversions = shopifyOrders;
        }
      }
    } catch {
      // Shopify data is optional
    }

    const targets: MonthlyTargets = {
      revenueGoal: monthlyTarget.revenueGoal,
      adSpendBudget: monthlyTarget.adSpendBudget,
      targetRoas: monthlyTarget.targetRoas,
      targetCpa: monthlyTarget.targetCpa,
      targetOrders: monthlyTarget.targetOrders,
      targetNewCac: monthlyTarget.targetNewCac,
    };

    const pacing = calculatePacing(targets, mtdActuals, now);

    return NextResponse.json({
      pacing,
      shopifyConnected,
      shopifyMtdAov,
    });
  } catch (error) {
    console.error("Error fetching pacing:", error);
    return NextResponse.json(
      { error: "Failed to fetch pacing data" },
      { status: 500 }
    );
  }
}
