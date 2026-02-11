"use client";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, change, trend, icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p
            className={`text-sm mt-1 ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                  ? "text-red-600"
                  : "text-gray-500"
            }`}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
