"use server";

import { getSession } from "@/lib/auth/session";
import { loadPdksData } from "@/lib/data/loadPdks";
import { formatGs, formatHms, mesaiGunu } from "@/lib/engine/mesaiGunu";
import { readerDirection } from "@/lib/engine/textNorm";
import type { AlarmDayRecord } from "@/components/alarm/AlarmTable";

const ALAN_ADI = { work: "Çalışma", break: "Mola/Dışı", ignore: "Yoksayılan" } as const;

/**
 * Alarm detay modalı için o kişinin o vardiya gününe ait tüm geçiş kayıtları
 * (_show_alarm_detail portu). Talep üzerine yüklenir — tüm alarm günlerini
 * sayfayla birlikte göndermek HTML'i megabaytlara çıkarıyordu.
 */
export async function getAlarmDayRecordsAction(
  sicil: string,
  tarih: string,
  sd: string,
  ed: string
): Promise<{ ok: true; records: AlarmDayRecord[] } | { ok: false; error: string }> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Oturum bulunamadı.");

    const data = await loadPdksData({ sd, ed });

    // TL modunda sadece kendi takımının kaydını görebilir.
    if (data.tlFilter && data.personByS.get(sicil)?.takimLideri !== data.tlFilter) {
      throw new Error("Bu kayda erişim yetkiniz yok.");
    }

    const gece = data.isGece(sicil);
    const records: AlarmDayRecord[] = data.events
      .filter((r) => r.sicil === sicil && formatGs(mesaiGunu(r.dt, gece)) === tarih)
      .map((r) => {
        const dir = readerDirection(r.ok);
        return {
          saat: formatHms(r.dt),
          okuyucu: r.ok,
          alan: ALAN_ADI[data.readerConfig.getArea(r.ok)],
          yon: dir === "in" ? "Giriş" : dir === "out" ? "Çıkış" : "-",
        };
      });

    return { ok: true, records };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}
