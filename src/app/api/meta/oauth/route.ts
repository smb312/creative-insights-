import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getMetaOAuthUrl } from "@/lib/meta-api";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    const state = randomBytes(32).toString("hex");
    // Encode brandId and userId in state for the callback
    const statePayload = Buffer.from(
      JSON.stringify({ brandId, userId, nonce: state })
    ).toString("base64url");

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;
    const oauthUrl = getMetaOAuthUrl(redirectUri, statePayload);

    return NextResponse.json({ url: oauthUrl });
  } catch (error) {
    console.error("Meta OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
