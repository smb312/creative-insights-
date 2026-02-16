import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";
import { calculatePacing, formatPacingForBrief } from "@/lib/pacing";
import type { MonthlyTargets, MtdActuals } from "@/lib/pacing";

export const maxDuration = 120; // Allow up to 2 minutes for generation

const CLAUDE_SYSTEM_PROMPT = `You are writing a weekly performance brief for an ecommerce founder.

This is NOT a strategy memo. It's a sharp, scannable executive briefing they read in 2 minutes with their morning coffee.

Rules:
- Be direct and blunt. No filler, no fluff, no "overall" or "in summary."
- Use their brand name naturally.
- Reference specific numbers — always.
- The Weekly Snapshot table speaks for itself. Don't narrate the numbers above or below the table.
- Pacing section: 2-3 sentences max. Are they on track or not? By how much? What's the math to get back on track?
- Key Callouts: 3-5 bullet points. Each is ONE sentence — a single, complete insight. Use emoji indicators:
  🟢 for positive / what's working
  🔴 for problems / what needs attention
  🟡 for watch items / neutral but notable
  Mix of positive and negative. Lead with the most impactful.
  Examples of good callouts:
  "🟢 Partnership ads delivering 5.83x ROAS vs 2.66x brand creative — but only getting 33% of spend."
  "🔴 5 brand ads spent $5.5K combined with zero conversions this week."
  "🟡 Fatigue signal on 'Upgrade Your Body Care' — frequency 3.1, CTR down 17.8%."
- This Week's Play: Exactly 3 action items. Each is ONE sentence. Start each with a bold action verb (Kill, Shift, Scale, Test, Cut, Launch, Pause, Cap). Be specific — include dollar amounts, ad names, or creator names where possible.
- Looking Ahead: 1-2 sentences. If there are upcoming marketing events, reference them and say what to do NOW to prepare. If no events, mention what metrics to watch next week.
- If marketing calendar events are provided, weave them into Callouts and Looking Ahead — don't create a separate section for them.
- Total brief length: 300-500 words MAX. If you're over 500 words, you're writing too much. Cut ruthlessly.
- Never use phrases like "let's dive in", "here's what you need to know", "in conclusion", "overall", or "it's worth noting."
- Never repeat the same insight in multiple sections.

If no monthly pacing data is provided, skip the Pacing section entirely.`;

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

    // 10. Pacing data (if monthly targets exist)
    let pacingPayload = "";
    try {
      const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const monthlyTarget = await prisma.monthlyTarget.findUnique({
        where: { userId_month: { userId, month: monthStart } },
      });

      if (monthlyTarget) {
        const mtdPerf = await prisma.metaAdPerformance.findMany({
          where: {
            metaAdId: { in: adIds },
            date: { gte: monthStart, lte: thisWeekEnd },
          },
          select: { spend: true, conversions: true, conversionValue: true },
        });

        const mtdActuals: MtdActuals = {
          spend: mtdPerf.reduce((sum, r) => sum + r.spend, 0),
          conversions: mtdPerf.reduce((sum, r) => sum + r.conversions, 0),
          conversionValue: mtdPerf.reduce((sum, r) => sum + r.conversionValue, 0),
        };

        const targets: MonthlyTargets = {
          revenueGoal: monthlyTarget.revenueGoal,
          adSpendBudget: monthlyTarget.adSpendBudget,
          targetRoas: monthlyTarget.targetRoas,
          targetCpa: monthlyTarget.targetCpa,
          targetOrders: monthlyTarget.targetOrders,
          targetNewCac: monthlyTarget.targetNewCac,
        };

        const pacing = calculatePacing(targets, mtdActuals, now);
        pacingPayload = "\n" + formatPacingForBrief(pacing, targets);
      }
    } catch (pacingError) {
      console.warn("Skipping pacing data — MonthlyTarget table may not exist yet:", pacingError);
    }

    // 11. Fetch marketing events for context
    let marketingEventsPayload = "";
    try {
      const upcomingEventsEnd = new Date(now);
      upcomingEventsEnd.setDate(upcomingEventsEnd.getDate() + 30);
      const recentEventsStart = new Date(now);
      recentEventsStart.setDate(recentEventsStart.getDate() - 14);

      const upcomingEvents = await prisma.marketingEvent.findMany({
        where: {
          userId,
          startDate: { gte: now, lte: upcomingEventsEnd },
        },
        orderBy: { startDate: "asc" },
      });

      const recentEvents = await prisma.marketingEvent.findMany({
        where: {
          userId,
          OR: [
            { startDate: { gte: recentEventsStart, lt: now } },
            { endDate: { gte: recentEventsStart, lt: now } },
          ],
        },
        orderBy: { startDate: "desc" },
      });

      if (upcomingEvents.length > 0) {
        const formatEvent = (e: typeof upcomingEvents[number]) => {
          const lines: string[] = [];
          const dateStr = e.endDate
            ? `${e.startDate.toISOString().split("T")[0]} to ${e.endDate.toISOString().split("T")[0]}`
            : e.startDate.toISOString().split("T")[0];
          lines.push(`- ${e.title} (${e.eventType}) — ${dateStr}`);
          if (e.description) lines.push(`  ${e.description}`);
          if (e.adSpendBoost != null) lines.push(`  Expected ad spend boost: $${e.adSpendBoost}/day`);
          if (e.revenueTarget != null) lines.push(`  Revenue target: $${e.revenueTarget.toLocaleString()}`);
          if (e.notes) lines.push(`  Notes: ${e.notes}`);
          const daysAway = Math.ceil((e.startDate.getTime() - now.getTime()) / 86400000);
          lines.push(`  Days away: ${daysAway}`);
          return lines.join("\n");
        };
        marketingEventsPayload += `\n\nUPCOMING MARKETING EVENTS (next 30 days):\n${upcomingEvents.map(formatEvent).join("\n")}`;
      }

      if (recentEvents.length > 0) {
        const formatRecentEvent = (e: typeof recentEvents[number]) => {
          const dateStr = e.endDate
            ? `${e.startDate.toISOString().split("T")[0]} to ${e.endDate.toISOString().split("T")[0]}`
            : e.startDate.toISOString().split("T")[0];
          const lines: string[] = [];
          lines.push(`- ${e.title} (${e.eventType}) — ${dateStr}`);
          if (e.description) lines.push(`  ${e.description}`);
          if (e.revenueTarget != null) lines.push(`  Revenue target: $${e.revenueTarget.toLocaleString()}`);
          const daysAgo = Math.ceil((now.getTime() - e.startDate.getTime()) / 86400000);
          lines.push(`  Ended: ${daysAgo} days ago`);
          return lines.join("\n");
        };
        marketingEventsPayload += `\n\nRECENTLY COMPLETED EVENTS (last 14 days):\n${recentEvents.map(formatRecentEvent).join("\n")}`;
      }
    } catch (eventsError) {
      console.warn("Skipping marketing events — table may not exist yet:", eventsError);
    }

    // 12. Build the full data payload string
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
${pacingPayload}${marketingEventsPayload}`.trim();

    // 13. Build the user prompt with format instructions
    const userPrompt = `Here is the performance data for ${brandProfile.brandName}'s weekly brief:

