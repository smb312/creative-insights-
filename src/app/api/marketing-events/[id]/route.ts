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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the event belongs to this user
    const existing = await prisma.marketingEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, eventType, startDate, endDate, adSpendBoost, revenueTarget, notes } = body;

    if (eventType && !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const event = await prisma.marketingEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(eventType !== undefined && { eventType }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(adSpendBoost !== undefined && { adSpendBoost: adSpendBoost != null ? Number(adSpendBoost) : null }),
        ...(revenueTarget !== undefined && { revenueTarget: revenueTarget != null ? Number(revenueTarget) : null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error updating marketing event:", error);
    return NextResponse.json(
      { error: "Failed to update marketing event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the event belongs to this user
    const existing = await prisma.marketingEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.marketingEvent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting marketing event:", error);
    return NextResponse.json(
      { error: "Failed to delete marketing event" },
      { status: 500 }
    );
  }
}
