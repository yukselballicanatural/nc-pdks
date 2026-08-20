// Pazar/hafta sonu çalışması eksik saat DOĞURMAMALI + resmi tatil/bayram
// arefesi kuralları. Kullanıcı kararı (2026-08-20).
import { describe, expect, it } from "vitest";
import { getMissingDays, summary } from "./summary";
import { G_NET } from "./constants";
import type { ShiftResult } from "./types";
import { shiftKey } from "./calcShifts";

const NO_COR = { get: () => undefined };
const NO_SE = { getStartDate: () => null, getEndDate: () => null };
const S = "100";

function shiftWithNet(sicil: string, gs: string, net: number): Map<string, ShiftResult> {
  const d = new Date(Date.UTC(2026, 7, Number(gs.slice(0, 2))));
  const m = new Map<string, ShiftResult>();
  m.set(shiftKey(sicil, gs), {
    mg: d,
    gece: false,
    net,
    brut: net,
    mola: 0,
    otherMin: 0,
    cnt: 2,
    g: d,
    c: d,
    pairs: [],
    outsideIntervals: [],
    others: [],
  } as unknown as ShiftResult);
  return m;
}

describe("Pazar günü çalışması — eksik saat doğurmaz, fazlayı azaltır", () => {
  // 23.08.2026 Pazar.
  const PAZAR = new Date(Date.UTC(2026, 7, 23));

  it("Pazar hiç gereken güne girmez, çalışılmasa da eksik yazmaz", () => {
    const r = summary(S, PAZAR, PAZAR, shiftWithNet(S, "23.08.2026", 0), NO_COR, NO_SE, false);
    expect(r.bg).toBe(0);
    expect(r.eksik).toBe(0);
  });

  it("Pazar 2-3 saat çalışılsa da (7:30'un altında) eksik YAZMAZ — sadece net'e eklenir", () => {
    const r = summary(S, PAZAR, PAZAR, shiftWithNet(S, "23.08.2026", 150), NO_COR, NO_SE, false);
    expect(r.bg).toBe(0); // gereken gün hâlâ 0
    expect(r.bek).toBe(0); // beklenen hâlâ 0
    // eksik = bek - net = 0 - 150 = -150: NEGATİF, yani "fazla" — asla pozitif
    // (eksik) olmaz. 150dk < 450dk (G_NET) olsa da bu gün için ceza yok.
    expect(r.eksik).toBeLessThanOrEqual(0);
    expect(r.eksik).toBe(-150);
    expect(r.net).toBe(150); // ama net'e ekleniyor — genel eksiği azaltır
  });

  it("Pazar çalışması genel dönem eksiğini azaltır (haftaiçi eksikle birlikte)", () => {
    // Pazar dahil 2 günlük dönem: Cumartesi... hayır, Cuma (haftaiçi, hiç
    // çalışılmamış, 450dk eksik) + Pazar (150dk çalışılmış, gereken değil).
    const CUMA = new Date(Date.UTC(2026, 7, 21));
    const shifts = shiftWithNet(S, "23.08.2026", 150);
    const r = summary(S, CUMA, PAZAR, shifts, NO_COR, NO_SE, false);
    expect(r.bg).toBe(1); // sadece Cuma gereken
    expect(r.bek).toBe(G_NET);
    expect(r.net).toBe(150); // Pazar'ın net'i toplama giriyor
    expect(r.eksik).toBe(G_NET - 150); // Pazar çalışması eksiği azaltıyor
  });

  it("getMissingDays Pazar'ı asla eksik gün olarak listelemez", () => {
    const m = getMissingDays(S, PAZAR, PAZAR, shiftWithNet(S, "23.08.2026", 0), NO_COR, NO_SE);
    expect(m).toHaveLength(0);
  });
});

describe("Resmi tatil — kimse eksik yazmaz", () => {
  // 29.10.2026 Perşembe, Cumhuriyet Bayramı.
  const TATIL = new Date(Date.UTC(2026, 9, 29));

  it("hafta içi bir güne denk gelen resmi tatilde çalışılmasa da eksik yazmaz", () => {
    const r = summary(S, TATIL, TATIL, shiftWithNet(S, "29.10.2026", 0), NO_COR, NO_SE, false);
    expect(r.bg).toBe(0);
    expect(r.eksik).toBe(0);
  });

  it("getMissingDays resmi tatili eksik gün olarak listelemez", () => {
    const m = getMissingDays(S, TATIL, TATIL, shiftWithNet(S, "29.10.2026", 0), NO_COR, NO_SE);
    expect(m).toHaveLength(0);
  });

  it("resmi tatilde çalışılırsa net'e eklenir, eksiği azaltır", () => {
    const r = summary(S, TATIL, TATIL, shiftWithNet(S, "29.10.2026", 200), NO_COR, NO_SE, false);
    expect(r.net).toBe(200);
    expect(r.eksik).toBeLessThanOrEqual(0); // asla pozitif (eksik) olmaz
  });
});

describe("Bayram arefesi — yarım gün beklenir", () => {
  // 19.03.2026 Perşembe, Ramazan Bayramı arefesi.
  const AREFE = new Date(Date.UTC(2026, 2, 19));

  it("beklenen tam günün yarısıdır, çalışılmazsa eksik gün sayılır", () => {
    const r = summary(S, AREFE, AREFE, shiftWithNet(S, "19.03.2026", 0), NO_COR, NO_SE, false);
    expect(r.bg).toBe(1);
    expect(r.bek).toBe(G_NET / 2);
    expect(r.eksik).toBe(G_NET / 2);

    const m = getMissingDays(S, AREFE, AREFE, shiftWithNet(S, "19.03.2026", 0), NO_COR, NO_SE);
    expect(m).toHaveLength(1);
    expect(m[0].oran).toBe(0.5);
  });

  it("yarım gün kadar çalışılırsa eksik kalmaz", () => {
    const r = summary(S, AREFE, AREFE, shiftWithNet(S, "19.03.2026", G_NET / 2), NO_COR, NO_SE, false);
    expect(r.eksik).toBe(0);
  });
});
