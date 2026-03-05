import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Meta Data Deletion Callback endpoint.
 * Meta sends a signed POST request when a user removes the app.
 * We delete all user data and return a confirmation URL + code.
 *
 * See: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get("signed_request");

    if (!signedRequest) {
      return NextResponse.json(
        { error: "Missing signed_request parameter" },
        { status: 400 }
      );
    }

    // Parse and verify signed_request
    const [encodedSig, payload] = signedRequest.split(".", 2);

    if (!encodedSig || !payload) {
      return NextResponse.json(
        { error: "Invalid signed_request format" },
        { status: 400 }
      );
    }

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("META_APP_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify signature
    const sig = Buffer.from(
      encodedSig.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
    const expectedSig = crypto
      .createHmac("sha256", appSecret)
      .update(payload)
      .digest();

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Decode payload
    const decodedPayload = JSON.parse(
      Buffer.from(
        payload.replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      ).toString("utf-8")
    );

    const metaUserId = decodedPayload.user_id;

    if (!metaUserId) {
      return NextResponse.json(
        { error: "No user_id in payload" },
        { status: 400 }
      );
    }

    // Find the user via their OAuth account (provider: "facebook")
    const oauthAccount = await prisma.account.findFirst({
      where: {
        provider: "facebook",
        providerAccountId: String(metaUserId),
      },
      select: { userId: true },
    });

    // Generate a confirmation code
    const confirmationCode = crypto.randomBytes(16).toString("hex");

    if (oauthAccount) {
      const userId = oauthAccount.userId;

      // Delete all user data in order (respecting foreign keys)
      await prisma.$transaction([
        prisma.metaAd.deleteMany({ where: { userId } }),
        prisma.weeklyBrief.deleteMany({ where: { userId } }),
        prisma.monthlyTarget.deleteMany({ where: { userId } }),
        prisma.marketingEvent.deleteMany({ where: { userId } }),
        prisma.adAccount.deleteMany({ where: { userId } }),
        prisma.brandProfile.deleteMany({ where: { userId } }),
        prisma.account.deleteMany({ where: { userId } }),
        prisma.session.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);
    }

    // Return the response Meta expects
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://pulse.growwithcoast.com";

    return NextResponse.json({
      url: `${appUrl}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("Data deletion callback failed:", error);
    return NextResponse.json(
      { error: "Data deletion failed" },
      { status: 500 }
    );
  }
}

/**
 * GET handler for data deletion status checks.
 */
export async function GET() {
  return NextResponse.json({
    status: "complete",
    message:
      "Brand Pulse data deletion is handled automatically. Visit /data-deletion for more information.",
  });
}
