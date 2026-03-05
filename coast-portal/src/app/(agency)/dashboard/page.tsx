import { createClient } from "@/lib/supabase/server";
import { ClientCard } from "@/components/client-card";
import type { Client } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
      </div>

      {clients && clients.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(clients as Client[]).map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">
            No clients yet. Add your first client to get started.
          </p>
        </div>
      )}
    </div>
  );
}
