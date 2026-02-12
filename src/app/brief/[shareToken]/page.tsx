import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { format } from "date-fns";
import { Mail } from "lucide-react";

interface BriefPageProps {
  params: Promise<{ shareToken: string }>;
}

export async function generateMetadata({
  params,
}: BriefPageProps): Promise<Metadata> {
  const { shareToken } = await params;

  const brief = await prisma.weeklyBrief.findUnique({
    where: { shareToken },
    select: { subjectLine: true, weekStart: true, weekEnd: true },
  });

  if (!brief) {
    return { title: "Brief Not Found | Weekly CMO Brief" };
  }

  const dateRange = `${format(brief.weekStart, "MMM d")} - ${format(brief.weekEnd, "MMM d, yyyy")}`;

  return {
    title: `${brief.subjectLine ?? "Weekly Brief"} | Weekly CMO Brief`,
    description: `AI-powered ad performance brief for ${dateRange}. Get your own free weekly brief at Weekly CMO Brief.`,
  };
}

/**
 * Parses a subset of Markdown into HTML.
 * Handles: headings (##), bold (**), bullet lists (-), and simple pipe tables.
 */
function parseMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inList && !line.match(/^\s*-\s/)) {
      html.push("</ul>");
      inList = false;
    }

    // Table rows
    if (line.trim().startsWith("|")) {
      if (line.trim().match(/^\|[\s\-:|]+\|$/)) continue;

      const cells = line
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        html.push(
          '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse text-sm">'
        );
        html.push("<thead><tr>");
        cells.forEach((cell) => {
          html.push(
            `<th class="border border-gray-200 bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">${inlineFormat(cell)}</th>`
          );
        });
        html.push("</tr></thead><tbody>");
        continue;
      }

      html.push("<tr>");
      cells.forEach((cell) => {
        html.push(
          `<td class="border border-gray-200 px-4 py-2 text-gray-600">${inlineFormat(cell)}</td>`
        );
      });
      html.push("</tr>");
      continue;
    }

    if (inTable) {
      html.push("</tbody></table></div>");
      inTable = false;
    }

    // Headings
    if (line.startsWith("### ")) {
      html.push(
        `<h3 class="mt-6 mb-2 text-base font-semibold text-gray-900">${inlineFormat(line.slice(4))}</h3>`
      );
      continue;
    }
    if (line.startsWith("## ")) {
      html.push(
        `<h2 class="mt-8 mb-3 text-lg font-bold text-gray-900">${inlineFormat(line.slice(3))}</h2>`
      );
      continue;
    }
    if (line.startsWith("# ")) {
      html.push(
        `<h1 class="mt-8 mb-3 text-xl font-bold text-gray-900">${inlineFormat(line.slice(2))}</h1>`
      );
      continue;
    }

    // Bullet list items
    const bulletMatch = line.match(/^\s*-\s(.+)/);
    if (bulletMatch) {
      if (!inList) {
        inList = true;
        html.push('<ul class="my-2 ml-4 list-disc space-y-1 text-gray-600">');
      }
      html.push(`<li>${inlineFormat(bulletMatch[1])}</li>`);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      html.push("<br />");
      continue;
    }

    // Regular paragraph
    html.push(
      `<p class="my-2 text-gray-600 leading-relaxed">${inlineFormat(line)}</p>`
    );
  }

  if (inList) html.push("</ul>");
  if (inTable) html.push("</tbody></table></div>");

  return html.join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-gray-900">$1</strong>'
    )
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono">$1</code>'
    );
}

export default async function PublicBriefPage({ params }: BriefPageProps) {
  const { shareToken } = await params;

  const brief = await prisma.weeklyBrief.findUnique({
    where: { shareToken },
    include: {
      user: {
        select: {
          brandProfile: {
            select: { brandName: true },
          },
        },
      },
    },
  });

  if (!brief) {
    notFound();
  }

  const dateRange = `${format(brief.weekStart, "MMM d")} - ${format(brief.weekEnd, "MMM d, yyyy")}`;
  const renderedContent =
    brief.briefHtml ?? (brief.briefMarkdown ? parseMarkdown(brief.briefMarkdown) : null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">
              Weekly CMO Brief
            </span>
          </div>
          <a
            href="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Get Your Free Brief
          </a>
        </div>
      </header>

      {/* Brief content */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Brief header */}
          <div className="border-b border-gray-100 px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {brief.subjectLine ?? "Weekly Brief"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">{dateRange}</p>
            {brief.user?.brandProfile?.brandName && (
              <p className="mt-1 text-xs text-gray-400">
                Prepared for {brief.user.brandProfile.brandName}
              </p>
            )}
          </div>

          {/* Bottom line */}
          {brief.bottomLine && (
            <div className="mx-8 mt-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">
                {brief.bottomLine}
              </p>
            </div>
          )}

          {/* Main content */}
          <div className="px-8 py-6">
            {renderedContent ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            ) : (
              <p className="text-sm text-gray-500">
                This brief does not have any content to display.
              </p>
            )}
          </div>
        </article>

        {/* CTA */}
        <div className="mt-10 rounded-xl border border-blue-200 bg-blue-50 p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900">
            Get your own free weekly brief
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Connect your Meta ad account and receive an AI-powered performance
            brief every Monday. Free for ecommerce founders and marketing
            leaders.
          </p>
          <a
            href="/register"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Sign Up Free
          </a>
        </div>

        {/* Footer branding */}
        <div className="mt-8 pb-8 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Mail className="h-3.5 w-3.5" />
            Powered by Weekly CMO Brief
          </div>
        </div>
      </main>
    </div>
  );
}
