import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monthParam = request.nextUrl.searchParams.get("month");
    if (!monthParam) {
      return NextResponse.json(
        { error: "month query parameter is required (e.g. ?month=2026-02)" },
        { status: 400 }
      );
    }

    // Parse "YYYY-MM" into the first day of that month
    const [year, month] = monthParam.split("-").map(Number);
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM." },
        { status: 400 }
      );
    }
    const monthDate = new Date(Date.UTC(year, month - 1, 1));

    const target = await prisma.monthlyTarget.findUnique({
      where: { userId_month: { userId, month: monthDate } },
    });

    return NextResponse.json({ target: target ?? null });
  } catch (error) {
    console.error("Error fetching targets:", error);
    return NextResponse.json(
      { error: "Failed to fetch targets" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, revenueGoal, adSpendBudget, targetRoas, targetCpa, targetOrders, targetNewCac } = body;

    if (!month) {
      return NextResponse.json(
        { error: "month is required (e.g. '2026-02')" },
        { status: 400 }
      );
    }

    const [year, mon] = month.split("-").map(Number);
    if (!year || !mon || mon < 1 || mon > 12) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM." },
        { status: 400 }
      );
    }
    const monthDate = new Date(Date.UTC(year, mon - 1, 1));

    const target = await prisma.monthlyTarget.upsert({
      where: { userId_month: { userId, month: monthDate } },
      create: {
        userId,
        month: monthDate,
        revenueGoal: revenueGoal != null ? Number(revenueGoal) : null,
        adSpendBudget: adSpendBudget != null ? Number(adSpendBudget) : null,
        targetRoas: targetRoas != null ? Number(targetRoas) : null,
        targetCpa: targetCpa != null ? Number(targetCpa) : null,
        targetOrders: targetOrders != null ? Math.round(Number(targetOrders)) : null,
        targetNewCac: targetNewCac != null ? Number(targetNewCac) : null,
      },
      update: {
        revenueGoal: revenueGoal != null ? Number(revenueGoal) : null,
        adSpendBudget: adSpendBudget != null ? Number(adSpendBudget) : null,
        targetRoas: targetRoas != null ? Number(targetRoas) : null,
        targetCpa: targetCpa != null ? Number(targetCpa) : null,
        targetOrders: targetOrders != null ? Math.round(Number(targetOrders)) : null,
        targetNewCac: targetNewCac != null ? Number(targetNewCac) : null,
      },
    });

    return NextResponse.json({ target });
  } catch (error) {
    console.error("Error saving targets:", error);
    return NextResponse.json(
      { error: "Failed to save targets" },
      { status: 500 }
    );
  }
}
