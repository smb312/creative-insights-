"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

interface Creative {
  adId: string;
  adName: string;
  creative: {
    id: string;
    format: string;
    title: string | null;
    body: string | null;
    imageUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
  campaign: { name: string; id: string };
  adSet: { name: string; id: string };
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpm: number;
    cpa: number | null;
    roas: number | null;
  };
}

interface CreativeTableProps {
  creatives: Creative[];
  title: string;
  type: "top" | "bottom" | "fatigued";
}

export function CreativeTable({ creatives, title, type }: CreativeTableProps) {
  const variant =
    type === "top" ? "success" : type === "bottom" ? "danger" : "warning";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={variant}>
            {creatives.length} creative{creatives.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {creatives.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No creatives to display
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">
                    Creative
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">
                    Format
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    Spend
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    Impressions
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    CTR
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    CPM
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    ROAS
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">
                    Conv.
                  </th>
                </tr>
              </thead>
              <tbody>
                {creatives.map((creative) => (
                  <tr
                    key={creative.adId}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {creative.creative?.thumbnailUrl ||
                        creative.creative?.imageUrl ? (
                          <img
                            src={
                              creative.creative.thumbnailUrl ||
                              creative.creative.imageUrl || ""
                            }
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            Ad
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">
                            {creative.adName}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {creative.campaign.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant="info">
                        {creative.creative?.format || "N/A"}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      {formatCurrency(creative.metrics.spend)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {formatNumber(creative.metrics.impressions)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {formatPercent(creative.metrics.ctr)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {formatCurrency(creative.metrics.cpm)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {creative.metrics.roas !== null
                        ? `${creative.metrics.roas.toFixed(2)}x`
                        : "—"}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {formatNumber(creative.metrics.conversions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
