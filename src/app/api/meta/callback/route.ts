import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  fetchAdAccounts,
} from "@/lib/meta-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent("Meta authorization was denied")}`,
          process.env.NEXTAUTH_URL
        )
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=Invalid+callback+parameters",
          process.env.NEXTAUTH_URL
        )
      );
    }

    // Decode state
    let stateData: { brandId: string; userId: string };
    try {
      stateData = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      );
    } catch {
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=Invalid+state+parameter",
          process.env.NEXTAUTH_URL
        )
      );
    }

    const { brandId, userId } = stateData;

    // Verify the brand belongs to the user
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId },
    });

    if (!brand) {
      return NextResponse.redirect(
        new URL("/dashboard?error=Brand+not+found", process.env.NEXTAUTH_URL)
      );
    }

    // Exchange code for short-lived token
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/callback`;
    const tokenResult = await exchangeCodeForToken(code, redirectUri);

    // Exchange for long-lived token
    const longLivedResult = await getLongLivedToken(tokenResult.access_token);

    // Fetch ad accounts
    const adAccounts = await fetchAdAccounts(longLivedResult.access_token);

    // Store each ad account
    for (const account of adAccounts) {
      const encryptedToken = encrypt(longLivedResult.access_token);
      const expiresAt = new Date(
        Date.now() + longLivedResult.expires_in * 1000
      );

      await prisma.adAccount.upsert({
        where: { metaAccountId: account.id },
        update: {
          encryptedAccessToken: encryptedToken,
          tokenExpiresAt: expiresAt,
          metaAccountName: account.name,
          status: "ACTIVE",
          brandId,
        },
        create: {
          metaAccountId: account.id,
          metaAccountName: account.name,
          encryptedAccessToken: encryptedToken,
          tokenExpiresAt: expiresAt,
          brandId,
          status: "ACTIVE",
        },
      });
    }

    return NextResponse.redirect(
      new URL(
        `/dashboard/brands/${brandId}?connected=true`,
        process.env.NEXTAUTH_URL
      )
    );
  } catch (error) {
    console.error("Meta callback error:", error);
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=Failed+to+connect+Meta+account",
        process.env.NEXTAUTH_URL
      )
    );
  }
}
