import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120; // Allow up to 2 minutes for generation

const CLAUDE_SYSTEM_PROMPT = `You are a senior ecommerce performance marketing strategist writing a personalized weekly brief for a brand founder. You're direct, specific, and grounded in data. No fluff. No filler. No generic advice.

Write like a sharp CMO giving a founder their weekly download — clear, prioritized, actionable.

Rules:
- Use specific numbers from their data throughout
- Compare this week vs last week to show direction
- Lead with the 1-2 most important things, not everything
- Give concrete, specific recommendations (not "optimize your ads")
- If partnership/creator ads are outperforming brand creative, call it out
- Flag urgent issues: CPA spikes, creative fatigue, budget waste
- Reference their stated challenges and tailor recommendations accordingly
- Use their brand name naturally, not "your brand" or "the company"
- Keep total length to 500-800 words
- Be honest — if performance is bad, say so constructively

Output format — use these exact section headers:

## The Bottom Line
(2-3 sentences. The single most important takeaway this week.)

## By The Numbers
(Key metrics table: metric | this week | last week | change)

## What's Working
(1-2 short paragraphs on top performers and why they're winning)

## What Needs Attention
(1-2 short paragraphs on problems, fatigue, or declining areas)

## This Week's Play
(2-3 specific action items, numbered, ranked by impact)

## Looking Ahead
(1-2 sentences on what to watch next week)`;

interface AggregatedMetrics {
  totalSpend: number;
  totalConversions: number;
  totalConversionValue: number;
  totalImpressions: number;
  totalClicks: number;
  totalReach: number;
  blendedRoas: number;
  cpa: number;
  ctr: number;
  cpm: number;
}

