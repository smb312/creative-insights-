import { createClient } from "@/lib/supabase/server";
import { ClientCard } from "@/components/client-card";
import { DashboardHeader } from "@/components/dashboard-header";
import { StatusFilter } from "@/components/status-filter";
import type { Client } from "@/lib/types";

export interface ClientWithCompletion extends Client {
  onboarding_completion: number;
  agency_contact_name: string | null;
}

function computeCompletion(
  answeredCount: number,
  verifiedCount: number,
  hasAssets: boolean
): number {
  const score =
    (answeredCount / 27) * 0.6 +
    (verifiedCount / 6) * 0.25 +
    (hasAssets ? 1 : 0) * 0.15;
  return Math.round(score * 100);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch clients with related data for completion calculation
  const { data: clients, error } = await supabase
    .from("clients")
    .select(`
      *,
      onboarding_responses ( id, response_text ),
      platform_access ( id, status ),
      assets ( id ),
      agency_contact:users!clients_agency_contact_id_fkey ( full_name )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientsWithCompletion: ClientWithCompletion[] = (clients || []).map((client: any) => {
    const answeredCount = (client.onboarding_responses || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.response_text !== null && r.response_text !== ""
    ).length;

    const verifiedCount = (client.platform_access || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.status === "verified"
    ).length;

    const hasAssets = (client.assets || []).length > 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onboarding_responses, platform_access, assets, agency_contact, ...clientData } = client;

    return {
      ...clientData,
      onboarding_completion: computeCompletion(answeredCount, verifiedCount, hasAssets),
      agency_contact_name: agency_contact?.full_name || null,
    } as ClientWithCompletion;
  });

  const statusFilter = params.status || "all";
  const filtered =
    statusFilter === "all"
      ? clientsWithCompletion
      : clientsWithCompletion.filter((c) => c.status === statusFilter);

  const counts = {
    all: clientsWithCompletion.length,
    onboarding: clientsWithCompletion.filter((c) => c.status === "onboarding").length,
    active: clientsWithCompletion.filter((c) => c.status === "active").length,
    churned: clientsWithCompletion.filter((c) => c.status === "churned").length,
  };

  return (
    <div>
      <DashboardHeader clientCount={counts.all} />
      <StatusFilter currentStatus={statusFilter} counts={counts} />

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">
            {statusFilter === "all"
              ? "No clients yet. Add your first client to get started."
              : `No ${statusFilter} clients found.`}
          </p>
        </div>
      )}
    </div>
  );
}
