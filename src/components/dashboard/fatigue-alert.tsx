"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FatiguedCreative {
  adId: string;
  adName: string;
  creative: {
    format: string;
    title: string | null;
  } | null;
  recentCtr: { date: string; ctr: number }[];
}

export function FatigueAlert({
  creatives,
}: {
  creatives: FatiguedCreative[];
}) {
  if (creatives.length === 0) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-base text-yellow-800">
            Creative Fatigue Detected
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-yellow-700 mb-4">
          The following creatives show declining CTR over the past 7 days,
          suggesting ad fatigue. Consider refreshing these creatives.
        </p>
        <div className="space-y-3">
          {creatives.map((creative) => (
            <div
              key={creative.adId}
              className="bg-white rounded-lg border border-yellow-200 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {creative.adName}
                </p>
                <span className="text-xs text-gray-500">
                  {creative.creative?.format || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {creative.recentCtr.map((point, i) => {
                  const prev = i > 0 ? creative.recentCtr[i - 1].ctr : point.ctr;
                  const isDecline = point.ctr < prev;
                  return (
                    <div
                      key={point.date}
                      className="flex-1 text-center"
                    >
                      <div
                        className={`text-xs font-mono ${
                          isDecline ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {point.ctr.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(point.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
