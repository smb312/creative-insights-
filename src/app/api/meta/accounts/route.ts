import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Map DB status values to the frontend's expected lowercase values */
function mapStatus(dbStatus: string): "active" | "pending" | null {
  switch (dbStatus) {
    case "ACTIVE":
      return "active";
    case "PENDING_SELECTION":
      return "pending";
    default:
      return null; // DISCONNECTED or unknown — exclude from response
  }
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adAccounts = await prisma.adAccount.findMany({
      where: {
        userId,
        status: { in: ["ACTIVE", "PENDING_SELECTION"] },
      },
      select: {
        id: true,
        metaAccountName: true,
        status: true,
      },
    });

    const accounts = adAccounts.map((a) => ({
      id: a.id,
      name: a.metaAccountName ?? "Unnamed Account",
      status: mapStatus(a.status),
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error fetching Meta accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch Meta ad accounts" },
      { status: 500 }
    );
  }
}
