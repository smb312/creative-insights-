"use server";

import { createClient } from "@/lib/supabase/server";

export async function savePublicResponse(input: {
  clientId: string;
  section: "performance" | "creative";
  questionKey: string;
  questionText: string;
  responseText: string;
}) {
  const supabase = await createClient();

  // Check if response already exists
  const { data: existing } = await supabase
    .from("onboarding_responses")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("question_key", input.questionKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("onboarding_responses")
      .update({
        response_text: input.responseText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("onboarding_responses").insert({
      client_id: input.clientId,
      section: input.section,
      question_key: input.questionKey,
      question_text: input.questionText,
      response_text: input.responseText,
    });

    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function markOnboardingComplete(clientId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", clientId);

  if (error) return { error: error.message };
  return { error: null };
}
