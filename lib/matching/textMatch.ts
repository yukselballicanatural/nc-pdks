// zoho_users eşleştirmesi: birincil anahtar sicil_no == raw.Employment_No.
// Employment_No boş olan ~129 satış danışmanı için fallback: normalize edilmiş
// original_agent_name == normalize edilmiş PDKS ad+soyad (kullanıcı kararı — bkz.
// sohbet: "şimdilik isim eşleştirmeyle ilerle"). original_agent_name = kişinin
// gerçek adı (zoho_users.full_name ise şirket-içi takma isim, farklı bir şey).
import { textNorm } from "../engine/textNorm";

export interface ZohoUserRow {
  id: string;
  full_name: string | null;
  original_agent_name: string | null;
  email: string | null;
  start_date: string | null;
  raw: { Employment_No?: string | number | null } | null;
}

export interface ZohoMatchResult {
  zohoId: string;
  matchedBy: "employment_no" | "name";
}

/**
 * sicil_no -> zoho_users eşleşmesi. Önce Employment_No (birebir), sonra
 * normalize edilmiş isim (fallback) denenir. Eşleşme yoksa undefined.
 */
export function buildZohoMatchIndex(
  zohoUsers: ZohoUserRow[]
): { byEmploymentNo: Map<string, ZohoUserRow>; byName: Map<string, ZohoUserRow> } {
  const byEmploymentNo = new Map<string, ZohoUserRow>();
  const byName = new Map<string, ZohoUserRow>();
  for (const u of zohoUsers) {
    const emp = u.raw?.Employment_No;
    if (emp !== null && emp !== undefined && emp !== "") {
      byEmploymentNo.set(String(emp), u);
    }
    const nameKey = textNorm(u.original_agent_name ?? "");
    if (nameKey) byName.set(nameKey, u);
  }
  return { byEmploymentNo, byName };
}

export function matchZohoUser(
  sicil: string,
  ad: string,
  soyad: string,
  index: { byEmploymentNo: Map<string, ZohoUserRow>; byName: Map<string, ZohoUserRow> }
): (ZohoUserRow & ZohoMatchResult) | undefined {
  const byEmp = index.byEmploymentNo.get(String(sicil));
  if (byEmp) return { ...byEmp, zohoId: byEmp.id, matchedBy: "employment_no" };

  const nameKey = textNorm(`${ad} ${soyad}`.trim());
  const byName = index.byName.get(nameKey);
  if (byName) return { ...byName, zohoId: byName.id, matchedBy: "name" };

  return undefined;
}
