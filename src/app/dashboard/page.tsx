"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Share2,
  FileText,
  RefreshCw,
  CheckCircle,
  Sparkles,
  Loader2,
  Target,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { PacingResult } from "@/lib/pacing";
import MarketingTimeline from "@/components/marketing-timeline";

interface Brief {
  id: string;
  subjectLine: string | null;
  bottomLine: string | null;
  briefMarkdown: string | null;
  briefHtml: string | null;
  weekStart: string;
  weekEnd: string;
  briefDate: string;
  shareToken: string;
  createdAt: string;
}

/**
 * Parses a subset of Markdown into HTML for brief rendering.
 * Handles: headings (##), bold (**), bullet lists (-), and simple pipe tables.
 */
function parseMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Close open list if this line isn't a bullet
    if (inList && !line.match(/^\s*-\s/)) {
      html.push("</ul>");
      inList = false;
    }

    // Table rows (lines starting with |)
    if (line.trim().startsWith("|")) {
      // Skip separator rows like |---|---|
      if (line.trim().match(/^\|[\s\-:|]+\|$/)) {
        continue;
      }

      const cells = line
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        html.push(
          '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse text-sm">'
        );
        // First row becomes header
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

    // Close table if we were in one
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

  // Close any open structures
  if (inList) html.push("</ul>");
  if (inTable) html.push("</tbody></table></div>");

  return html.join("\n");
}

/** Handle inline formatting: bold, italic, inline code */
function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono">$1</code>');
}