function aggregateMetrics(
  rows: {
    spend: number;
    conversions: number;
    conversionValue: number;
    impressions: number;
    clicks: number;
    reach: number;
  }[]
): AggregatedMetrics {
  const totalSpend = rows.reduce((sum, r) => sum + r.spend, 0);
  const totalConversions = rows.reduce((sum, r) => sum + r.conversions, 0);
  const totalConversionValue = rows.reduce(
    (sum, r) => sum + r.conversionValue,
    0
  );
  const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const totalReach = rows.reduce((sum, r) => sum + r.reach, 0);

  return {
    totalSpend,
    totalConversions,
    totalConversionValue,
    totalImpressions,
    totalClicks,
    totalReach,
    blendedRoas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
    cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
  };
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function markdownToBasicHtml(markdown: string): string {
  let html = markdown
    // H2 headers
    .replace(/^## (.+)$/gm, "<h2 style=\"font-size:20px;font-weight:bold;margin-top:24px;margin-bottom:8px;color:#1a1a1a;\">$1</h2>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Tables - convert markdown tables to HTML
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim());
      // Check if this is a separator row
      if (cells.every((c) => /^[-:]+$/.test(c))) return "";
      const cellHtml = cells
        .map(
          (c) =>
            `<td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${c}</td>`
        )
        .join("");
      return `<tr>${cellHtml}</tr>`;
    })
    // Numbered lists
    .replace(
      /^(\d+)\. (.+)$/gm,
      "<div style=\"margin-bottom:8px;padding-left:8px;\"><strong>$1.</strong> $2</div>"
    )
    // Paragraphs: double newlines
    .replace(/\n\n/g, "</p><p style=\"margin-bottom:12px;line-height:1.6;color:#333;\">")
    // Single newlines within paragraphs
    .replace(/\n/g, "<br>");

  // Wrap tables
  html = html.replace(
    new RegExp("(<tr>.*?<\\/tr>(?:\\s*<tr>.*?<\\/tr>)*)", "gs"),
    "<table style=\"width:100%;border-collapse:collapse;margin:12px 0;\">$1</table>"
  );

  // Wrap in paragraph
  html = `<p style="margin-bottom:12px;line-height:1.6;color:#333;">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, "");

  return html;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: support both session auth and CRON_SECRET header
    let userId: string | null = null;
    const cronSecret = request.headers.get("x-cron-secret");

    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      // Cron invocation - get userId from body
      const body = await request.json().catch(() => ({}));
      userId = body.userId || null;

      if (!userId) {
        return NextResponse.json(
          { error: "userId required for cron invocation" },
          { status: 400 }
        );
      }
    } else {
      // Session auth
      userId = await getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Also allow optional userId override from body (but user must be authed)
      // Only the authenticated user can generate their own brief
    }

    // 1. Get user's brand profile
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!brandProfile) {
      return NextResponse.json(
        { error: "Brand profile not found. Please complete onboarding first." },
        { status: 404 }
      );
    }

    // 2. Query performance data for relevant periods
    const now = new Date();
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setHours(23, 59, 59, 999);

    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - 7);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get user's ads
    const userAds = await prisma.metaAd.findMany({
      where: { userId },
      select: { id: true, metaAdId: true, adName: true, creativeType: true, isPartnershipAd: true },
    });

    const adIds = userAds.map((a) => a.id);

    if (adIds.length === 0) {
      return NextResponse.json(
        { error: "No ad data found. Please sync your ad account first." },
        { status: 404 }
      );
    }

    // This week performance
    const thisWeekPerf = await prisma.metaAdPerformance.findMany({
      where: {
        metaAdId: { in: adIds },
        date: { gte: thisWeekStart, lte: thisWeekEnd },
      },
    });

    // Last week performance
    const lastWeekPerf = await prisma.metaAdPerformance.findMany({
      where: {
        metaAdId: { in: adIds },
        date: { gte: lastWeekStart, lte: lastWeekEnd },
      },
    });

    // Last 30 days performance
    const thirtyDayPerf = await prisma.metaAdPerformance.findMany({
      where: {
        metaAdId: { in: adIds },
        date: { gte: thirtyDaysAgo, lte: thisWeekEnd },
      },
    });

    // 3. Calculate aggregated metrics
    const thisWeekMetrics = aggregateMetrics(thisWeekPerf);
    const lastWeekMetrics = aggregateMetrics(lastWeekPerf);
    const thirtyDayMetrics = aggregateMetrics(thirtyDayPerf);

    // 4. Week-over-week changes
    const wowChanges = {
      spend: pctChange(thisWeekMetrics.totalSpend, lastWeekMetrics.totalSpend),
      roas: pctChange(thisWeekMetrics.blendedRoas, lastWeekMetrics.blendedRoas),
      cpa: pctChange(thisWeekMetrics.cpa, lastWeekMetrics.cpa),
      ctr: pctChange(thisWeekMetrics.ctr, lastWeekMetrics.ctr),
      conversions: pctChange(
        thisWeekMetrics.totalConversions,
        lastWeekMetrics.totalConversions
      ),
      cpm: pctChange(thisWeekMetrics.cpm, lastWeekMetrics.cpm),
    };

    // 5. Top 5 and bottom 5 ads by ROAS (min $20 spend this week)
    const adPerformanceThisWeek = new Map<
      string,
      { spend: number; conversionValue: number; conversions: number; impressions: number; clicks: number }
    >();

    for (const perf of thisWeekPerf) {
      const existing = adPerformanceThisWeek.get(perf.metaAdId) || {
        spend: 0,
        conversionValue: 0,
        conversions: 0,
        impressions: 0,
        clicks: 0,
      };
      existing.spend += perf.spend;
      existing.conversionValue += perf.conversionValue;
      existing.conversions += perf.conversions;
      existing.impressions += perf.impressions;
      existing.clicks += perf.clicks;
      adPerformanceThisWeek.set(perf.metaAdId, existing);
    }

    // Last week per-ad for comparison
    const adPerformanceLastWeek = new Map<
      string,
      { spend: number; impressions: number; clicks: number; frequency: number; count: number }
    >();
    for (const perf of lastWeekPerf) {
      const existing = adPerformanceLastWeek.get(perf.metaAdId) || {
        spend: 0,
        impressions: 0,
        clicks: 0,
        frequency: 0,
        count: 0,
      };
      existing.spend += perf.spend;
      existing.impressions += perf.impressions;
      existing.clicks += perf.clicks;
      existing.frequency += perf.frequency || 0;
      existing.count += 1;
      adPerformanceLastWeek.set(perf.metaAdId, existing);
    }

    const adLookup = new Map(userAds.map((a) => [a.id, a]));

    const qualifiedAds = Array.from(adPerformanceThisWeek.entries())
      .filter(([, perf]) => perf.spend >= 20)
      .map(([adId, perf]) => ({
        adId,
        ad: adLookup.get(adId),
        roas: perf.spend > 0 ? perf.conversionValue / perf.spend : 0,
        spend: perf.spend,
        conversions: perf.conversions,
        conversionValue: perf.conversionValue,
      }));

    const topAds = [...qualifiedAds]
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);

    const bottomAds = [...qualifiedAds]
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 5);

    // 6. Format breakdown (VIDEO vs IMAGE vs other)
    const formatBreakdown: Record<string, { spend: number; conversions: number; conversionValue: number; impressions: number }> = {};
    for (const [adId, perf] of adPerformanceThisWeek.entries()) {
      const ad = adLookup.get(adId);
      const type = ad?.creativeType || "OTHER";
      if (!formatBreakdown[type]) {
        formatBreakdown[type] = { spend: 0, conversions: 0, conversionValue: 0, impressions: 0 };
      }
      formatBreakdown[type].spend += perf.spend;
      formatBreakdown[type].conversions += perf.conversions;
      formatBreakdown[type].conversionValue += perf.conversionValue;
      formatBreakdown[type].impressions += perf.impressions;
    }

    // 7. Partnership vs brand comparison
    const partnershipMetrics = { spend: 0, conversions: 0, conversionValue: 0, impressions: 0 };
    const brandMetrics = { spend: 0, conversions: 0, conversionValue: 0, impressions: 0 };

    for (const [adId, perf] of adPerformanceThisWeek.entries()) {
      const ad = adLookup.get(adId);
      const target = ad?.isPartnershipAd ? partnershipMetrics : brandMetrics;
      target.spend += perf.spend;
      target.conversions += perf.conversions;
      target.conversionValue += perf.conversionValue;
      target.impressions += perf.impressions;
    }

    // 8. Fatigue signals: frequency > 3 AND CTR declined > 15% vs prior week
    const fatigueSignals: { adName: string; frequency: number; ctrDecline: string }[] = [];

    for (const perf of thisWeekPerf) {
      const ad = adLookup.get(perf.metaAdId);
      if (!ad) continue;

      // Get average frequency for this ad this week
      const thisWeekAdPerfs = thisWeekPerf.filter(
        (p) => p.metaAdId === perf.metaAdId
      );
      const avgFrequency =
        thisWeekAdPerfs.reduce((sum, p) => sum + (p.frequency || 0), 0) /
        thisWeekAdPerfs.length;

      if (avgFrequency <= 3) continue;

      // Calculate CTR this week vs last week
      const twPerf = adPerformanceThisWeek.get(perf.metaAdId);
      const lwPerf = adPerformanceLastWeek.get(perf.metaAdId);

      if (!twPerf || !lwPerf) continue;

      const twCtr =
        twPerf.impressions > 0
          ? (twPerf.clicks / twPerf.impressions) * 100
          : 0;
      const lwCtr =
        lwPerf.impressions > 0
          ? (lwPerf.clicks / lwPerf.impressions) * 100
          : 0;

      if (lwCtr > 0 && (lwCtr - twCtr) / lwCtr > 0.15) {
        // Only add each ad once
        if (!fatigueSignals.find((f) => f.adName === ad.adName)) {
          fatigueSignals.push({
            adName: ad.adName || ad.metaAdId,
            frequency: parseFloat(avgFrequency.toFixed(1)),
            ctrDecline: pctChange(twCtr, lwCtr),
          });
        }
      }
    }

    // 9. 30-day trends (CPA/ROAS/CPM direction)
    // Split 30-day data into first 15 days vs last 15 days for trend direction
    const trendMidpoint = new Date(thirtyDaysAgo);
    trendMidpoint.setDate(trendMidpoint.getDate() + 15);

    const firstHalf = thirtyDayPerf.filter((p) => p.date < trendMidpoint);
    const secondHalf = thirtyDayPerf.filter((p) => p.date >= trendMidpoint);

    const firstHalfMetrics = aggregateMetrics(firstHalf);
    const secondHalfMetrics = aggregateMetrics(secondHalf);

    const trends = {
      cpa:
        secondHalfMetrics.cpa > firstHalfMetrics.cpa
          ? "increasing"
          : secondHalfMetrics.cpa < firstHalfMetrics.cpa
            ? "decreasing"
            : "stable",
      roas:
        secondHalfMetrics.blendedRoas > firstHalfMetrics.blendedRoas
          ? "increasing"
          : secondHalfMetrics.blendedRoas < firstHalfMetrics.blendedRoas
            ? "decreasing"
            : "stable",
      cpm:
        secondHalfMetrics.cpm > firstHalfMetrics.cpm
          ? "increasing"
          : secondHalfMetrics.cpm < firstHalfMetrics.cpm
            ? "decreasing"
            : "stable",
    };

    // 10. Build the full data payload string
    const dataPayload = `
