import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form-client";

export default async function PublicOnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up client by onboarding token
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, onboarding_completed_at")
    .eq("onboarding_token", token)
    .single();

  // Token not found
  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            Link not found
          </h1>
          <p className="text-lg text-gray-500">
            This onboarding link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  // Fetch questions, existing responses, and platform access in parallel
  const [responsesRes, questionsRes, platformRes] = await Promise.all([
    supabase
      .from("onboarding_responses")
      .select("question_key, response_text")
      .eq("client_id", client.id),
    supabase
      .from("onboarding_questions")
      .select("id, question_key, question_text, section, order_index")
      .eq("client_id", client.id)
      .eq("is_active", true)
      .order("section")
      .order("order_index"),
    supabase
      .from("platform_access")
      .select("platform, status, notes")
      .eq("client_id", client.id),
  ]);

  const responseMap: Record<string, string> = {};
  (responsesRes.data || []).forEach((r) => {
    if (r.response_text) {
      responseMap[r.question_key] = r.response_text;
    }
  });

  const platformAccess = (platformRes.data || []).map((p) => ({
    platform: p.platform as string,
    status: p.status as string,
    notes: (p.notes as string) || "",
  }));

  return (
    <OnboardingForm
      clientId={client.id}
      clientName={client.name}
      token={token}
      questions={questionsRes.data || []}
      initialResponses={responseMap}
      initialPlatformAccess={platformAccess}
      isCompleted={!!client.onboarding_completed_at}
    />
  );
}
