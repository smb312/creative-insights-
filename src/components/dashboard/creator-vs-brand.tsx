"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpm: number;
  cpa: number | null;
  roas: number | null;
}

interface CreatorVsBrandProps {
  creatorCount: number;
  brandCount: number;
  creatorMetrics: Metrics;
  brandMetrics: Metrics;
}

function MetricRow({
  label,
  creatorValue,
  brandValue,
  format = "number",
}: {
  label: string;
  creatorValue: number | null;
  brandValue: number | null;
  format?: "currency" | "number" | "percent" | "roas";
}) {
  const fmt = (v: number | null) => {
    if (v === null) return "—";
    switch (format) {
      case "currency":
        return formatCurrency(v);
      case "percent":
        return formatPercent(v);
      case "roas":
        return `${v.toFixed(2)}x`;
      default:
        return formatNumber(v);
    }
  };

  const creatorWins =
    creatorValue !== null &&
    brandValue !== null &&
    creatorValue > brandValue;
  const brandWins =
    creatorValue !== null &&
    brandValue !== null &&
    brandValue > creatorValue;

  // For CPM and CPA, lower is better
  const lowerIsBetter = label === "CPM" || label === "CPA";
  const creatorBetter = lowerIsBetter ? brandWins : creatorWins;
  const brandBetter = lowerIsBetter ? creatorWins : brandWins;

  return (
    <tr className="border-b border-gray-50">
      <td className="py-3 px-4 text-sm font-medium text-gray-600">{label}</td>
      <td
        className={`py-3 px-4 text-sm text-right font-medium ${
          creatorBetter ? "text-green-700 bg-green-50" : "text-gray-900"
        }`}
      >
        {fmt(creatorValue)}
      </td>
      <td
        className={`py-3 px-4 text-sm text-right font-medium ${
          brandBetter ? "text-green-700 bg-green-50" : "text-gray-900"
        }`}
      >
        {fmt(brandValue)}
      </td>
    </tr>
  );
}

export function CreatorVsBrand({
  creatorCount,
  brandCount,
  creatorMetrics,
  brandMetrics,
}: CreatorVsBrandProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Creator Ads vs Brand Ads
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="info">{creatorCount} creator</Badge>
            <Badge variant="default">{brandCount} brand</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {creatorCount === 0 && brandCount === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No ad data available for comparison
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">
                    Metric
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-blue-600">
                    Creator Ads
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">
                    Brand Ads
                  </th>
                </tr>
              </thead>
              <tbody>
                <MetricRow
                  label="Spend"
                  creatorValue={creatorMetrics.spend}
                  brandValue={brandMetrics.spend}
                  format="currency"
                />
                <MetricRow
                  label="Impressions"
                  creatorValue={creatorMetrics.impressions}
                  brandValue={brandMetrics.impressions}
                />
                <MetricRow
                  label="Clicks"
                  creatorValue={creatorMetrics.clicks}
                  brandValue={brandMetrics.clicks}
                />
                <MetricRow
                  label="CTR"
                  creatorValue={creatorMetrics.ctr}
                  brandValue={brandMetrics.ctr}
                  format="percent"
                />
                <MetricRow
                  label="CPM"
                  creatorValue={creatorMetrics.cpm}
                  brandValue={brandMetrics.cpm}
                  format="currency"
                />
                <MetricRow
                  label="ROAS"
                  creatorValue={creatorMetrics.roas}
                  brandValue={brandMetrics.roas}
                  format="roas"
                />
                <MetricRow
                  label="Conversions"
                  creatorValue={creatorMetrics.conversions}
                  brandValue={brandMetrics.conversions}
                />
                <MetricRow
                  label="CPA"
                  creatorValue={creatorMetrics.cpa}
                  brandValue={brandMetrics.cpa}
                  format="currency"
                />
              </tbody>
            </table>
          </div>
        )}
        {creatorCount === 0 && brandCount > 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            No creator/partnership ads detected. Ads are classified by
            signals like &quot;paid partnership&quot;, @handles, or
            &quot;creator&quot; in the ad name or copy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
