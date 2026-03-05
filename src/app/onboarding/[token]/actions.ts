"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function savePublicResponse(input: {
  clientId: string;
  section: "performance" | "creative";
  questionKey: string;
  questionText: string;
  responseText: string;
}) {
  const supabase = await createClient();

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

export async function savePlatformAccess(input: {
  clientId: string;
  platform: string;
  status: string;
  notes: string;
}) {
  const supabase = await createClient();

  // Check if platform access record exists
  const { data: existing } = await supabase
    .from("platform_access")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("platform", input.platform)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("platform_access")
      .update({
        status: input.status,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("platform_access").insert({
      client_id: input.clientId,
      platform: input.platform,
      status: input.status,
      notes: input.notes,
    });

    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function uploadAssetFile(formData: FormData) {
  const clientId = formData.get("clientId") as string;
  const category = formData.get("category") as string;
  const file = formData.get("file") as File;

  if (!clientId || !category || !file) {
    return { error: "Missing required fields" };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: "Service role key not configured" };
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // Ensure assets bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === "assets");
  if (!bucketExists) {
    await supabase.storage.createBucket("assets", { public: true });
  }

  const filePath = `${clientId}/${category}/${file.name}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("assets")
    .getPublicUrl(filePath);

  // Find or create asset folder for this category
  let folderId: string | null = null;
  const { data: existingFolder } = await supabase
    .from("asset_folders")
    .select("id")
    .eq("client_id", clientId)
    .eq("name", category)
    .maybeSingle();

  if (existingFolder) {
    folderId = existingFolder.id;
  } else {
    const { data: newFolder } = await supabase
      .from("asset_folders")
      .insert({ client_id: clientId, name: category })
      .select("id")
      .single();
    if (newFolder) folderId = newFolder.id;
  }

  // Save metadata to assets table
  const { error: metaError } = await supabase.from("assets").insert({
    client_id: clientId,
    folder_id: folderId,
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_type: file.type,
    file_size: file.size,
  });

  if (metaError) return { error: metaError.message };

  return {
    error: null,
    asset: {
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
    },
  };
}

export async function removeAssetFile(input: {
  clientId: string;
  category: string;
  fileName: string;
}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: "Service role key not configured" };
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  const filePath = `${input.clientId}/${input.category}/${input.fileName}`;

  // Remove from storage
  await supabase.storage.from("assets").remove([filePath]);

  // Remove metadata
  await supabase
    .from("assets")
    .delete()
    .eq("client_id", input.clientId)
    .eq("file_name", input.fileName);

  return { error: null };
}
