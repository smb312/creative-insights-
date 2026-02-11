import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

// This route is designed to be called by a cron job (e.g., Vercel Cron)
// Protected by CRON_SECRET environment variable
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all active ad accounts that haven't been synced in 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const adAccounts = await prisma.adAccount.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { lastSyncAt: null },
          { lastSyncAt: { lt: twentyFourHoursAgo } },
        ],
      },
      include: { brand: true },
    });

    const results: { accountId: string; status: string; error?: string }[] = [];

    for (const adAccount of adAccounts) {
      const syncLog = await prisma.syncLog.create({
        data: {
          adAccountId: adAccount.id,
          status: "IN_PROGRESS",
        },
      });

      try {
        const accessToken = decryptAccessToken(
          adAccount.encryptedAccessToken
        );

        // Check token expiry
        if (
          adAccount.tokenExpiresAt &&
          adAccount.tokenExpiresAt < new Date()
        ) {
          await prisma.adAccount.update({
            where: { id: adAccount.id },
            data: { status: "TOKEN_EXPIRED" },
          });
          await prisma.syncLog.update({
            where: { id: syncLog.id },
            data: {
              status: "FAILED",
              message: "Access token expired",
              completedAt: new Date(),
            },
          });
          results.push({
            accountId: adAccount.id,
            status: "failed",
            error: "Token expired",
          });
          continue;
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7); // Cron syncs last 7 days
        const dateStart = startDate.toISOString().split("T")[0];
        const dateEnd = endDate.toISOString().split("T")[0];

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

            const ads = (await fetchWithRetry(() =>
              fetchAds(adSet.id, accessToken)
            )) as Awaited<ReturnType<typeof fetchAds>>;

            for (const ad of ads) {
              let creativeId: string | undefined;

              if (ad.creative?.id) {
                try {
                  const creative = (await fetchWithRetry(() =>
                    fetchCreative(ad.creative.id, accessToken)
                  )) as Awaited<ReturnType<typeof fetchCreative>>;

                  let format: CreativeFormat = "STATIC";
                  if (
                    creative.video_id ||
                    creative.object_story_spec?.video_data
                  ) {
                    format = "VIDEO";
                  }

                  const dbCreative = await prisma.adCreative.upsert({
                    where: { metaCreativeId: creative.id },
                    update: {
                      name: creative.name,
                      title: creative.title,
                      body: creative.body,
                      callToAction: creative.call_to_action_type,
                      imageUrl: creative.image_url,
                      videoUrl: creative.video_id || undefined,
                      thumbnailUrl: creative.thumbnail_url,
                      format,
                    },
                    create: {
                      metaCreativeId: creative.id,
                      name: creative.name,
                      title: creative.title,
                      body: creative.body,
                      callToAction: creative.call_to_action_type,
                      imageUrl: creative.image_url,
                      videoUrl: creative.video_id || undefined,
                      thumbnailUrl: creative.thumbnail_url,
                      format,
                    },
                  });

                  creativeId = dbCreative.id;
                } catch (err) {
                  console.error(
                    `Cron: Failed to fetch creative ${ad.creative.id}:`,
                    err
                  );
                }
              }

              const dbAd = await prisma.ad.upsert({
                where: { metaAdId: ad.id },
                update: { name: ad.name, status: ad.status, creativeId },
                create: {
                  metaAdId: ad.id,
                  name: ad.name,
                  status: ad.status,
                  adSetId: dbAdSet.id,
                  creativeId,
                },
              });

              try {
                const insights = (await fetchWithRetry(() =>
                  fetchAdInsights(ad.id, accessToken, dateStart, dateEnd)
                )) as MetaInsight[];

                for (const insight of insights) {
                  const conversions =
                    insight.actions?.find(
                      (a) =>
                        a.action_type ===
                        "offsite_conversion.fb_pixel_purchase"
                    )?.value ||
                    insight.actions?.find(
                      (a) => a.action_type === "purchase"
                    )?.value ||
                    "0";

                  const cpa =
                    insight.cost_per_action_type?.find(
                      (a) =>
                        a.action_type ===
                        "offsite_conversion.fb_pixel_purchase"
                    )?.value ||
                    insight.cost_per_action_type?.find(
                      (a) => a.action_type === "purchase"
                    )?.value;

                  const roas = insight.purchase_roas?.[0]?.value;

                  await prisma.adMetric.upsert({
                    where: {
                      adId_date_ageRange_gender_placement_platform: {
                        adId: dbAd.id,
                        date: new Date(insight.date_start),
                        ageRange: null as unknown as string,
                        gender: null as unknown as string,
                        placement: null as unknown as string,
                        platform: null as unknown as string,
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
                console.error(
                  `Cron: Failed to fetch insights for ad ${ad.id}:`,
                  err
                );
              }
            }
          }
        }

        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        await prisma.adAccount.update({
          where: { id: adAccount.id },
          data: { lastSyncAt: new Date() },
        });

        results.push({ accountId: adAccount.id, status: "completed" });
      } catch (error) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: "FAILED",
            message:
              error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          },
        });

        results.push({
          accountId: adAccount.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      synced: results.filter((r) => r.status === "completed").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: "Cron sync failed" },
      { status: 500 }
    );
  }
}
