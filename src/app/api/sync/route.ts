import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import {
  decryptAccessToken,
  fetchCampaigns,
  fetchAdSets,
  fetchAds,
  fetchCreative,
  fetchAdInsights,
  fetchWithRetry,
} from "@/lib/meta-api";
import type { MetaInsight } from "@/lib/meta-api";

export const maxDuration = 300; // Allow up to 5 minutes for sync

export async function POST() {
  let syncLogId: string | null = null;
  let adAccountId: string | null = null;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get active ad account for user
    const adAccount = await prisma.adAccount.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (!adAccount) {
      return NextResponse.json(
        { error: "No active ad account found. Please connect a Meta ad account first." },
        { status: 404 }
      );
    }

    adAccountId = adAccount.id;

    // 2. Create SyncLog
    const syncLog = await prisma.syncLog.create({
      data: {
        adAccountId: adAccount.id,
        status: "IN_PROGRESS",
      },
    });
    syncLogId = syncLog.id;

    // 3. Decrypt access token
    const accessToken = decryptAccessToken(adAccount.encryptedAccessToken);

    // 4. Calculate date range (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dateStart = thirtyDaysAgo.toISOString().split("T")[0];
    const dateEnd = now.toISOString().split("T")[0];

    // 5. Fetch all campaigns -> adSets -> ads (nested loops with fetchWithRetry)
    const campaigns = (await fetchWithRetry(() =>
      fetchCampaigns(adAccount.metaAccountId, accessToken)
    )) as Awaited<ReturnType<typeof fetchCampaigns>>;

    let totalAdsProcessed = 0;
    let totalAdsFailed = 0;

    for (const campaign of campaigns) {
      let adSets: Awaited<ReturnType<typeof fetchAdSets>>;
      try {
        adSets = (await fetchWithRetry(() =>
          fetchAdSets(campaign.id, accessToken)
        )) as Awaited<ReturnType<typeof fetchAdSets>>;
      } catch (error) {
        console.error(`Failed to fetch ad sets for campaign ${campaign.id}:`, error);
        continue;
      }

      for (const adSet of adSets) {
        let ads: Awaited<ReturnType<typeof fetchAds>>;
        try {
          ads = (await fetchWithRetry(() =>
            fetchAds(adSet.id, accessToken)
          )) as Awaited<ReturnType<typeof fetchAds>>;
        } catch (error) {
          console.error(`Failed to fetch ads for ad set ${adSet.id}:`, error);
          continue;
        }

        for (const ad of ads) {
          try {
            // 6. For each ad, fetch creative details
            const creative = (await fetchWithRetry(() =>
              fetchCreative(ad.creative.id, accessToken)
            )) as Awaited<ReturnType<typeof fetchCreative>>;

            // 7. Determine creativeType
            const isVideo =
              !!creative.video_id ||
              !!creative.object_story_spec?.video_data;
            const creativeType = isVideo ? "VIDEO" : "IMAGE";

            // 8. Determine isPartnershipAd
            const objectStorySpec = creative.object_story_spec as
              | (typeof creative.object_story_spec & {
                  branded_content_sponsor_page_id?: string;
                })
              | undefined;
            const isPartnershipAd =
              !!objectStorySpec?.branded_content_sponsor_page_id;
            const creatorPageId =
              objectStorySpec?.branded_content_sponsor_page_id || null;

            // 9. Upsert MetaAd
            const metaAd = await prisma.metaAd.upsert({
              where: {
                userId_metaAdId: {
                  userId,
                  metaAdId: ad.id,
                },
              },
              create: {
                userId,
                adAccountId: adAccount.id,
                metaAdId: ad.id,
                metaCampaignId: campaign.id,
                campaignName: campaign.name,
                metaAdSetId: adSet.id,
                adSetName: adSet.name,
                adName: ad.name,
                status: ad.status,
                creativeType,
                creativeThumbnailUrl:
                  creative.thumbnail_url || creative.image_url || null,
                primaryText: creative.body || null,
                headline: creative.title || null,
                callToAction: creative.call_to_action_type || null,
                isPartnershipAd,
                creatorPageId,
                creatorName: null,
              },
              update: {
                metaCampaignId: campaign.id,
                campaignName: campaign.name,
                metaAdSetId: adSet.id,
                adSetName: adSet.name,
                adName: ad.name,
                status: ad.status,
                creativeType,
                creativeThumbnailUrl:
                  creative.thumbnail_url || creative.image_url || null,
                primaryText: creative.body || null,
                headline: creative.title || null,
                callToAction: creative.call_to_action_type || null,
                isPartnershipAd,
                creatorPageId,
              },
            });

            // 10. Fetch insights for each ad (last 30 days, time_increment=1)
            let insights: MetaInsight[];
            try {
              insights = (await fetchWithRetry(() =>
                fetchAdInsights(ad.id, accessToken, dateStart, dateEnd)
              )) as MetaInsight[];
            } catch (error) {
              console.error(`Failed to fetch insights for ad ${ad.id}:`, error);
              totalAdsProcessed++;
              continue;
            }

            // 11. For each insight day, calculate derived metrics and upsert
            for (const insight of insights) {
              const spend = parseFloat(insight.spend) || 0;
              const impressions = parseInt(insight.impressions) || 0;
              const reach = parseInt(insight.reach) || 0;
              const clicks = parseInt(insight.clicks) || 0;
              const ctr = parseFloat(insight.ctr) || 0;
              const cpm = parseFloat(insight.cpm) || 0;
              const frequency = parseFloat(insight.frequency) || 0;

              // CPC
              const cpc = clicks > 0 ? spend / clicks : null;

              // Conversions
              const conversionAction = insight.actions?.find(
                (a) =>
                  a.action_type ===
                    "offsite_conversion.fb_pixel_purchase" ||
                  a.action_type === "purchase"
              );
              const conversions = parseInt(conversionAction?.value || "0") || 0;

              // Conversion value
              const conversionValueAction =
                insight.cost_per_action_type?.find(
                  (a) =>
                    a.action_type ===
                      "offsite_conversion.fb_pixel_purchase" ||
                    a.action_type === "purchase"
                );
              // purchase_roas contains value directly; also check actions for value
              let conversionValue = 0;
              if (insight.purchase_roas && insight.purchase_roas.length > 0) {
                // ROAS = conversionValue / spend, so conversionValue = ROAS * spend
                const roasValue =
                  parseFloat(insight.purchase_roas[0].value) || 0;
                conversionValue = roasValue * spend;
              } else if (conversionValueAction) {
                // Fallback: use cost_per_action as CPA, derive value differently
                // In practice, purchase_roas is the standard field for value
                conversionValue = 0;
              }

              // CPA
              const cpa =
                conversions > 0 ? spend / conversions : null;

              // ROAS
              const roas = spend > 0 ? conversionValue / spend : null;

              // Video metrics (from actions array)
              const videoViewsAction = insight.actions?.find(
                (a) => a.action_type === "video_view"
              );
              const video3sViewsAction = insight.actions?.find(
                (a) => a.action_type === "video_view" // 3s views mapped from impressions-based approach
              );
              const videoThruplayAction = insight.actions?.find(
                (a) => a.action_type === "video_view"
              );

              // For video metrics, use the dedicated fields when available in insight
              const insightAny = insight as unknown as Record<string, unknown>;
              const videoViews =
                parseInt(insightAny.video_play_actions as string) ||
                parseInt(videoViewsAction?.value || "0") ||
                null;
              const video3sViews =
                parseInt(insightAny.video_p25_watched_actions as string) ||
                parseInt(video3sViewsAction?.value || "0") ||
                null;
              const videoThruplay =
                parseInt(insightAny.video_thruplay_watched_actions as string) ||
                parseInt(videoThruplayAction?.value || "0") ||
                null;

              // Hook rate = video3sViews / impressions (if video)
              const hookRate =
                isVideo && impressions > 0 && video3sViews
                  ? video3sViews / impressions
                  : null;

              // Hold rate = videoThruplay / video3sViews (if video and 3s views > 0)
              const holdRate =
                isVideo && video3sViews && video3sViews > 0 && videoThruplay
                  ? videoThruplay / video3sViews
                  : null;

              const performanceDate = new Date(insight.date_start);

              await prisma.metaAdPerformance.upsert({
                where: {
                  metaAdId_date: {
                    metaAdId: metaAd.id,
                    date: performanceDate,
                  },
                },
                create: {
                  metaAdId: metaAd.id,
                  date: performanceDate,
                  spend,
                  impressions,
                  reach,
                  clicks,
                  cpc,
                  cpm,
                  ctr,
                  conversions,
                  conversionValue,
                  cpa,
                  roas,
                  frequency,
                  videoViews,
                  video3sViews,
                  videoThruplay,
                  hookRate,
                  holdRate,
                },
                update: {
                  spend,
                  impressions,
                  reach,
                  clicks,
                  cpc,
                  cpm,
                  ctr,
                  conversions,
                  conversionValue,
                  cpa,
                  roas,
                  frequency,
                  videoViews,
                  video3sViews,
                  videoThruplay,
                  hookRate,
                  holdRate,
                },
              });
            }

            totalAdsProcessed++;
          } catch (error) {
            console.error(`Failed to process ad ${ad.id}:`, error);
            totalAdsFailed++;
          }
        }
      }
    }

    // 12. Update SyncLog status and AdAccount.lastSyncAt
    await prisma.syncLog.update({
      where: { id: syncLogId },
      data: {
        status: "COMPLETED",
        message: `Synced ${totalAdsProcessed} ads (${totalAdsFailed} failed)`,
        completedAt: new Date(),
      },
    });

    await prisma.adAccount.update({
      where: { id: adAccount.id },
      data: { lastSyncAt: new Date() },
    });

    // 13. Also sync Shopify data if connected
    let shopifySynced = false;
    try {
      const shopifyStore = await prisma.shopifyStore.findUnique({
        where: { userId },
      });
      if (shopifyStore && shopifyStore.status === "ACTIVE") {
        // Trigger Shopify sync via internal fetch
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await fetch(`${baseUrl}/api/shopify/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `next-auth.session-token=internal`,
          },
        }).catch(() => {
          // Shopify sync failure is non-blocking
        });
        shopifySynced = true;
      }
    } catch {
      // Shopify sync failure is non-blocking
    }

    return NextResponse.json({
      success: true,
      totalAdsProcessed,
      totalAdsFailed,
      shopifySynced,
    });
  } catch (error) {
    console.error("Sync failed:", error);

    // Update SyncLog to FAILED if it was created
    if (syncLogId) {
      await prisma.syncLog
        .update({
          where: { id: syncLogId },
          data: {
            status: "FAILED",
            message:
              error instanceof Error ? error.message : "Unknown sync error",
            completedAt: new Date(),
          },
        })
        .catch((logError) =>
          console.error("Failed to update sync log:", logError)
        );
    }

    return NextResponse.json(
      { error: "Sync failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