BRAND CONTEXT:
Brand: ${brandProfile.brandName}
Industry: ${brandProfile.industry || "N/A"}
Monthly Revenue: ${brandProfile.monthlyRevenueRange || "N/A"}
Monthly Ad Spend: ${brandProfile.monthlyAdSpendRange || "N/A"}
Target Customer: ${brandProfile.targetCustomer || "N/A"}
Acquisition Focus: ${brandProfile.acquisitionFocus || "N/A"}
Biggest Challenges: ${brandProfile.biggestChallenges?.join(", ") || "N/A"}
Uses Creator Content: ${brandProfile.usesCreatorContent || "N/A"}
Uses Partnership Ads: ${brandProfile.usesPartnershipAds || "N/A"}
Unique Differentiator: ${brandProfile.uniqueDifferentiator || "N/A"}

THIS WEEK PERFORMANCE (${thisWeekStart.toISOString().split("T")[0]} to ${thisWeekEnd.toISOString().split("T")[0]}):
Total Spend: ${formatCurrency(thisWeekMetrics.totalSpend)}
Conversions: ${thisWeekMetrics.totalConversions}
Revenue: ${formatCurrency(thisWeekMetrics.totalConversionValue)}
Blended ROAS: ${thisWeekMetrics.blendedRoas.toFixed(2)}x
CPA: ${formatCurrency(thisWeekMetrics.cpa)}
CTR: ${thisWeekMetrics.ctr.toFixed(2)}%
CPM: ${formatCurrency(thisWeekMetrics.cpm)}
Impressions: ${thisWeekMetrics.totalImpressions.toLocaleString()}
Clicks: ${thisWeekMetrics.totalClicks.toLocaleString()}
Reach: ${thisWeekMetrics.totalReach.toLocaleString()}

