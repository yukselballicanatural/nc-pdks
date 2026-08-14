import "server-only";
import { supabaseServer } from "../supabaseServer";
import type { ZohoUserRow } from "../../matching/textMatch";

export interface ZohoUserView {
  id: string;
  fullName: string; // şirket içi görünen (takma) isim
  originalAgentName: string; // gerçek isim — PDKS ad/soyad ile eşleşen alan
  employmentNo: string;
  email: string;
  role: string;
  status: string;
  startDate: string | null;
  seniority: string;
  region: string;
}

/** zoho_users tablosunu okur (salt-okunur; Zoho CRM'den senkronize ediliyor). */
export async function fetchZohoUsers(): Promise<{ rows: ZohoUserView[]; raw: ZohoUserRow[] }> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("zoho_users")
    .select("id, full_name, original_agent_name, email, role, status, start_date, seniority_level, region, raw")
    .order("full_name", { ascending: true });
  if (error) throw new Error(`zoho_users okunamadı: ${error.message}`);

  const raw = (data ?? []) as unknown as (ZohoUserRow & {
    email: string | null;
    role: string | null;
    status: string | null;
    seniority_level: string | null;
    region: string | null;
  })[];

  const rows: ZohoUserView[] = raw.map((u) => ({
    id: u.id,
    fullName: u.full_name ?? "",
    originalAgentName: u.original_agent_name ?? "",
    employmentNo: u.raw?.Employment_No != null ? String(u.raw.Employment_No) : "",
    email: u.email ?? "",
    role: u.role ?? "",
    status: u.status ?? "",
    startDate: u.start_date,
    seniority: u.seniority_level ?? "",
    region: u.region ?? "",
  }));

  return { rows, raw };
}
