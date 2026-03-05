"use server";

import { createClient } from "@/lib/supabase/server";

export async function fetchOnboardingData(clientId: string) {
  const supabase = await createClient();

  const [clientRes, responsesRes, platformsRes, assetsRes, userRes] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase
        .from("onboarding_responses")
        .select("*")
        .eq("client_id", clientId),
      supabase.from("platform_access").select("*").eq("client_id", clientId),
      supabase
        .from("assets")
        .select("id")
        .eq("client_id", clientId)
        .limit(1),
      supabase.auth.getUser(),
    ]);

  return {
    client: clientRes.data,
    responses: responsesRes.data || [],
    platforms: platformsRes.data || [],
    hasAssets: (assetsRes.data || []).length > 0,
    userId: userRes.data.user?.id || null,
  };
}

export async function upsertOnboardingResponse(input: {
  clientId: string;
  section: "performance" | "creative";
  questionKey: string;
  questionText: string;
  responseText: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try update first
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
        updated_by: user?.id || null,
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
      updated_by: user?.id || null,
    });

    if (error) return { error: error.message };
  }

  // Fetch updated row with user name
  const { data: updated } = await supabase
    .from("onboarding_responses")
    .select("*, updater:users!onboarding_responses_updated_by_fkey(full_name)")
    .eq("client_id", input.clientId)
    .eq("question_key", input.questionKey)
    .maybeSingle();

  return { error: null, data: updated };
}

export async function updatePlatformAccess(input: {
  id: string;
  field: "status" | "notes" | "instructions_url";
  value: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("platform_access")
    .update({
      [input.field]: input.value,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  const { data: updated } = await supabase
    .from("platform_access")
    .select("*, updater:users!platform_access_updated_by_fkey(full_name)")
    .eq("id", input.id)
    .maybeSingle();

  return { error: null, data: updated };
}

export async function fetchUserNames(userIds: string[]) {
  if (userIds.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", userIds);

  const map: Record<string, string> = {};
  (data || []).forEach((u) => {
    if (u.full_name) map[u.id] = u.full_name;
  });
  return map;
}
