import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import Anthropic from "@anthropic-ai/sdk";

interface BriefRequest {
  brandName: string;
  totalAds: number;
  creatorAdCount: number;
  brandAdCount: number;
  creatorMetrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpm: number;
    cpa: number | null;
    roas: number | null;
  };
  brandMetrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpm: number;
    cpa: number | null;
    roas: number | null;
  };
  topCreatorAds: {
    adName: string;
    creative: {
      format: string;
      title: string | null;
      body: string | null;
    } | null;
    metrics: {
      spend: number;
      impressions: number;
      ctr: number;
      cpm: number;
      roas: number | null;
      conversions: number;
    };
  }[];
  creatorFormatBreakdown: Record<string, number>;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured. Set ANTHROPIC_API_KEY in environment." },
        { status: 503 }
      );
    }

    const data: BriefRequest = await request.json();

    // Build a performance summary for the prompt
    const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    const fmtCurrency = (n: number) =>
      n.toLocaleString("en-US", { style: "currency", currency: "USD" });

    const creatorVsBrand = `
Creator/Partnership Ads (${data.creatorAdCount} ads):
  - Spend: ${fmtCurrency(data.creatorMetrics.spend)}
  - Impressions: ${fmt(data.creatorMetrics.impressions)}
  - CTR: ${fmt(data.creatorMetrics.ctr)}%
  - CPM: ${fmtCurrency(data.creatorMetrics.cpm)}
  - ROAS: ${data.creatorMetrics.roas !== null ? fmt(data.creatorMetrics.roas) + "x" : "N/A"}
  - Conversions: ${fmt(data.creatorMetrics.conversions)}
  - CPA: ${data.creatorMetrics.cpa !== null ? fmtCurrency(data.creatorMetrics.cpa) : "N/A"}

Brand-Created Ads (${data.brandAdCount} ads):
  - Spend: ${fmtCurrency(data.brandMetrics.spend)}
  - Impressions: ${fmt(data.brandMetrics.impressions)}
  - CTR: ${fmt(data.brandMetrics.ctr)}%
  - CPM: ${fmtCurrency(data.brandMetrics.cpm)}
  - ROAS: ${data.brandMetrics.roas !== null ? fmt(data.brandMetrics.roas) + "x" : "N/A"}
  - Conversions: ${fmt(data.brandMetrics.conversions)}
  - CPA: ${data.brandMetrics.cpa !== null ? fmtCurrency(data.brandMetrics.cpa) : "N/A"}`.trim();

    const topCreatorDetails = data.topCreatorAds
      .slice(0, 5)
      .map(
        (ad, i) =>
          `${i + 1}. "${ad.adName}" (${ad.creative?.format || "UNKNOWN"} format)
     Title: ${ad.creative?.title || "N/A"}
     Body excerpt: ${ad.creative?.body ? ad.creative.body.slice(0, 150) : "N/A"}
     Spend: ${fmtCurrency(ad.metrics.spend)} | CTR: ${fmt(ad.metrics.ctr)}% | CPM: ${fmtCurrency(ad.metrics.cpm)} | ROAS: ${ad.metrics.roas !== null ? fmt(ad.metrics.roas) + "x" : "N/A"}`
      )
      .join("\n\n");

    const formatBreakdown = Object.entries(data.creatorFormatBreakdown)
      .map(([format, count]) => `${format}: ${count} ads`)
      .join(", ");

    const prompt = `You are a creative strategist for performance marketing. Based on the following ad performance data for the brand "${data.brandName}", generate a concise creative brief that a brand can hand directly to creators/influencers for their next round of content.

## Performance Data

${creatorVsBrand}

## Top Performing Creator Ads
${topCreatorDetails || "No creator ads found in the data."}

## Creator Ad Format Breakdown
${formatBreakdown || "No data available."}

## Instructions

Generate a creative brief in the following format. Use plain text with clear section headers. Be specific and actionable — reference actual data points and patterns from the performance data above.

**CREATIVE INTEL BRIEF — ${data.brandName}**

**1. Performance Summary**
A 2-3 sentence overview of how creator content is performing vs. brand content, with the key takeaway.

**2. What's Working**
3-5 bullet points identifying specific patterns, themes, or approaches from top-performing creator ads. Reference actual performance numbers.

**3. Recommended Formats**
Which ad formats (Static, Video, Carousel) should creators prioritize and why, based on the data.

**4. Tone & Style Guidance**
2-3 bullet points on the tone, visual style, and messaging approach that the data suggests resonates best.

**5. Example Hooks**
Provide 3-4 example opening hooks or angles that creators should try, inspired by the patterns in top-performing ads.

**6. Performance Benchmarks**
List the target metrics creators should aim for (CTR, CPM, ROAS) based on the top-performer data. Present as a simple table or list.

**7. Key Dos and Don'ts**
3-4 bullet "Do" items and 2-3 "Don't" items based on what the data shows.

Keep the brief concise (under 600 words), direct, and immediately actionable. Write it as if handing it to a creator who needs clear direction.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const briefContent =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ brief: briefContent });
  } catch (error) {
    console.error("Brief generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate creative brief" },
      { status: 500 }
    );
  }
}