${dataPayload}

Generate the brief using ONLY these sections in this exact order:
1. Weekly Snapshot (metrics table only, no prose)
2. Pacing (2-3 sentences if targets exist, skip if not)
3. Key Callouts (3-5 single-line bullets with emoji indicators)
4. This Week's Play (3 numbered action items, one sentence each)
5. Looking Ahead (1-2 sentences)

Keep the entire brief under 500 words. Be ruthlessly concise.

After generating the brief sections above, search the web for 3 recent marketing or ecommerce news articles from the past 7 days that would be relevant to a DTC ecommerce founder. Focus on topics like:
- Meta/Facebook/Instagram ad platform changes or updates
- Ecommerce trends and consumer behavior shifts
- Creator economy and influencer marketing news
- AI in marketing
- Major platform updates (Shopify, TikTok, Google Ads)
- Notable DTC brand moves or case studies

For each article, provide:
- Article title
- Source name (e.g., "Marketing Dive", "Glossy", "Modern Retail")
- URL
- One-sentence summary of why it matters for an ecommerce founder

Format as:

## Marketing Radar
1. **[Article Title]** — *Source Name*
   Why it matters: [One sentence]
   [URL]

2. **[Article Title]** — *Source Name*
   Why it matters: [One sentence]
   [URL]

3. **[Article Title]** — *Source Name*
   Why it matters: [One sentence]
   [URL]`;

    // 14. Call Claude API with web search tool
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 3000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        },
      ],
      system: CLAUDE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // 15. Extract text from response (may include tool_use blocks from web search)
    const briefMarkdown = message.content
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { type: string; text?: string }) => block.text || "")
      .join("\n");

    // 16. Extract the first Key Callout as the bottom line summary
    const calloutMatch = briefMarkdown.match(/## Key Callouts\s*\n([\s\S]*?)(?=\n## |$)/);
    let bottomLine: string;
    if (calloutMatch) {
      // Grab the first bullet line
      const firstBullet = calloutMatch[1].trim().split("\n")[0];
      // Strip the emoji prefix and leading "- "
      bottomLine = firstBullet.replace(/^-\s*/, "").replace(/^[🟢🔴🟡]\s*/, "").trim();
    } else {
      bottomLine = briefMarkdown.substring(0, 200);
    }

    // 17. Convert markdown to basic HTML
    const briefHtml = markdownToBasicHtml(briefMarkdown);

    // 18. Generate subject line
    const subjectLine = `${brandProfile.brandName} Weekly Brief: ${thisWeekMetrics.blendedRoas.toFixed(1)}x ROAS | ${wowChanges.roas} WoW`;

    // 19. Store in WeeklyBrief table
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
