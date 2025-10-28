import { createClient, SupabaseClient } from "@supabase/supabase-js";

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) throw new Error("missing supabase admin env");
  return createClient(url, key, { auth: { persistSession: false } });
}
