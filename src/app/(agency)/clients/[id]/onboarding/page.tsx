import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";

export default async function ClientOnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientId } = await params;
  const supabase = await createClient();

  // Fetch all data in parallel
  const [clientRes, responsesRes, platformsRes, assetsRes, userRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase
        .from("onboarding_responses")
        .select(
          "*, updater:users!onboarding_responses_updated_by_fkey(full_name)"
        )
        .eq("client_id", clientId),
      supabase
        .from("platform_access")
        .select(
          "*, updater:users!platform_access_updated_by_fkey(full_name)"
        )
        .eq("client_id", clientId),
      supabase
        .from("assets")
        .select("id")
        .eq("client_id", clientId)
        .limit(1),
      supabase.auth.getUser(),
    ]);

  if (!clientRes.data) {
    redirect("/clients");
  }

  return (
    <OnboardingClient
      client={clientRes.data}
      initialResponses={responsesRes.data || []}
      initialPlatforms={platformsRes.data || []}
      hasAssets={(assetsRes.data || []).length > 0}
      userId={userRes.data.user?.id || null}
    />
  );
}
