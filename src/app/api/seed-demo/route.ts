import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { seedDemoData } from "@/lib/seed-demo-data";

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
    return NextResponse.json(
      { error: "Failed to seed demo data" },
      { status: 500 }
    );
  }
}
