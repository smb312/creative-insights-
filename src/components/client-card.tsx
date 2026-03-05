import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

const statusColors: Record<string, string> = {
  onboarding: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  churned: "bg-gray-100 text-gray-600",
};

export function ClientCard({ client }: { client: Client }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {client.name}
          </h3>
          {client.primary_contact_email && (
            <p className="mt-1 text-xs text-gray-500">
              {client.primary_contact_email}
            </p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
            statusColors[client.status] ?? statusColors.onboarding
          )}
        >
          {client.status}
        </span>
      </div>
    </div>
  );
}
