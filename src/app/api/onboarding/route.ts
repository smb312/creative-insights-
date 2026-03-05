import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

const REQUIRED_FIELDS = [
  "brandName",
  "industry",
  "monthlyRevenueRange",
  "businessAge",
  "targetCustomer",
  "acquisitionFocus",
  "monthlyAdSpendRange",
] as const;

const BRAND_PROFILE_DEFAULTS = {
  brandName: "",
  websiteUrl: "",
  industry: "",
  industryOther: "",
  monthlyRevenueRange: "",
  businessAge: "",
  targetCustomer: "",
  averageOrderValue: null,
  acquisitionFocus: "",
  uniqueDifferentiator: "",
  monthlyAdSpendRange: "",
  activeAdPlatforms: [],
  usesCreatorContent: "",
  usesPartnershipAds: "",
  biggestChallenges: [],
  challengesOther: "",
  competitor1: "",
  competitor2: "",
  competitor3: "",
  briefValuePreferences: [],
  additionalNotes: "",
  onboardingCompleted: false,
  onboardingStep: 1,
  briefsPaused: false,
};

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({
        profile: { ...BRAND_PROFILE_DEFAULTS, userId },
        exists: false,
      });
    }

    return NextResponse.json({ profile, exists: true });
  } catch (error) {
    console.error("Error loading brand profile:", error);
    return NextResponse.json(
      { error: "Failed to load brand profile" },
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

    // Remove fields that should not be set directly by the client
    const { id, userId: _uid, createdAt, updatedAt, user, ...data } = body;

    // If the client is marking onboarding as complete, verify required fields
    if (data.onboardingCompleted === true) {
      // Merge with existing profile to check completeness
      const existing = await prisma.brandProfile.findUnique({
        where: { userId },
      });

      const merged = { ...existing, ...data };

      const missingFields = REQUIRED_FIELDS.filter((field) => {
        const value = merged[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Missing required fields for onboarding completion",
            missingFields,
          },
          { status: 400 }
        );
      }
    }

    // brandName is required for creating a new profile
    // If no profile exists yet, ensure brandName is provided
    const existingProfile = await prisma.brandProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile && !data.brandName) {
      return NextResponse.json(
        { error: "brandName is required to create a brand profile" },
        { status: 400 }
      );
    }

    const profile = await prisma.brandProfile.upsert({
      where: { userId },
      create: {
        userId,
        brandName: data.brandName || "",
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error updating brand profile:", error);
    return NextResponse.json(
      { error: "Failed to update brand profile" },
      { status: 500 }
    );
  }
}
