import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { fetchAdAccounts, decryptAccessToken } from "@/lib/meta-api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brandId = request.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
      include: { adAccounts: true },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    if (brand.adAccounts.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    // Use the first ad account's token to fetch fresh list
    const account = brand.adAccounts[0];
    const accessToken = decryptAccessToken(account.encryptedAccessToken);
    const metaAccounts = await fetchAdAccounts(accessToken);

    return NextResponse.json({ accounts: metaAccounts });
  } catch (error) {
    console.error("Error fetching Meta accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch Meta ad accounts" },
      { status: 500 }
    );
  }
}
