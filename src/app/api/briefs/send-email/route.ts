import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { Resend } from "resend";

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

function buildEmailHtml(
  briefHtml: string,
  shareToken: string,
  brandName: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.growwithcoast.com";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName} — Your Weekly Pulse</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f5f5f5;">
    <tr>
      <td style="padding:24px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin:0 auto;max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:24px 32px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Brand Pulse</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#999999;">Your Weekly Performance Brief &middot; by Coast</p>
            </td>
          </tr>

          <!-- Brief Content -->
          <tr>
            <td style="padding:32px;">
              ${briefHtml}
            </td>
          </tr>

          <!-- CTA Section -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f8f9fa;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1a1a1a;">Want help acting on these insights?</p>
                    <a href="${appUrl}/dashboard" style="display:inline-block;padding:10px 24px;background-color:#1a1a1a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Open Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid #e5e5e5;padding-top:16px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;color:#999999;">
                      <a href="${appUrl}/brief/${shareToken}" style="color:#666666;text-decoration:underline;">View on web</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${appUrl}/dashboard/settings" style="color:#666666;text-decoration:underline;">Manage settings</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#cccccc;">
                      &copy; ${new Date().getFullYear()} Coast. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: support both session auth and CRON_SECRET header
    let userId: string | null = null;
    const cronSecret = request.headers.get("x-cron-secret");

    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      // Cron invocation - userId will be derived from the brief
      userId = null; // Will be set from brief data
    } else {
      userId = await getCurrentUserId();
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { briefId } = body;

    if (!briefId) {
      return NextResponse.json(
        { error: "briefId is required" },
        { status: 400 }
      );
    }

    // Load the brief with user data
    const brief = await prisma.weeklyBrief.findUnique({
      where: { id: briefId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!brief) {
      return NextResponse.json(
        { error: "Brief not found" },
        { status: 404 }
      );
    }

    // Authorization check: ensure the requesting user owns this brief
    // (unless it's a cron invocation)
    if (userId && brief.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: brief does not belong to this user" },
        { status: 403 }
      );
    }

    if (!brief.user.email) {
      return NextResponse.json(
        { error: "User has no email address" },
        { status: 400 }
      );
    }

    if (!brief.briefHtml) {
      return NextResponse.json(
        { error: "Brief has no HTML content to send" },
        { status: 400 }
      );
    }

    // Get brand name for the email template
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: brief.userId },
      select: { brandName: true },
    });

    const brandName = brandProfile?.brandName || "Your Brand";

    // Build the full HTML email
    const emailHtml = buildEmailHtml(
      brief.briefHtml,
      brief.shareToken,
      brandName
    );

    // Send via Resend
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "pulse@growwithcoast.com";

    const { error: sendError } = await getResendClient().emails.send({
      from: fromEmail,
      to: brief.user.email,
      subject: brief.subjectLine || `${brandName} — Your Weekly Pulse`,
      html: emailHtml,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json(
        { error: "Failed to send email", details: sendError.message },
        { status: 500 }
      );
    }

    // Update brief to mark email as sent
    await prisma.weeklyBrief.update({
      where: { id: briefId },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Brief sent to ${brief.user.email}`,
    });
  } catch (error) {
    console.error("Send email failed:", error);
    return NextResponse.json(
      {
        error: "Failed to send brief email",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