LAST WEEK PERFORMANCE (${lastWeekStart.toISOString().split("T")[0]} to ${lastWeekEnd.toISOString().split("T")[0]}):
Total Spend: ${formatCurrency(lastWeekMetrics.totalSpend)}
Conversions: ${lastWeekMetrics.totalConversions}
Revenue: ${formatCurrency(lastWeekMetrics.totalConversionValue)}
Blended ROAS: ${lastWeekMetrics.blendedRoas.toFixed(2)}x
CPA: ${formatCurrency(lastWeekMetrics.cpa)}
CTR: ${lastWeekMetrics.ctr.toFixed(2)}%
CPM: ${formatCurrency(lastWeekMetrics.cpm)}

WEEK-OVER-WEEK CHANGES:
Spend: ${wowChanges.spend}
ROAS: ${wowChanges.roas}
CPA: ${wowChanges.cpa}
CTR: ${wowChanges.ctr}
Conversions: ${wowChanges.conversions}
CPM: ${wowChanges.cpm}

TOP 5 ADS BY ROAS (min $20 spend):
${
  topAds.length > 0
    ? topAds
        .map(
          (a, i) =>
            `${i + 1}. "${a.ad?.adName || "Unknown"}" — ROAS: ${a.roas.toFixed(2)}x | Spend: ${formatCurrency(a.spend)} | Conversions: ${a.conversions} | Type: ${a.ad?.creativeType || "N/A"} | Partnership: ${a.ad?.isPartnershipAd ? "Yes" : "No"}`
        )
        .join("\n")
    : "No ads with $20+ spend this week"
}

BOTTOM 5 ADS BY ROAS (min $20 spend):
${
  bottomAds.length > 0
    ? bottomAds
        .map(
          (a, i) =>
            `${i + 1}. "${a.ad?.adName || "Unknown"}" — ROAS: ${a.roas.toFixed(2)}x | Spend: ${formatCurrency(a.spend)} | Conversions: ${a.conversions} | Type: ${a.ad?.creativeType || "N/A"} | Partnership: ${a.ad?.isPartnershipAd ? "Yes" : "No"}`
        )
        .join("\n")
    : "No ads with $20+ spend this week"
}

FORMAT BREAKDOWN (this week):
${Object.entries(formatBreakdown)
  .map(
    ([type, data]) =>
      `${type}: Spend ${formatCurrency(data.spend)} | Conversions: ${data.conversions} | ROAS: ${data.spend > 0 ? (data.conversionValue / data.spend).toFixed(2) : "0.00"}x | Impressions: ${data.impressions.toLocaleString()}`
  )
  .join("\n")}

