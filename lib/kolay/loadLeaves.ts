// İzin verisinin PDKS ile birleştirilmesi.
//
// AMAÇ: "eksik saat" tablosunda izinli günler cezalandırılmamalı. Kişi onaylı
// yıllık/ücretsiz/babalık izninde olduğu bir günde turnikeden geçmemiş olur ve
// şu an bu gün "hiç gelmemiş" sayılıyor. İzin kayıtları geldiğinde o günleri
// işaretleyip eksik hesabından ayırabiliyoruz.
//
// ÖNEMLİ: Burada PDKS'in çalışma süresi hesabı DEĞİŞTİRİLMİYOR. İzin bilgisi
// yalnızca ek bir işaret olarak sunuluyor — net/brüt dakikalar, eksik saat
// formülü ve iş kuralı sabitleri olduğu gibi kalıyor. İzinli günlerin eksik
// hesabından düşülmesi ayrı bir karar ve kullanıcı onayı gerektirir.
import "server-only";
import { cache } from "react";
import { fetchKolayLeaves, fetchKolayPeople, KolayError, type KolayLeave } from "./client";
import { buildKolayIndex, matchKolayPerson, type KolayMatchKind } from "./match";
import { fetchPersonnel } from "../db/queries/materialized";
import { addDays, formatGs } from "../engine/mesaiGunu";
import { parseDateParam } from "../engine/tz";

export interface LeaveRecord {
  sicil: string | null;
  adSoyad: string;
  kolayId: string;
  eslesme: KolayMatchKind | null;
  tur: string;
  baslangic: string;
  bitis: string;
  durum: string;
  /** İzne denk gelen vardiya günleri (dd.MM.yyyy) — PDKS ile kesiştirmek için. */
  gunler: string[];
}

export interface LeavesData {
  /** İzin uç noktası çalışıyor mu? */
  kullanilabilir: boolean;
  /** Yetki eksikse true — token'da leave/list izni açılmalı. */
  yetkiEksik: boolean;
  hata: string | null;
  kayitlar: LeaveRecord[];
  /** Kolay'daki aktif çalışan sayısı (person/list izni var). */
  kolayKisiSayisi: number;
  /** PDKS satış personelinden Kolay'da karşılığı bulunanlar. */
  eslesen: number;
  eslesmeyen: number;
  /** Zayıf (kısmi) eşleşmeler — gözden geçirilmeli. */
  kismiEslesen: number;
  /** sicil -> izinli vardiya günleri kümesi. */
  izinliGunler: Map<string, Set<string>>;
}

function leaveTypeName(l: KolayLeave): string {
  if (typeof l.leaveType === "string") return l.leaveType;
  return l.leaveType?.name ?? l.leaveTypeName ?? "Bilinmiyor";
}

/** "2026-08-03 09:00:00" / "2026-08-03" -> "2026-08-03" */
function dayPart(s: string | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s.trim());
  return m ? m[1] : null;
}

/** İzin aralığının kapsadığı günleri dd.MM.yyyy listesine çevirir. */
function expandDays(l: KolayLeave): string[] {
  const a = dayPart(l.startDate);
  const b = dayPart(l.endDate) ?? a;
  if (!a || !b) return [];
  const sd = parseDateParam(a);
  const ed = parseDateParam(b);
  if (!sd || !ed || ed < sd) return [];

  const out: string[] = [];
  // Aşırı uzun kayıtlara karşı üst sınır (veri hatası koruması).
  for (let d = sd, i = 0; d <= ed && i < 400; d = addDays(d, 1), i++) {
    out.push(formatGs(d));
  }
  return out;
}

export const loadLeavesData = cache(async function loadLeavesData(
  sdParam: string,
  edParam: string
): Promise<LeavesData> {
  const personByS = await fetchPersonnel();

  let people: Awaited<ReturnType<typeof fetchKolayPeople>> = [];
  let personHata: string | null = null;
  try {
    people = await fetchKolayPeople(true);
  } catch (e) {
    personHata = e instanceof Error ? e.message : "Kolay İK okunamadı";
  }

  const index = buildKolayIndex(people);
  const kolayIdBySicil = new Map<string, { id: string; kind: KolayMatchKind }>();
  const sicilByKolayId = new Map<string, string>();
  let eslesen = 0;
  let kismiEslesen = 0;

  for (const p of personByS.values()) {
    const hit = matchKolayPerson(p.ad, p.soyad, index);
    if (!hit) continue;
    kolayIdBySicil.set(p.sicil, { id: hit.person.id, kind: hit.kind });
    if (!sicilByKolayId.has(hit.person.id)) sicilByKolayId.set(hit.person.id, p.sicil);
    eslesen++;
    if (hit.kind === "isim_kismi") kismiEslesen++;
  }

  let kayitlar: LeaveRecord[] = [];
  let kullanilabilir = false;
  let yetkiEksik = false;
  let hata: string | null = personHata;

  try {
    const raw = await fetchKolayLeaves({ sd: sdParam, ed: edParam, status: "approved" });
    kullanilabilir = true;
    kayitlar = raw.map((l) => {
      const kolayId = l.personId ?? l.person?.id ?? "";
      const sicil = kolayId ? (sicilByKolayId.get(kolayId) ?? null) : null;
      const p = sicil ? personByS.get(sicil) : undefined;
      const adSoyad = p
        ? `${p.ad} ${p.soyad}`.trim()
        : `${l.person?.firstName ?? ""} ${l.person?.lastName ?? ""}`.trim() || "(bilinmiyor)";
      return {
        sicil,
        adSoyad,
        kolayId,
        eslesme: sicil ? (kolayIdBySicil.get(sicil)?.kind ?? null) : null,
        tur: leaveTypeName(l),
        baslangic: dayPart(l.startDate) ?? "",
        bitis: dayPart(l.endDate) ?? "",
        durum: l.status ?? "approved",
        gunler: expandDays(l),
      };
    });
  } catch (e) {
    hata = e instanceof Error ? e.message : "İzin listesi okunamadı";
    yetkiEksik = e instanceof KolayError && e.kind === "yetki";
  }

  const izinliGunler = new Map<string, Set<string>>();
  for (const k of kayitlar) {
    if (!k.sicil) continue;
    const set = izinliGunler.get(k.sicil) ?? new Set<string>();
    for (const g of k.gunler) set.add(g);
    izinliGunler.set(k.sicil, set);
  }

  return {
    kullanilabilir,
    yetkiEksik,
    hata,
    kayitlar,
    kolayKisiSayisi: people.length,
    eslesen,
    eslesmeyen: personByS.size - eslesen,
    kismiEslesen,
    izinliGunler,
  };
});
