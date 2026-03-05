import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

function verifyHmac(query: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;

  const hmac = query.get("hmac");
  if (!hmac) return false;

  // Build the message from sorted query params (excluding hmac)
  const params = new URLSearchParams();
  query.forEach((value, key) => {
    if (key !== "hmac") {
      params.set(key, value);
    }
  });
  params.sort();

  const message = params.toString();
  const digest = createHmac("sha256", secret).update(message).digest("hex");

  return digest === hmac;
}

function redirectToCallback(params: Record<string, string>) {
  const errorMsg = params.error;
  const target = errorMsg
    ? `/shopify-callback?error=${encodeURIComponent(errorMsg)}`
    : `/shopify-callback?success=true`;
  return NextResponse.redirect(new URL(target, process.env.NEXTAUTH_URL));
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const shopParam = searchParams.get("shop");

  try {
    if (!code || !stateParam || !shopParam) {
      return redirectToCallback({ error: "Invalid callback parameters" });
    }

    // Verify HMAC
    if (!verifyHmac(searchParams)) {
      return redirectToCallback({ error: "Invalid HMAC signature" });
    }

    // Decode state
    let stateData: { userId: string; shopDomain: string; nonce: string };
    try {
      stateData = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      );
    } catch {
      return redirectToCallback({ error: "Invalid state parameter" });
    }

    const { userId, shopDomain } = stateData;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return redirectToCallback({ error: "User not found" });
    }

    // Exchange code for permanent access token
    const tokenRes = await fetch(
      `https://${shopDomain}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Shopify token exchange failed:", errorText);
      return redirectToCallback({ error: "Failed to get access token" });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string;

    // Fetch basic shop info
    const shopRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/shop.json`,
      {
        headers: { "X-Shopify-Access-Token": accessToken },
      }
    );

    let storeName: string | null = null;
    let storeEmail: string | null = null;
    let currency = "USD";

    if (shopRes.ok) {
      const shopData = await shopRes.json();
      storeName = shopData.shop?.name ?? null;
      storeEmail = shopData.shop?.email ?? null;
      currency = shopData.shop?.currency ?? "USD";
    }

    // Store in DB — upsert (one store per user)
    await prisma.shopifyStore.upsert({
      where: { userId },
      create: {
        userId,
        shopDomain,
        accessToken,
        storeName,
        storeEmail,
        currency,
        status: "ACTIVE",
      },
      update: {
        shopDomain,
        accessToken,
        storeName,
        storeEmail,
        currency,
        status: "ACTIVE",
      },
    });

    return redirectToCallback({});
  } catch (error) {
    console.error("Shopify callback error:", error);
    return redirectToCallback({ error: "Failed to connect Shopify store" });
  }
}
