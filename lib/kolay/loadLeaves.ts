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
import { fetchKolayLeaves, KolayError, type KolayLeave } from "./client";
import { buildKolayIndex, matchKolayPerson, type KolayMatchKind } from "./match";
import { fetchKolayPersonsCache } from "../db/queries/kolayPersons";
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
  /** Kolay'ın kendi saydığı iş günü sayısı. */
  kolayGun: number | null;
  ucretli: boolean | null;
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
  return l.type?.name?.trim() || "Bilinmiyor";
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

  // Kolay personeli ÖNBELLEKTEN okunur (canlı API her sayfa açılışında çok yavaş).
  // Önbellek boşsa eşleştirme yapılamaz; kullanıcı "Kolay İK ile Eşitle" çalıştırmalı.
  const cache = await fetchKolayPersonsCache();
  const people = cache.map((p) => ({ id: p.kolayId, firstName: p.ad, lastName: p.soyad }));
  const personHata: string | null =
    cache.length === 0
      ? "Kolay İK personel önbelleği boş — Takımlar sayfasından \"Kolay İK ile Eşitle\" çalıştırın."
      : null;

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
      const kolayId = l.person?.id ?? "";
      const sicil = kolayId ? (sicilByKolayId.get(kolayId) ?? null) : null;
      const p = sicil ? personByS.get(sicil) : undefined;
      // Kolay izin kaydı kişiyi tek parça `name` alanıyla veriyor.
      const adSoyad = p ? `${p.ad} ${p.soyad}`.trim() : (l.person?.name ?? "").trim() || "(bilinmiyor)";
      return {
        sicil,
        adSoyad,
        kolayId,
        eslesme: sicil ? (kolayIdBySicil.get(sicil)?.kind ?? null) : null,
        tur: leaveTypeName(l),
        baslangic: dayPart(l.startDate) ?? "",
        bitis: dayPart(l.endDate) ?? "",
        durum: l.status ?? "approved",
        kolayGun: typeof l.usedDays === "string" ? Number(l.usedDays) || null : (l.usedDays ?? null),
        ucretli: l.isPaid ?? null,
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
