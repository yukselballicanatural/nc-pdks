// Zorunlu Cumartesi kuralı: TL'ye bağlı satış personeli her 2 Cumartesi'den
// birinde çalışmak zorunda. Kullanıcı kararı (2026-08-20).
import { describe, expect, it } from "vitest";
import { getMissingDays, summary } from "./summary";
import { zorunluCumartesi } from "./mesaiGunu";
import { G_NET } from "./constants";
import type { ShiftResult } from "./types";
import { shiftKey } from "./calcShifts";

const NO_COR = { get: () => undefined };
const NO_SE = { getStartDate: () => null, getEndDate: () => null };
const S = "100";

// 15.08.2026 Cumartesi = ZORUNLU (referansa göre); 08.08.2026 Cumartesi = SERBEST.
const ZORUNLU_CMT = new Date(Date.UTC(2026, 7, 15));
const SERBEST_CMT = new Date(Date.UTC(2026, 7, 8));

function shiftsOf(sicil: string, gunler: string[]): Map<string, ShiftResult> {
  const m = new Map<string, ShiftResult>();
  for (const gs of gunler) {
    const d = new Date(Date.UTC(2026, 7, Number(gs.slice(0, 2))));
    m.set(shiftKey(sicil, gs), {
      mg: d,
      gece: false,
      net: G_NET,
      brut: G_NET + 90,
      mola: 90,
      otherMin: 0,
      cnt: 2,
      g: d,
      c: d,
      pairs: [],
      outsideIntervals: [],
      others: [],
    } as unknown as ShiftResult);
  }
  return m;
}

describe("zorunluCumartesi (takvim parite hesabı)", () => {
  it("Cumartesi olmayan bir gün asla zorunlu değildir", () => {
    expect(zorunluCumartesi(new Date(Date.UTC(2026, 7, 14)))).toBe(false); // Cuma
  });

  it("referansa göre çift/tek hafta alternatif gider", () => {
    expect(zorunluCumartesi(ZORUNLU_CMT)).toBe(true);
    expect(zorunluCumartesi(SERBEST_CMT)).toBe(false);
    expect(zorunluCumartesi(new Date(Date.UTC(2026, 7, 22)))).toBe(false);
    expect(zorunluCumartesi(new Date(Date.UTC(2026, 7, 29)))).toBe(true);
  });
});

describe("summary / getMissingDays — cumartesiZorunlu bayrağı", () => {
  it("bayrak false ise (varsayılan) davranış eskisiyle birebir aynı — Cumartesi hiç gereken güne girmez", () => {
    const r = summary(S, ZORUNLU_CMT, ZORUNLU_CMT, shiftsOf(S, []), NO_COR, NO_SE, false);
    expect(r.bg).toBe(0);
    const m = getMissingDays(S, ZORUNLU_CMT, ZORUNLU_CMT, shiftsOf(S, []), NO_COR, NO_SE);
    expect(m).toHaveLength(0);
  });

  it("TL'siz (bayrak false) kişi zorunlu paritede de çalışmasa eksik yazmaz", () => {
    const r = summary(
      S,
      ZORUNLU_CMT,
      ZORUNLU_CMT,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      false,
      undefined,
      undefined,
      false
    );
    expect(r.bg).toBe(0);
    expect(r.eksik).toBe(0);
  });

  it("bayrak true + ZORUNLU Cumartesi + çalışılmamış → eksik gün ve eksik saat yazar", () => {
    const r = summary(
      S,
      ZORUNLU_CMT,
      ZORUNLU_CMT,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      false,
      undefined,
      undefined,
      true
    );
    expect(r.bg).toBe(1);
    expect(r.bek).toBe(G_NET);
    expect(r.eksik).toBe(G_NET);

    const m = getMissingDays(
      S,
      ZORUNLU_CMT,
      ZORUNLU_CMT,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      undefined,
      undefined,
      true
    );
    expect(m).toHaveLength(1);
    expect(m[0].zorunluCumartesi).toBe(true);
    expect(m[0].izin).toBeNull();
  });

  it("bayrak true + SERBEST Cumartesi + çalışılmamış → eksik YAZMAZ", () => {
    const r = summary(
      S,
      SERBEST_CMT,
      SERBEST_CMT,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      false,
      undefined,
      undefined,
      true
    );
    expect(r.bg).toBe(0);
    expect(r.eksik).toBe(0);
  });

  it("bayrak true + ZORUNLU Cumartesi'de ÇALIŞILMIŞ → eksik yazmaz, gün normal sayılır", () => {
    const gs = "15.08.2026";
    const r = summary(
      S,
      ZORUNLU_CMT,
      ZORUNLU_CMT,
      shiftsOf(S, [gs]),
      NO_COR,
      NO_SE,
      false,
      undefined,
      undefined,
      true
    );
    expect(r.bg).toBe(1);
    expect(r.eksik).toBe(0);
    expect(r.cg).toBe(1);

    const m = getMissingDays(
      S,
      ZORUNLU_CMT,
      ZORUNLU_CMT,
      shiftsOf(S, [gs]),
      NO_COR,
      NO_SE,
      undefined,
      undefined,
      true
    );
    expect(m).toHaveLength(0);
  });
});
