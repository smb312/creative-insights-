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

    // Accept optional returnTo for post-callback redirect
    let returnTo = "/onboarding";
    try {
      const body = await request.json();
      if (body.returnTo) returnTo = body.returnTo;
    } catch {
      // no body is fine
    }

    const state = randomBytes(32).toString("hex");
    const statePayload = Buffer.from(
      JSON.stringify({ userId, returnTo, nonce: state })
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
