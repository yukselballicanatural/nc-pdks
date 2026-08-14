// Server-only Supabase client (service role key) — RLS bypass, tüm okuma/yazma
// buradan geçer. İstemciye (browser) asla import edilmemeli.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Üretilmiş Database tipi yok; şemayı `any` bırakmak yerine tabloları burada
// gevşek tanımlıyoruz ki insert/upsert çağrıları `never` olarak çıkarım yapmasın.
type Row = Record<string, unknown>;
interface LooseSchema {
  public: {
    Tables: {
      [table: string]: {
        Row: Row;
        Insert: Row;
        Update: Row;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let client: SupabaseClient<LooseSchema> | null = null;

export function supabaseServer(): SupabaseClient<LooseSchema> {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env değişkenleri tanımlı değil.");
  }
  client = createClient<LooseSchema>(url, key, { auth: { persistSession: false } });
  return client;
}
