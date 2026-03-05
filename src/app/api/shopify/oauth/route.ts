import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const shopDomain = body.shopDomain as string | undefined;

    if (!shopDomain) {
      return NextResponse.json(
        { error: "shopDomain is required" },
        { status: 400 }
      );
    }

    // Normalize domain: strip protocol, trailing slashes, ensure .myshopify.com
    let normalizedDomain = shopDomain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

    if (!normalizedDomain.includes(".myshopify.com")) {
      normalizedDomain = `${normalizedDomain}.myshopify.com`;
    }

    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Shopify is not configured" },
        { status: 500 }
      );
    }

    const nonce = randomBytes(16).toString("hex");
    const statePayload = Buffer.from(
      JSON.stringify({ userId, shopDomain: normalizedDomain, nonce })
    ).toString("base64url");

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/shopify/callback`;
    const scopes = "read_orders,read_products";

    const oauthUrl =
      `https://${normalizedDomain}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${statePayload}`;

    return NextResponse.json({ url: oauthUrl });
  } catch (error) {
    console.error("Shopify OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
