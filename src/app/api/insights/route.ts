import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

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
    const campaignId = searchParams.get("campaignId");
    const adSetId = searchParams.get("adSetId");
    const format = searchParams.get("format"); // STATIC, VIDEO, CAROUSEL

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

    // Build where clause for metrics
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    // Build ad filter
    const adWhere: Record<string, unknown> = {
      adSet: {
        campaign: {
          adAccountId: { in: adAccountIds },
          ...(campaignId ? { id: campaignId } : {}),
        },
        ...(adSetId ? { id: adSetId } : {}),
      },
    };

    if (format) {
      adWhere.creative = { format };
    }

    // Get aggregated metrics per ad/creative
    const ads = await prisma.ad.findMany({
      where: adWhere,
      include: {
        creative: true,
        metrics: {
          where: {
            ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
            // Only get aggregate rows (no breakdown dimensions)
            ageRange: null,
            gender: null,
            placement: null,
            platform: null,
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

    // Compute aggregated performance for each ad
    const creativePerformance = ads
      .filter((ad) => ad.metrics.length > 0)
      .map((ad) => {
        const totalSpend = ad.metrics.reduce((sum, m) => sum + m.spend, 0);
        const totalImpressions = ad.metrics.reduce(
          (sum, m) => sum + m.impressions,
          0
        );
        const totalClicks = ad.metrics.reduce((sum, m) => sum + m.clicks, 0);
        const totalConversions = ad.metrics.reduce(
          (sum, m) => sum + m.conversions,
          0
        );
        const totalReach = ad.metrics.reduce((sum, m) => sum + m.reach, 0);

        const avgCtr = totalImpressions > 0
          ? (totalClicks / totalImpressions) * 100
          : 0;
        const avgCpm = totalImpressions > 0
          ? (totalSpend / totalImpressions) * 1000
          : 0;
        const avgCpa = totalConversions > 0
          ? totalSpend / totalConversions
          : null;
        const avgRoas = ad.metrics.filter((m) => m.roas !== null).length > 0
          ? ad.metrics.reduce((sum, m) => sum + (m.roas || 0), 0) /
            ad.metrics.filter((m) => m.roas !== null).length
          : null;

        return {
          adId: ad.id,
          adName: ad.name,
          creative: ad.creative,
          campaign: ad.adSet.campaign,
          adSet: { id: ad.adSet.id, name: ad.adSet.name },
          metrics: {
            spend: totalSpend,
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
            reach: totalReach,
            ctr: avgCtr,
            cpm: avgCpm,
            cpa: avgCpa,
            roas: avgRoas,
          },
          dailyMetrics: ad.metrics.map((m) => ({
            date: m.date,
            spend: m.spend,
            impressions: m.impressions,
            clicks: m.clicks,
            conversions: m.conversions,
            ctr: m.ctr,
            cpm: m.cpm,
            roas: m.roas,
          })),
        };
      });

    // Sort by spend (top performers)
    const sortedBySpend = [...creativePerformance].sort(
      (a, b) => b.metrics.spend - a.metrics.spend
    );

    // Detect creative fatigue: declining CTR over last 7 days with consistent spend
    const fatiguedCreatives = creativePerformance.filter((cp) => {
      const recentMetrics = cp.dailyMetrics.slice(-7);
      if (recentMetrics.length < 5) return false;

      let declineCount = 0;
      for (let i = 1; i < recentMetrics.length; i++) {
        if (recentMetrics[i].ctr < recentMetrics[i - 1].ctr) {
          declineCount++;
        }
      }
      // If CTR declined in 4+ of the last 7 days, flag as fatigued
      return declineCount >= 4;
    });

    // Performance by format
    const formatBreakdown: Record<
      string,
      { count: number; spend: number; impressions: number; clicks: number; conversions: number }
    > = {};

    for (const cp of creativePerformance) {
      const fmt = cp.creative?.format || "UNKNOWN";
      if (!formatBreakdown[fmt]) {
        formatBreakdown[fmt] = {
          count: 0,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        };
      }
      formatBreakdown[fmt].count++;
      formatBreakdown[fmt].spend += cp.metrics.spend;
      formatBreakdown[fmt].impressions += cp.metrics.impressions;
      formatBreakdown[fmt].clicks += cp.metrics.clicks;
      formatBreakdown[fmt].conversions += cp.metrics.conversions;
    }

    // Overall daily trends
    const dailyTrends: Record<
      string,
      { spend: number; impressions: number; clicks: number; conversions: number }
    > = {};

    for (const cp of creativePerformance) {
      for (const dm of cp.dailyMetrics) {
        const dateKey = new Date(dm.date).toISOString().split("T")[0];
        if (!dailyTrends[dateKey]) {
          dailyTrends[dateKey] = {
            spend: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
          };
        }
        dailyTrends[dateKey].spend += dm.spend;
        dailyTrends[dateKey].impressions += dm.impressions;
        dailyTrends[dateKey].clicks += dm.clicks;
        dailyTrends[dateKey].conversions += dm.conversions;
      }
    }

    const trendData = Object.entries(dailyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpm: data.impressions > 0 ? (data.spend / data.impressions) * 1000 : 0,
      }));

    return NextResponse.json({
      topPerformers: sortedBySpend.slice(0, 10),
      bottomPerformers: sortedBySpend.slice(-10).reverse(),
      fatiguedCreatives: fatiguedCreatives.map((fc) => ({
        adId: fc.adId,
        adName: fc.adName,
        creative: fc.creative,
        recentCtr: fc.dailyMetrics.slice(-7).map((m) => ({
          date: m.date,
          ctr: m.ctr,
        })),
      })),
      formatBreakdown,
      dailyTrends: trendData,
      totalCreatives: creativePerformance.length,
      totalSpend: creativePerformance.reduce(
        (sum, cp) => sum + cp.metrics.spend,
        0
      ),
      totalImpressions: creativePerformance.reduce(
        (sum, cp) => sum + cp.metrics.impressions,
        0
      ),
      totalClicks: creativePerformance.reduce(
        (sum, cp) => sum + cp.metrics.clicks,
        0
      ),
      totalConversions: creativePerformance.reduce(
        (sum, cp) => sum + cp.metrics.conversions,
        0
      ),
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}
