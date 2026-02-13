import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { seedDemoData } from "@/lib/seed-demo-data";

export const maxDuration = 300; // Allow up to 5 minutes for seed

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seedDemoData(userId);

    return NextResponse.json({
      success: true,
      message: `Seeded ${result.adsCreated} ads with ${result.totalPerformanceRows} performance rows`,
      ...result,
    });
  } catch (error) {
    console.error("Error seeding demo data:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code: string }).code
        : undefined;
    return NextResponse.json(
      { error: "Failed to seed demo data", message, code },
      { status: 500 }
    );
  }
}
