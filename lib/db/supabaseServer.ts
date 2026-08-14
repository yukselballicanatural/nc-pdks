// Server-only Supabase client (service role key) — RLS bypass, tüm yazma/okuma
// mutasyonları buradan geçer. İstemciye (browser) asla import edilmemeli.
import "server-only";
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function supabaseServer() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env değişkenleri tanımlı değil.");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