PARTNERSHIP vs BRAND CREATIVE (this week):
Partnership Ads: Spend ${formatCurrency(partnershipMetrics.spend)} | Conversions: ${partnershipMetrics.conversions} | ROAS: ${partnershipMetrics.spend > 0 ? (partnershipMetrics.conversionValue / partnershipMetrics.spend).toFixed(2) : "0.00"}x
Brand Creative: Spend ${formatCurrency(brandMetrics.spend)} | Conversions: ${brandMetrics.conversions} | ROAS: ${brandMetrics.spend > 0 ? (brandMetrics.conversionValue / brandMetrics.spend).toFixed(2) : "0.00"}x

FATIGUE SIGNALS (frequency > 3 AND CTR declined > 15%):
${
  fatigueSignals.length > 0
    ? fatigueSignals
        .map(
          (f) =>
            `"${f.adName}" — Frequency: ${f.frequency} | CTR Change: ${f.ctrDecline}`
        )
        .join("\n")
    : "No fatigue signals detected"
}

30-DAY TRENDS:
CPA trend: ${trends.cpa}
ROAS trend: ${trends.roas}
CPM trend: ${trends.cpm}
30-day total spend: ${formatCurrency(thirtyDayMetrics.totalSpend)}
30-day conversions: ${thirtyDayMetrics.totalConversions}
30-day blended ROAS: ${thirtyDayMetrics.blendedRoas.toFixed(2)}x
`.trim();

    // 11. Call Claude API
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the performance data for ${brandProfile.brandName}'s weekly brief:\n\n${dataPayload}`,
        },
      ],
    });

    const briefMarkdown =
      message.content[0].type === "text" ? message.content[0].text : "";

    // 12. Extract "Bottom Line" section
    const bottomLineMatch = briefMarkdown.match(
      /## The Bottom Line\s*\n([\s\S]*?)(?=\n## |$)/
    );
    const bottomLine = bottomLineMatch
      ? bottomLineMatch[1].trim()
      : briefMarkdown.substring(0, 200);

    // 13. Convert markdown to basic HTML
    const briefHtml = markdownToBasicHtml(briefMarkdown);

    // 14. Generate subject line
    const subjectLine = `${brandProfile.brandName} Weekly Brief: ${thisWeekMetrics.blendedRoas.toFixed(1)}x ROAS | ${wowChanges.roas} WoW`;

    // 15. Store in WeeklyBrief table
    const brief = await prisma.weeklyBrief.create({
      data: {
        userId,
        briefDate: new Date(),
        weekStart: thisWeekStart,
        weekEnd: thisWeekEnd,
        subjectLine,
        bottomLine,
        briefMarkdown,
        briefHtml,
        briefStructured: JSON.parse(JSON.stringify({
          thisWeek: thisWeekMetrics,
          lastWeek: lastWeekMetrics,
          thirtyDay: thirtyDayMetrics,
          wowChanges,
          topAds: topAds.map((a) => ({
            adName: a.ad?.adName,
            roas: a.roas,
            spend: a.spend,
            conversions: a.conversions,
            creativeType: a.ad?.creativeType,
            isPartnershipAd: a.ad?.isPartnershipAd,
          })),
          bottomAds: bottomAds.map((a) => ({
            adName: a.ad?.adName,
            roas: a.roas,
            spend: a.spend,
            conversions: a.conversions,
            creativeType: a.ad?.creativeType,
            isPartnershipAd: a.ad?.isPartnershipAd,
          })),
          formatBreakdown,
          partnershipVsBrand: { partnershipMetrics, brandMetrics },
          fatigueSignals,
          trends,
        })),
        analysisData: JSON.parse(JSON.stringify({ dataPayload })),
      },
    });

    return NextResponse.json({
      success: true,
      brief: {
        id: brief.id,
        briefDate: brief.briefDate,
        subjectLine: brief.subjectLine,
        bottomLine: brief.bottomLine,
        briefMarkdown: brief.briefMarkdown,
        briefHtml: brief.briefHtml,
        shareToken: brief.shareToken,
      },
    });
  } catch (error) {
    console.error("Brief generation failed:", error);
    return NextResponse.json(
      {
        error: "Brief generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
