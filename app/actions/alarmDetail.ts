"use server";

import { getSession } from "@/lib/auth/session";
import { loadPdksData } from "@/lib/data/loadPdks";
import { addDays, formatGs, formatHms, mesaiGunu } from "@/lib/engine/mesaiGunu";
import { readerDirection } from "@/lib/engine/textNorm";
import { parseDateParam, utcIsoToWallClock } from "@/lib/engine/tz";
import { fetchRawRowsForPerson } from "@/lib/db/queries/rawEvents";
import type { AlarmDayRecord } from "@/components/alarm/AlarmTable";

const ALAN_ADI = { work: "Çalışma", break: "Mola/Dışı", ignore: "Yoksayılan" } as const;

/**
 * Alarm detay modalı için o kişinin o vardiya gününe ait tüm geçiş kayıtları
 * (_show_alarm_detail portu). Talep üzerine ve yalnızca tek kişi/tek gün için
 * ham veriden okunur — küçük ve hızlı bir sorgu.
 */
export async function getAlarmDayRecordsAction(
  sicil: string,
  tarih: string, // dd.MM.yyyy (vardiya günü)
  sd: string,
  ed: string
): Promise<{ ok: true; records: AlarmDayRecord[] } | { ok: false; error: string }> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Oturum bulunamadı.");

    const data = await loadPdksData({ sd, ed });

    // TL modunda sadece kendi takımının kaydını görebilir.
    if (data.tlFilter && data.personByS.get(sicil)?.unvan !== data.tlFilter) {
      throw new Error("Bu kayda erişim yetkiniz yok.");
    }

    const [dd, mm, yyyy] = tarih.split(".");
    const gun = parseDateParam(`${yyyy}-${mm}-${dd}`);
    if (!gun) throw new Error("Tarih okunamadı.");

    // Gece vardiyası bir sonraki günün sabahına taşabilir; ±pay ile çekip filtreliyoruz.
    const gece = data.isGece(sicil);
    const rows = await fetchRawRowsForPerson(sicil, gun, addDays(gun, 2));

    const records: AlarmDayRecord[] = rows
      .map((r) => ({ r, dt: utcIsoToWallClock(r.event_time) }))
      .filter(({ dt }) => formatGs(mesaiGunu(dt, gece)) === tarih)
      .map(({ r, dt }) => {
        const dir = readerDirection(r.giris_kapisi);
        return {
          saat: formatHms(dt),
          okuyucu: r.giris_kapisi,
          alan: ALAN_ADI[data.readerConfig.getArea(r.giris_kapisi)],
          yon: dir === "in" ? "Giriş" : dir === "out" ? "Çıkış" : "-",
        };
      });

    return { ok: true, records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}
