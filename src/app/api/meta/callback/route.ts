import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  fetchAdAccounts,
} from "@/lib/meta-api";

/** Try to extract the popup flag from the base64url-encoded state param. */
function isPopup(stateParam: string | null): boolean {
  if (!stateParam) return false;
  try {
    const data = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    return !!data.popup;
  } catch {
    return false;
  }
}

/** Redirect helper that routes popup flows to the lightweight callback page. */
function redirect(
  path: string,
  params: Record<string, string>,
  popup: boolean
) {
  const query = new URLSearchParams(params).toString();
  if (popup) {
    const errorMsg = params.error;
    const target = errorMsg
      ? `/meta-callback?error=${encodeURIComponent(errorMsg)}`
      : `/meta-callback?success=true`;
    return NextResponse.redirect(
      new URL(target, process.env.NEXTAUTH_URL)
    );
  }
  return NextResponse.redirect(
    new URL(`${path}?${query}`, process.env.NEXTAUTH_URL)
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");
  const popup = isPopup(stateParam);

  try {
    if (error) {
      return redirect("/dashboard", { error: "Meta authorization was denied" }, popup);
    }

    if (!code || !stateParam) {
      return redirect("/dashboard", { error: "Invalid callback parameters" }, popup);
    }

    // Decode state
    let stateData: { userId: string; returnTo?: string; popup?: boolean };
    try {
      stateData = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      );
    } catch {
      return redirect("/dashboard", { error: "Invalid state parameter" }, popup);
    }

    const { userId, returnTo } = stateData;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return redirect("/dashboard", { error: "User not found" }, popup);
    }

    // Exchange code for short-lived token
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;
    const tokenResult = await exchangeCodeForToken(code, redirectUri);

    // Exchange for long-lived token
    const longLivedResult = await getLongLivedToken(tokenResult.access_token);

    // Fetch ad accounts
    const adAccounts = await fetchAdAccounts(longLivedResult.access_token);

    // Clean up any previous pending selections for this user
    await prisma.adAccount.deleteMany({
      where: { userId, status: "PENDING_SELECTION" },
    });

    // Store each ad account as PENDING_SELECTION
    const encryptedToken = encrypt(longLivedResult.access_token);
    const expiresAt = new Date(
      Date.now() + longLivedResult.expires_in * 1000
    );

    for (const account of adAccounts) {
      await prisma.adAccount.upsert({
        where: { metaAccountId: account.id },
        update: {
          encryptedAccessToken: encryptedToken,
          tokenExpiresAt: expiresAt,
          metaAccountName: account.name,
          status: "PENDING_SELECTION",
          userId,
        },
        create: {
          metaAccountId: account.id,
          metaAccountName: account.name,
          encryptedAccessToken: encryptedToken,
          tokenExpiresAt: expiresAt,
          userId,
          status: "PENDING_SELECTION",
        },
      });
    }

    if (popup) {
      return redirect("/meta-callback", {}, popup);
    }

    const redirectPath = returnTo || "/onboarding";
    return NextResponse.redirect(
      new URL(
        `${redirectPath}?selectAccount=true`,
        process.env.NEXTAUTH_URL
      )
    );
  } catch (error) {
    console.error("Meta callback error:", error);
    return redirect(
      "/dashboard",
      { error: "Failed to connect Meta account" },
      popup
    );
  }
}
