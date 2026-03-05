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

  // Already completed
  if (client.onboarding_completed_at) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="mb-6 text-5xl">&#127881;</div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            You&apos;re all done!
          </h1>
          <p className="text-lg text-gray-500">
            Thanks for completing the onboarding questionnaire. The Coast
            Digital team will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  // Fetch questions and existing responses in parallel
  const [responsesRes, questionsRes] = await Promise.all([
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
  ]);

  const responseMap: Record<string, string> = {};
  (responsesRes.data || []).forEach((r) => {
    if (r.response_text) {
      responseMap[r.question_key] = r.response_text;
    }
  });

  return (
    <OnboardingForm
      clientId={client.id}
      clientName={client.name}
      token={token}
      questions={questionsRes.data || []}
      initialResponses={responseMap}
    />
  );
}
