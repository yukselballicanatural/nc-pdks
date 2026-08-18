// time_tracker_events okuma.
//
// Bu tablo, çalışanın kendi bildirdiği durumu tutuyor: işe başlama (checkin),
// çıkış (checkout) ve ara verme (break_start / break_stop). Aranın TÜRÜ ayrı
// kolonda: break / clinic / meeting / launch.
//
// NEDEN DEĞERLİ: turnike verisi kişinin binadan çıktığını gösteriyor ama NEDENİNİ
// göstermiyor. "11:20-12:00 arası 40 dakika turnike dışında" satırının klinikte mi,
// toplantıda mı, yemekte mi geçtiğini ancak bu tablo söyleyebiliyor.
import "server-only";
import { supabaseServer } from "../supabaseServer";
import { isMissingTable } from "./teams";

/** Gözlemlenen olay türleri (canlı veriden doğrulandı). */
export type TrackerOlayTuru = "checkin" | "checkout" | "break_start" | "break_stop";

export interface TrackerEventRow {
  /** Zoho ZUID (aşağıdaki nota bakın) ya da başka bir dış kimlik. */
  userId: string | null;
  userName: string | null;
  /**
   * Tracker uygulamasının kendi personel kodu. DİKKAT: bu PDKS sicili DEĞİL —
   * canlı veride Yüksel Ballıca için "219" yazıyor, gerçek sicili ise 39190.
   * Eşleştirmede kullanılmıyor.
   */
  employeeCode: string | null;
  email: string | null;
  eventType: string;
  /** Ara türü kodu: break | clinic | meeting | launch. */
  breakId: string | null;
  breakName: string | null;
  /** Gerçek UTC zaman damgası (duvar saatine çevrilmeli). */
  occurredAt: string;
  /** break_stop / checkout üzerinde geçen süre — varsa daha güvenilir. */
  elapsedSeconds: number | null;
}

interface DbRow {
  user_id: string | null;
  user_name: string | null;
  employee_code: string | null;
  email: string | null;
  event_type: string | null;
  break_id: string | null;
  break_name: string | null;
  occurred_at: string | null;
  elapsed_seconds: number | null;
}

const SAYFA = 1000;

/**
 * Verilen UTC aralığındaki olayları zaman sırasına göre getirir.
 *
 * @param utcBas UTC ISO alt sınır (dahil)
 * @param utcBit UTC ISO üst sınır (dahil)
 *
 * Tablo yoksa boş liste döner — bu entegrasyon isteğe bağlı, tablosuz kurulumda
 * sayfaların çökmemesi gerekiyor.
 */
export async function fetchTrackerEvents(
  utcBas: string,
  utcBit: string
): Promise<TrackerEventRow[]> {
  const sb = supabaseServer();
  const out: TrackerEventRow[] = [];

  // PostgREST tek istekte en fazla 1000 satır döndürüyor; sayfalayarak okuyoruz.
  for (let sayfa = 0; sayfa < 200; sayfa++) {
    const bas = sayfa * SAYFA;
    const { data, error } = await sb
      .from("time_tracker_events")
      .select(
        "user_id, user_name, employee_code, email, event_type, break_id, break_name, occurred_at, elapsed_seconds"
      )
      .gte("occurred_at", utcBas)
      .lte("occurred_at", utcBit)
      .order("occurred_at", { ascending: true })
      .range(bas, bas + SAYFA - 1);

    if (error) {
      if (isMissingTable(error.message)) return [];
      throw new Error(`time_tracker_events okunamadı: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as DbRow[];
    for (const r of rows) {
      if (!r.occurred_at || !r.event_type) continue;
      out.push({
        userId: r.user_id,
        userName: r.user_name,
        employeeCode: r.employee_code,
        email: r.email,
        eventType: r.event_type,
        breakId: r.break_id,
        breakName: r.break_name,
        occurredAt: r.occurred_at,
        elapsedSeconds: r.elapsed_seconds,
      });
    }
    if (rows.length < SAYFA) break;
  }

  return out;
}
