import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null | undefined;

export function isSupabaseStorageEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdminClient() {
  if (adminClient !== undefined) {
    return adminClient;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    adminClient = null;
    return adminClient;
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export function getCandidateDocumentsBucket() {
  return process.env.SUPABASE_BUCKET_CANDIDATE_DOCS ?? "candidate-documents";
}

export function getTestTemplatesBucket() {
  return process.env.SUPABASE_BUCKET_TEST_TEMPLATES ?? "test-templates";
}

export async function uploadBufferToSupabase(input: {
  bucket: string;
  objectPath: string;
  buffer: Buffer;
  contentType: string;
}) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase storage is not configured");
  }

  const { error } = await client.storage.from(input.bucket).upload(input.objectPath, input.buffer, {
    contentType: input.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }
}

export async function downloadBufferFromSupabase(bucket: string, objectPath: string) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase storage is not configured");
  }

  const { data, error } = await client.storage.from(bucket).download(objectPath);
  if (error || !data) {
    throw new Error(error?.message ?? "Supabase download failed");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteObjectFromSupabase(bucket: string, objectPath: string) {
  const client = getSupabaseAdminClient();
  if (!client) return;

  await client.storage.from(bucket).remove([objectPath]);
}
