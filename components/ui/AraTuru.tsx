// Ara türü (Klinik / Toplantı / Mola / Yemek / Mesai) görsel dili — TEK KAYNAK.
//
// NEDEN BURADA: bu eşleme üç ayrı dosyada (Mola Detayı, Günlük Detay, Zaman
// Takip) elle tekrarlanıyordu ve BİRBİRİNDEN FARKLIYDI — "Yemek" bir ekranda
// sarı, diğerinde yeşil görünüyordu. Aynı şeyin ekrandan ekrana renk
// değiştirmesi kullanıcıya "bunlar farklı şeyler" diye yanlış sinyal verir.
//
// Anlamsal gruplama: Klinik/Toplantı İŞ ile ilgili (marka renkleri),
// Mola/Yemek KİŞİSEL (uyarı tonları), Mesai ise çerçeveleyici bilgi.

import { dkp } from "@/lib/format";

/** Ara türü → pill varyant sınıfı. */
const TUR_PILL: Record<string, string> = {
  Klinik: "pill-sky",
  Toplantı: "pill-violet",
  Mola: "pill-warn",
  Yemek: "pill-cyan",
  Mesai: "pill-info",
};

export function araTuruPill(etiket: string): string {
  return TUR_PILL[etiket] ?? "pill-mute";
}

/** Ara türü → {zemin, kenar, metin} token üçlüsü (liste satırları için). */
const TUR_TOKEN: Record<string, { bg: string; edge: string; fg: string }> = {
  Klinik:   { bg: "var(--ac-sky-dim)",    edge: "var(--ac-sky-edge)",    fg: "var(--ac-sky)" },
  Toplantı: { bg: "var(--cl-violet-dim)", edge: "var(--cl-violet-edge)", fg: "var(--cl-violet)" },
  Mola:     { bg: "var(--cl-warn-dim)",   edge: "var(--cl-warn-edge)",   fg: "var(--cl-warn)" },
  Yemek:    { bg: "var(--ac-cyan-dim)",   edge: "var(--ac-cyan-edge)",   fg: "var(--ac-cyan)" },
  Mesai:    { bg: "var(--cl-info-dim)",   edge: "var(--cl-info-edge)",   fg: "var(--cl-info)" },
};

export function araTuruToken(etiket: string) {
  return (
    TUR_TOKEN[etiket] ?? { bg: "var(--sf-2)", edge: "var(--edge-soft)", fg: "var(--tx-secondary)" }
  );
}

/** Tür + süre rozeti — "Klinik 40dk" gibi. */
export function AraRozeti({ etiket, dk }: { etiket: string; dk: number }) {
  return (
    <span className={`pill ${araTuruPill(etiket)}`}>
      {etiket}
      <span className="tabular-nums" style={{ opacity: 0.85 }}>
        {dkp(dk)}
      </span>
    </span>
  );
}
