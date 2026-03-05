import Link from "next/link";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  onboarding: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  churned: "bg-gray-100 text-gray-800",
};

export function ClientCard({ client }: { client: Client }) {
  return (
    <Link
      href={`/clients/${client.id}/onboarding`}
      className="block rounded-lg border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{client.name}</h3>
          {client.primary_contact_email && (
            <p className="mt-1 text-sm text-gray-500">
              {client.primary_contact_email}
            </p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
            statusColors[client.status] || statusColors.onboarding
          )}
        >
          {client.status}
        </span>
      </div>
    </Link>
  );
}
