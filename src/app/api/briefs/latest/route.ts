import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brief = await prisma.weeklyBrief.findFirst({
      where: { userId },
      orderBy: { briefDate: "desc" },
      select: {
        id: true,
        subjectLine: true,
        bottomLine: true,
        briefMarkdown: true,
        briefHtml: true,
        weekStart: true,
        weekEnd: true,
        briefDate: true,
        shareToken: true,
        createdAt: true,
      },
    });

    if (!brief) {
      return NextResponse.json({ brief: null });
    }

    return NextResponse.json({
      brief: {
        id: brief.id,
        subjectLine: brief.subjectLine,
        bottomLine: brief.bottomLine,
        briefMarkdown: brief.briefMarkdown,
        briefHtml: brief.briefHtml,
        weekStart: brief.weekStart.toISOString(),
        weekEnd: brief.weekEnd.toISOString(),
        briefDate: brief.briefDate.toISOString(),
        shareToken: brief.shareToken,
        createdAt: brief.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Briefs latest GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
