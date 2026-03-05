import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatusFilterProps {
  currentStatus: string;
  counts: {
    all: number;
    onboarding: number;
    active: number;
    churned: number;
  };
}

const tabs = [
  { key: "all", label: "All" },
  { key: "onboarding", label: "Onboarding" },
  { key: "active", label: "Active" },
  { key: "churned", label: "Churned" },
] as const;

export function StatusFilter({ currentStatus, counts }: StatusFilterProps) {
  return (
    <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "all" ? "/dashboard" : `/dashboard?status=${tab.key}`}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentStatus === tab.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          {tab.label}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-xs",
              currentStatus === tab.key
                ? "bg-gray-100 text-gray-700"
                : "text-gray-500"
            )}
          >
            {counts[tab.key]}
          </span>
        </Link>
      ))}
    </div>
  );
}
