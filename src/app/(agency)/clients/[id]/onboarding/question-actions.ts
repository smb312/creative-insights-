"use server";

import { createClient } from "@/lib/supabase/server";

export interface OnboardingQuestion {
  id: string;
  client_id: string;
  section: "performance" | "creative";
  question_text: string;
  question_key: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export async function fetchQuestions(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("onboarding_questions")
    .select("*")
    .eq("client_id", clientId)
    .order("section")
    .order("order_index");

  if (error) return { error: error.message, data: null };
  return { error: null, data: data as OnboardingQuestion[] };
}

export async function updateQuestionText(id: string, questionText: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("onboarding_questions")
    .update({ question_text: questionText })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function toggleQuestionActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("onboarding_questions")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteQuestion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("onboarding_questions")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function addQuestion(input: {
  clientId: string;
  section: "performance" | "creative";
  questionText: string;
  orderIndex: number;
}) {
  const supabase = await createClient();

  // Generate a question key based on section and order
  const prefix = input.section === "performance" ? "perf" : "creative";
  const key = `${prefix}_custom_${Date.now()}`;

  const { data, error } = await supabase
    .from("onboarding_questions")
    .insert({
      client_id: input.clientId,
      section: input.section,
      question_key: key,
      question_text: input.questionText,
      order_index: input.orderIndex,
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { error: null, data: data as OnboardingQuestion };
}

export async function reorderQuestions(
  updates: { id: string; order_index: number }[]
) {
  const supabase = await createClient();

  // Update each question's order_index
  const promises = updates.map(({ id, order_index }) =>
    supabase
      .from("onboarding_questions")
      .update({ order_index })
      .eq("id", id)
  );

  const results = await Promise.all(promises);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };
  return { error: null };
}
