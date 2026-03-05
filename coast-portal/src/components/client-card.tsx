import Link from "next/link";
import Image from "next/image";
import type { ClientWithCompletion } from "@/app/(agency)/dashboard/page";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const statusVariant: Record<string, "onboarding" | "active" | "churned"> = {
  onboarding: "onboarding",
  active: "active",
  churned: "churned",
};

function ClientInitials({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0066FF] text-sm font-semibold text-white">
      {initials}
    </div>
  );
}

export function ClientCard({ client }: { client: ClientWithCompletion }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ClientInitials name={client.name} logoUrl={client.logo_url} />
          <div>
            <h3 className="font-semibold text-gray-900">{client.name}</h3>
            {client.primary_contact_name && (
              <p className="text-sm text-gray-500">{client.primary_contact_name}</p>
            )}
          </div>
        </div>
        <Badge variant={statusVariant[client.status] || "onboarding"} className="capitalize">
          {client.status}
        </Badge>
      </div>

      {client.primary_contact_email && (
        <p className="mt-3 text-sm text-gray-500">{client.primary_contact_email}</p>
      )}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-600">Onboarding</span>
          <span className="font-medium text-gray-900">{client.onboarding_completion}%</span>
        </div>
        <Progress value={client.onboarding_completion} className="h-1.5" />
      </div>

      {client.agency_contact_name && (
        <p className="mt-3 text-xs text-gray-400">
          Managed by {client.agency_contact_name}
        </p>
      )}

      <div className="mt-4">
        <Link href={`/clients/${client.id}/onboarding`}>
          <Button variant="outline" size="sm" className="w-full">
            View
          </Button>
        </Link>
      </div>
    </div>
  );
}
