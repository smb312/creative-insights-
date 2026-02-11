"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyTrend {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpm: number;
}

interface PerformanceChartProps {
  data: DailyTrend[];
  metric: "spend" | "impressions" | "clicks" | "conversions" | "ctr" | "cpm";
  title: string;
}

const metricConfig: Record<
  string,
  { color: string; label: string; formatter: (v: number) => string }
> = {
  spend: {
    color: "#3b82f6",
    label: "Spend ($)",
    formatter: (v) => `$${v.toFixed(2)}`,
  },
  impressions: {
    color: "#8b5cf6",
    label: "Impressions",
    formatter: (v) => v.toLocaleString(),
  },
  clicks: {
    color: "#10b981",
    label: "Clicks",
    formatter: (v) => v.toLocaleString(),
  },
  conversions: {
    color: "#f59e0b",
    label: "Conversions",
    formatter: (v) => v.toLocaleString(),
  },
  ctr: {
    color: "#ef4444",
    label: "CTR (%)",
    formatter: (v) => `${v.toFixed(2)}%`,
  },
  cpm: {
    color: "#06b6d4",
    label: "CPM ($)",
    formatter: (v) => `$${v.toFixed(2)}`,
  },
};

export function PerformanceChart({
  data,
  metric,
  title,
}: PerformanceChartProps) {
  const config = metricConfig[metric];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
            No data available for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => {
                  const d = new Date(value);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => config.formatter(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value) => [
                  config.formatter(Number(value)),
                  config.label,
                ]}
                labelFormatter={(label) => {
                  const d = new Date(label);
                  return d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name={config.label}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
