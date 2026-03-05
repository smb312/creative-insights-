import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const VALID_EVENT_TYPES = [
  "product_launch",
  "promotion",
  "influencer_campaign",
  "seasonal",
  "content_shoot",
  "email_campaign",
  "pr_press",
  "event",
  "other",
];

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: Record<string, unknown> = { userId };

    if (from || to) {
      where.startDate = {};
      if (from) (where.startDate as Record<string, Date>).gte = new Date(from);
      if (to) (where.startDate as Record<string, Date>).lte = new Date(to);
    }

    const events = await prisma.marketingEvent.findMany({
      where,
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Error fetching marketing events:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketing events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, eventType, startDate, endDate, adSpendBoost, revenueTarget, notes } = body;

    if (!title || !eventType || !startDate) {
      return NextResponse.json(
        { error: "title, eventType, and startDate are required" },
        { status: 400 }
      );
    }

    if (!VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const event = await prisma.marketingEvent.create({
      data: {
        userId,
        title,
        description: description || null,
        eventType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        adSpendBoost: adSpendBoost != null ? Number(adSpendBoost) : null,
        revenueTarget: revenueTarget != null ? Number(revenueTarget) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error creating marketing event:", error);
    return NextResponse.json(
      { error: "Failed to create marketing event" },
      { status: 500 }
    );
  }
}
