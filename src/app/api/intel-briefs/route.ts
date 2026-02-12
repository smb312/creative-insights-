import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

// Signals that indicate a creator/partnership ad
const CREATOR_SIGNALS = [
  "paid partnership",
  "paid_partnership",
  "branded content",
  "branded_content",
  "creator",
  "influencer",
  "collab",
  "partnership",
  "sponsor",
  "ugc",
  "user generated",
  "user-generated",
  "ft.",
  "feat.",
  "featuring",
  "x ",
  " x ",
];

function isCreatorAd(ad: {
  name: string;
  creative: { name: string | null; title: string | null; body: string | null } | null;
}): boolean {
  const fields = [
    ad.name,
    ad.creative?.name,
    ad.creative?.title,
    ad.creative?.body,
  ]
    .filter(Boolean)
    .map((s) => s!.toLowerCase());

  for (const field of fields) {
    for (const signal of CREATOR_SIGNALS) {
      if (field.includes(signal)) return true;
    }
    // Check for @handle patterns (common for creator/influencer tags)
    if (/@\w{2,}/.test(field)) return true;
  }

  return false;
}

interface AggregatedMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  ctr: number;
  cpm: number;
  cpa: number | null;
  roas: number | null;
}

function aggregateMetrics(
  ads: {
    metrics: { spend: number; impressions: number; clicks: number; conversions: number; reach: number; roas: number | null }[];
  }[]
): AggregatedMetrics {
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let totalReach = 0;
  let roasSum = 0;
  let roasCount = 0;

  for (const ad of ads) {
    for (const m of ad.metrics) {
      totalSpend += m.spend;
      totalImpressions += m.impressions;
      totalClicks += m.clicks;
      totalConversions += m.conversions;
      totalReach += m.reach;
      if (m.roas !== null) {
        roasSum += m.roas;
        roasCount++;
      }
    }
  }

  return {
    spend: totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    conversions: totalConversions,
    reach: totalReach,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    cpa: totalConversions > 0 ? totalSpend / totalConversions : null,
    roas: roasCount > 0 ? roasSum / roasCount : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get("brandId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
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

    const adAccountIds = brand.adAccounts.map((a) => a.id);

    // Build date filter
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Fetch all ads with their creatives and metrics
    const ads = await prisma.ad.findMany({
      where: {
        adSet: {
          campaign: {
            adAccountId: { in: adAccountIds },
          },
        },
      },
      include: {
        creative: true,
        metrics: {
          where: {
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            ageRange: "all",
            gender: "all",
            placement: "all",
            platform: "all",
          },
          orderBy: { date: "asc" },
        },
        adSet: {
          include: {
            campaign: {
              select: { name: true, id: true },
            },
          },
        },
      },
    });

    // Filter to only ads with metrics
    const adsWithMetrics = ads.filter((ad) => ad.metrics.length > 0);

    // Classify ads
    const creatorAds = adsWithMetrics.filter((ad) => isCreatorAd(ad));
    const brandAds = adsWithMetrics.filter((ad) => !isCreatorAd(ad));

    // Aggregate metrics for each group
    const creatorMetrics = aggregateMetrics(creatorAds);
    const brandMetrics = aggregateMetrics(brandAds);

    // Build per-ad performance data for creator ads (sorted by spend)
    const creatorAdPerformance = creatorAds
      .map((ad) => {
        const totalSpend = ad.metrics.reduce((s, m) => s + m.spend, 0);
        const totalImpressions = ad.metrics.reduce((s, m) => s + m.impressions, 0);
        const totalClicks = ad.metrics.reduce((s, m) => s + m.clicks, 0);
        const totalConversions = ad.metrics.reduce((s, m) => s + m.conversions, 0);
        const roasVals = ad.metrics.filter((m) => m.roas !== null);
        const avgRoas =
          roasVals.length > 0
            ? roasVals.reduce((s, m) => s + (m.roas || 0), 0) / roasVals.length
            : null;

        return {
          adId: ad.id,
          adName: ad.name,
          creative: ad.creative,
          campaign: ad.adSet.campaign,
          metrics: {
            spend: totalSpend,
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
            ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
            cpa: totalConversions > 0 ? totalSpend / totalConversions : null,
            roas: avgRoas,
          },
        };
      })
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    // Format breakdown for creator ads
    const creatorFormatBreakdown: Record<string, number> = {};
    for (const ad of creatorAds) {
      const fmt = ad.creative?.format || "UNKNOWN";
      creatorFormatBreakdown[fmt] = (creatorFormatBreakdown[fmt] || 0) + 1;
    }

    return NextResponse.json({
      brandName: brand.name,
      totalAds: adsWithMetrics.length,
      creatorAdCount: creatorAds.length,
      brandAdCount: brandAds.length,
      creatorMetrics,
      brandMetrics,
      topCreatorAds: creatorAdPerformance.slice(0, 10),
      creatorFormatBreakdown,
    });
  } catch (error) {
    console.error("Intel briefs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch intel briefs data" },
      { status: 500 }
    );
  }
}