export default function DashboardPage() {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<"brief" | "link" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pacing, setPacing] = useState<PacingResult | null>(null);

  const fetchPacing = useCallback(async () => {
    try {
      const res = await fetch("/api/pacing");
      if (res.ok) {
        const data = await res.json();
        setPacing(data.pacing ?? null);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchLatestBrief = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/briefs/latest");
      if (!res.ok) throw new Error("Failed to fetch brief");
      const data = await res.json();
      setBrief(data.brief ?? null);
    } catch (err) {
      console.error("Error fetching brief:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestBrief();
    fetchPacing();
  }, [fetchLatestBrief, fetchPacing]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/briefs/generate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate brief");
      }
      await fetchLatestBrief();
    } catch (err) {
      console.error("Error generating brief:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to generate brief. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyBrief = async () => {
    if (!brief?.briefMarkdown) return;
    try {
      await navigator.clipboard.writeText(brief.briefMarkdown);
      setCopied("brief");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for environments without clipboard API
      console.error("Failed to copy to clipboard");
    }
  };

  const handleShareLink = async () => {
    if (!brief?.shareToken) return;
    const url = `${window.location.origin}/brief/${brief.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("link");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      console.error("Failed to copy share link");
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }
      setSyncResult({
        success: true,
        message: `Synced ${data.totalAdsProcessed} ads successfully.`,
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err instanceof Error ? err.message : "Sync failed. Please try again.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    return `${format(new Date(start), "MMM d")} - ${format(new Date(end), "MMM d, yyyy")}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading your brief...</p>
        </div>
      </div>
    );
  }

  // Empty state - no brief yet
  if (!brief) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-full bg-blue-50 p-4">
              <FileText className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              No briefs yet
            </h2>
            <p className="mb-6 max-w-md text-gray-500">
              Your first Weekly CMO Brief will be generated automatically each
              Monday. You can also generate one now to see how it works with your
              current ad data.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                loading={generating}
                onClick={handleGenerate}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate My First Brief
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={handleSync}
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Syncing Ad Data...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
              {syncResult && (
                <p
                  className={`text-sm ${syncResult.success ? "text-green-600" : "text-red-600"}`}
                >
                  {syncResult.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Brief exists - render it
  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {brief.subjectLine ?? "Weekly Brief"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateRange(brief.weekStart, brief.weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={handleSync}
          >
            {syncing ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Sync Now
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={generating}
            onClick={handleGenerate}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Generate Brief Now
          </Button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            syncResult.success
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {syncResult.message}
        </div>
      )}

      {/* Marketing Timeline */}
      <MarketingTimeline />

      {/* Pacing card */}
      <PacingCard pacing={pacing} onGoToSettings={() => router.push("/dashboard/settings")} />

      {/* Brief content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Your Brief</CardTitle>
              <Badge variant="info">
                {format(new Date(brief.briefDate), "MMM d, yyyy")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bottom line summary */}
          {brief.bottomLine && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">
                {brief.bottomLine}
              </p>
            </div>
          )}

          {/* Rendered markdown */}
          {brief.briefMarkdown && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: parseMarkdown(brief.briefMarkdown),
              }}
            />
          )}

          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap gap-3 border-t border-gray-100 pt-6">
            <Button variant="outline" size="sm" onClick={handleCopyBrief}>
              {copied === "brief" ? (
                <>
                  <CheckCircle className="mr-1.5 h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Brief
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareLink}>
              {copied === "link" ? (
                <>
                  <CheckCircle className="mr-1.5 h-4 w-4 text-green-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Share2 className="mr-1.5 h-4 w-4" />
                  Share Link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pacing Card                                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({
  value,
  expected,
  color,
}: {
  value: number; // 0-1
  expected: number; // 0-1 (where the pace marker should be)
  color: "green" | "yellow" | "red";
}) {
  const barColor = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  }[color];

  const clamped = Math.min(Math.max(value, 0), 1);
  const clampedExpected = Math.min(Math.max(expected, 0), 1);

  return (
    <div className="relative h-2.5 w-full rounded-full bg-gray-100">
      <div
        className={`h-2.5 rounded-full ${barColor} transition-all duration-300`}
        style={{ width: `${clamped * 100}%` }}
      />
      {/* Pace marker */}
      <div
        className="absolute top-0 h-2.5 w-0.5 bg-gray-400"
        style={{ left: `${clampedExpected * 100}%` }}
        title={`Expected: ${(clampedExpected * 100).toFixed(0)}%`}
      />
    </div>
  );
}

function getBarColor(actual: number, expected: number): "green" | "yellow" | "red" {
  const ratio = expected > 0 ? actual / expected : 1;
  if (ratio >= 0.9) return "green";
  if (ratio >= 0.8) return "yellow";
  return "red";
}

function getSpendBarColor(actual: number, expected: number): "green" | "yellow" | "red" {
  const ratio = expected > 0 ? actual / expected : 1;
  // For spend, being over budget is bad
  if (ratio > 1.1) return "red";
  if (ratio > 1.0) return "yellow";
  return "green";
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ahead: { label: "AHEAD", color: "text-green-700 bg-green-100" },
  on_track: { label: "ON TRACK", color: "text-green-700 bg-green-100" },
  at_risk: { label: "AT RISK", color: "text-yellow-700 bg-yellow-100" },
  behind: { label: "BEHIND", color: "text-red-700 bg-red-100" },
};

function PacingCard({
  pacing,
  onGoToSettings,
}: {
  pacing: PacingResult | null;
  onGoToSettings: () => void;
}) {
  if (!pacing) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2">
              <Target className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Set your monthly targets to see pacing
              </p>
              <p className="text-xs text-gray-500">
                Track revenue, spend, and efficiency against your goals.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onGoToSettings}>
            <Settings className="mr-1.5 h-4 w-4" />
            Go to Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = STATUS_LABELS[pacing.overallStatus] ?? STATUS_LABELS.on_track;
  const fmtCurrency = (n: number) =>
    "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const fmtPct = (n: number) => (n * 100).toFixed(0) + "%";

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-gray-600" />
            <CardTitle>{pacing.monthName} {new Date().getFullYear()} Pacing</CardTitle>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Revenue */}
          {pacing.revenuePacing && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">Revenue</span>
                <span className="font-medium text-gray-900">
                  {fmtCurrency(pacing.revenuePacing.actual)} /{" "}
                  {fmtCurrency(pacing.revenuePacing.goal)}{" "}
                  <span className="text-gray-400 font-normal">
                    {fmtPct(pacing.revenuePacing.percentAchieved)}
                  </span>
                </span>
              </div>
              <ProgressBar
                value={pacing.revenuePacing.percentAchieved}
                expected={pacing.percentMonthElapsed}
                color={getBarColor(
                  pacing.revenuePacing.percentAchieved,
                  pacing.percentMonthElapsed
                )}
              />
            </div>
          )}

          {/* Ad Spend */}
          {pacing.spendPacing && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">Ad Spend</span>
                <span className="font-medium text-gray-900">
                  {fmtCurrency(pacing.spendPacing.spent)} /{" "}
                  {fmtCurrency(pacing.spendPacing.budget)}{" "}
                  <span className="text-gray-400 font-normal">
                    {fmtPct(pacing.spendPacing.percentSpent)}
                  </span>
                </span>
              </div>
              <ProgressBar
                value={pacing.spendPacing.percentSpent}
                expected={pacing.percentMonthElapsed}
                color={getSpendBarColor(
                  pacing.spendPacing.percentSpent,
                  pacing.percentMonthElapsed
                )}
              />
            </div>
          )}

          {/* Orders */}
          {pacing.orderPacing && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-600">Orders</span>
                <span className="font-medium text-gray-900">
                  {pacing.orderPacing.actual} / {pacing.orderPacing.goal}{" "}
                  <span className="text-gray-400 font-normal">
                    {fmtPct(pacing.orderPacing.percentAchieved)}
                  </span>
                </span>
              </div>
              <ProgressBar
                value={pacing.orderPacing.percentAchieved}
                expected={pacing.percentMonthElapsed}
                color={getBarColor(
                  pacing.orderPacing.percentAchieved,
                  pacing.percentMonthElapsed
                )}
              />
            </div>
          )}

          {/* ROAS */}
          {pacing.efficiencyPacing.actualRoas != null &&
            pacing.efficiencyPacing.targetRoas != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">ROAS</span>
                <span className="font-medium text-gray-900">
                  {pacing.efficiencyPacing.actualRoas.toFixed(1)}x{" "}
                  <span className="text-gray-400 font-normal">
                    (target: {pacing.efficiencyPacing.targetRoas}x)
                  </span>
                  {(pacing.efficiencyPacing.roasVsTarget ?? 0) >= 0 ? (
                    <CheckCircle className="ml-1.5 inline h-4 w-4 text-green-500" />
                  ) : (
                    <span className="ml-1.5 text-xs text-red-500">
                      {((pacing.efficiencyPacing.roasVsTarget ?? 0)).toFixed(2)}x
                    </span>
                  )}
                </span>
              </div>
            )}

          {/* CPA */}
          {pacing.efficiencyPacing.actualCpa != null &&
            pacing.efficiencyPacing.targetCpa != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">CPA</span>
                <span className="font-medium text-gray-900">
                  ${pacing.efficiencyPacing.actualCpa.toFixed(0)}{" "}
                  <span className="text-gray-400 font-normal">
                    (target: ${pacing.efficiencyPacing.targetCpa})
                  </span>
                  {(pacing.efficiencyPacing.cpaVsTarget ?? 0) >= 0 ? (
                    <CheckCircle className="ml-1.5 inline h-4 w-4 text-green-500" />
                  ) : (
                    <span className="ml-1.5 text-xs text-red-500">
                      +${Math.abs(pacing.efficiencyPacing.cpaVsTarget ?? 0).toFixed(0)}
                    </span>
                  )}
                </span>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
          Day {pacing.daysElapsed} of {pacing.daysInMonth} &mdash;{" "}
          {fmtPct(pacing.percentMonthElapsed)} of month elapsed
        </div>
      </CardContent>
    </Card>
  );
}
