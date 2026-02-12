import { NextRequest, NextResponse } from "next/server";
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
  MetaInsight,
} from "@/lib/meta-api";
import { CreativeFormat } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ adAccountId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adAccountId } = await params;

    const adAccount = await prisma.adAccount.findUnique({
      where: { id: adAccountId },
      include: { brand: true },
    });

    if (!adAccount || adAccount.brand.userId !== userId) {
      return NextResponse.json(
        { error: "Ad account not found" },
        { status: 404 }
      );
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        adAccountId: adAccount.id,
        status: "IN_PROGRESS",
      },
    });

    try {
      const accessToken = decryptAccessToken(adAccount.encryptedAccessToken);

      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      const dateStart = startDate.toISOString().split("T")[0];
      const dateEnd = endDate.toISOString().split("T")[0];

      // Fetch campaigns
      const campaigns = (await fetchWithRetry(() =>
        fetchCampaigns(adAccount.metaAccountId, accessToken)
      )) as Awaited<ReturnType<typeof fetchCampaigns>>;

      for (const campaign of campaigns) {
        const dbCampaign = await prisma.campaign.upsert({
          where: { metaCampaignId: campaign.id },
          update: {
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
          },
          create: {
            metaCampaignId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            adAccountId: adAccount.id,
          },
        });

        // Fetch ad sets
        const adSets = (await fetchWithRetry(() =>
          fetchAdSets(campaign.id, accessToken)
        )) as Awaited<ReturnType<typeof fetchAdSets>>;

        for (const adSet of adSets) {
          const dbAdSet = await prisma.adSet.upsert({
            where: { metaAdSetId: adSet.id },
            update: { name: adSet.name, status: adSet.status },
            create: {
              metaAdSetId: adSet.id,
              name: adSet.name,
              status: adSet.status,
              campaignId: dbCampaign.id,
            },
          });

          // Fetch ads
          const ads = (await fetchWithRetry(() =>
            fetchAds(adSet.id, accessToken)
          )) as Awaited<ReturnType<typeof fetchAds>>;

          for (const ad of ads) {
            let creativeId: string | undefined;

            // Fetch creative details
            if (ad.creative?.id) {
              try {
                const creative = (await fetchWithRetry(() =>
                  fetchCreative(ad.creative.id, accessToken)
                )) as Awaited<ReturnType<typeof fetchCreative>>;

                let format: CreativeFormat = "STATIC";
                if (creative.video_id || creative.object_story_spec?.video_data) {
                  format = "VIDEO";
                }

                const dbCreative = await prisma.adCreative.upsert({
                  where: { metaCreativeId: creative.id },
                  update: {
                    name: creative.name,
                    title: creative.title,
                    body: creative.body,
                    callToAction: creative.call_to_action_type,
                    imageUrl:
                      creative.image_url ||
                      creative.object_story_spec?.link_data?.image_hash,
                    videoUrl: creative.video_id || undefined,
                    thumbnailUrl:
                      creative.thumbnail_url ||
                      creative.object_story_spec?.video_data?.image_url,
                    format,
                    linkUrl:
                      creative.object_story_spec?.link_data?.link || undefined,
                  },
                  create: {
                    metaCreativeId: creative.id,
                    name: creative.name,
                    title: creative.title,
                    body: creative.body,
                    callToAction: creative.call_to_action_type,
                    imageUrl:
                      creative.image_url ||
                      creative.object_story_spec?.link_data?.image_hash,
                    videoUrl: creative.video_id || undefined,
                    thumbnailUrl:
                      creative.thumbnail_url ||
                      creative.object_story_spec?.video_data?.image_url,
                    format,
                    linkUrl:
                      creative.object_story_spec?.link_data?.link || undefined,
                  },
                });

                creativeId = dbCreative.id;
              } catch (err) {
                console.error(
                  `Failed to fetch creative ${ad.creative.id}:`,
                  err
                );
              }
            }

            const dbAd = await prisma.ad.upsert({
              where: { metaAdId: ad.id },
              update: {
                name: ad.name,
                status: ad.status,
                creativeId,
              },
              create: {
                metaAdId: ad.id,
                name: ad.name,
                status: ad.status,
                adSetId: dbAdSet.id,
                creativeId,
              },
            });

            // Fetch insights
            try {
              const insights = (await fetchWithRetry(() =>
                fetchAdInsights(ad.id, accessToken, dateStart, dateEnd)
              )) as MetaInsight[];

              for (const insight of insights) {
                const conversions =
                  insight.actions?.find(
                    (a) => a.action_type === "offsite_conversion.fb_pixel_purchase"
                  )?.value ||
                  insight.actions?.find(
                    (a) => a.action_type === "purchase"
                  )?.value ||
                  "0";

                const cpa =
                  insight.cost_per_action_type?.find(
                    (a) => a.action_type === "offsite_conversion.fb_pixel_purchase"
                  )?.value ||
                  insight.cost_per_action_type?.find(
                    (a) => a.action_type === "purchase"
                  )?.value;

                const roas = insight.purchase_roas?.[0]?.value;

                const insightAny = insight as unknown as Record<string, string>;
                const ageRange = insightAny.age || "all";
                const gender = insightAny.gender || "all";
                const placement = insightAny.publisher_platform || "all";
                const platform = insightAny.platform_position || "all";

                await prisma.adMetric.upsert({
                  where: {
                    adId_date_ageRange_gender_placement_platform: {
                      adId: dbAd.id,
                      date: new Date(insight.date_start),
                      ageRange,
                      gender,
                      placement,
                      platform,
                    },
                  },
                  update: {
                    spend: parseFloat(insight.spend || "0"),
                    impressions: parseInt(insight.impressions || "0"),
                    clicks: parseInt(insight.clicks || "0"),
                    ctr: parseFloat(insight.ctr || "0"),
                    cpm: parseFloat(insight.cpm || "0"),
                    cpa: cpa ? parseFloat(cpa) : null,
                    roas: roas ? parseFloat(roas) : null,
                    conversions: parseInt(conversions),
                    reach: parseInt(insight.reach || "0"),
                    frequency: parseFloat(insight.frequency || "0"),
                  },
                  create: {
                    adId: dbAd.id,
                    date: new Date(insight.date_start),
                    ageRange,
                    gender,
                    placement,
                    platform,
                    spend: parseFloat(insight.spend || "0"),
                    impressions: parseInt(insight.impressions || "0"),
                    clicks: parseInt(insight.clicks || "0"),
                    ctr: parseFloat(insight.ctr || "0"),
                    cpm: parseFloat(insight.cpm || "0"),
                    cpa: cpa ? parseFloat(cpa) : null,
                    roas: roas ? parseFloat(roas) : null,
                    conversions: parseInt(conversions),
                    reach: parseInt(insight.reach || "0"),
                    frequency: parseFloat(insight.frequency || "0"),
                  },
                });
              }
            } catch (err) {
              console.error(`Failed to fetch insights for ad ${ad.id}:`, err);
            }
          }
        }
      }

      // Update sync status
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      await prisma.adAccount.update({
        where: { id: adAccount.id },
        data: { lastSyncAt: new Date() },
      });

      return NextResponse.json({ success: true, syncLogId: syncLog.id });
    } catch (error) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });

      throw error;
    }
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
