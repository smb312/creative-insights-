"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { ClientStatus, PlatformName, PlatformAccessStatus } from "@/lib/types";
import { DEFAULT_QUESTIONS } from "@/lib/default-questions";

interface PlatformInput {
  platform: PlatformName;
  status: PlatformAccessStatus;
  notes: string;
  instructions_url: string;
}

interface CreateClientInput {
  name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  status: ClientStatus;
  logo_url: string | null;
  platforms: PlatformInput[];
  invite_email: string | null;
  invite_name: string | null;
}

export async function createClientAction(input: CreateClientInput) {
  const supabase = await createClient();

  // 1. Get current user for agency_contact_id
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Insert client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      primary_contact_name: input.primary_contact_name,
      primary_contact_email: input.primary_contact_email,
      status: input.status,
      logo_url: input.logo_url,
      agency_contact_id: user?.id || null,
    })
    .select()
    .single();

  if (clientError) {
    return { error: clientError.message, clientId: null };
  }

  // 3. Insert platform_access rows
  const platformRows = input.platforms.map((p) => ({
    client_id: client.id,
    platform: p.platform,
    status: p.status,
    notes: p.notes || null,
    instructions_url: p.instructions_url || null,
  }));

  const { error: platformError } = await supabase
    .from("platform_access")
    .insert(platformRows);

  if (platformError) {
    console.error("Platform access error:", platformError);
    // Non-blocking - client was still created
  }

  // 3b. Seed default onboarding questions
  const questionRows = DEFAULT_QUESTIONS.map((q) => ({
    client_id: client.id,
    section: q.section,
    question_key: q.question_key,
    question_text: q.question_text,
    order_index: q.order_index,
  }));

  const { error: questionError } = await supabase
    .from("onboarding_questions")
    .insert(questionRows);

  if (questionError) {
    console.error("Question seeding error:", questionError);
    // Non-blocking - client was still created
  }

  // 4. Invite client user if requested
  if (input.invite_email && input.invite_name) {
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const adminClient = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        );

        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(input.invite_email);

        if (inviteError) {
          console.error("Invite error:", inviteError);
          return {
            error: null,
            clientId: client.id,
            warning: `Client created but invite failed: ${inviteError.message}`,
          };
        }

        if (inviteData?.user) {
          await adminClient.from("users").insert({
            id: inviteData.user.id,
            email: input.invite_email,
            full_name: input.invite_name,
            role: "client",
            client_id: client.id,
          });
        }
      } else {
        return {
          error: null,
          clientId: client.id,
          warning:
            "Client created but invite skipped: service role key not configured.",
        };
      }
    } catch (err) {
      console.error("Invite exception:", err);
      return {
        error: null,
        clientId: client.id,
        warning: "Client created but invite failed unexpectedly.",
      };
    }
  }

  return { error: null, clientId: client.id, warning: null };
}

export async function uploadLogo(formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided", url: null };

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(fileName, file, { upsert: true });

  if (error) {
    return { error: error.message, url: null };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("logos").getPublicUrl(fileName);

  return { error: null, url: publicUrl };
}
