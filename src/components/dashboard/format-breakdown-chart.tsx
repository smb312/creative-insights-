"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormatBreakdown {
  [format: string]: {
    count: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
}

const COLORS = {
  STATIC: "#3b82f6",
  VIDEO: "#8b5cf6",
  CAROUSEL: "#10b981",
  UNKNOWN: "#94a3b8",
};

export function FormatBreakdownChart({ data }: { data: FormatBreakdown }) {
  const chartData = Object.entries(data).map(([format, metrics]) => ({
    format,
    ...metrics,
    ctr: metrics.impressions > 0
      ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2)
      : "0",
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
            No format data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Performance by Format</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="format"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
            />
            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              formatter={(value, name) => {
                const v = Number(value);
                if (name === "spend") return [`$${v.toFixed(2)}`, "Spend"];
                return [v.toLocaleString(), name];
              }}
            />
            <Bar dataKey="spend" name="Spend" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.format}
                  fill={COLORS[entry.format as keyof typeof COLORS] || COLORS.UNKNOWN}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {chartData.map((item) => (
            <div key={item.format} className="text-center">
              <div
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{
                  backgroundColor:
                    COLORS[item.format as keyof typeof COLORS] || COLORS.UNKNOWN,
                }}
              />
              <p className="text-xs font-medium text-gray-700">
                {item.format}
              </p>
              <p className="text-xs text-gray-500">
                {item.count} creative{item.count !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
