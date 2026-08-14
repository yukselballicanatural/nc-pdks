// İzin kuralı: ücretli izin eksik saat doğurmaz, ücretsiz izin doğurur.
// Kullanıcı kararı (2026-08-14).
import { describe, expect, it } from "vitest";
import { getMissingDays, summary, NO_LEAVE, type LeaveLookup } from "./summary";
import { G_NET } from "./constants";
import type { ShiftResult } from "./types";
import { shiftKey } from "./calcShifts";

/** 2026-08-03 Pazartesi → 2026-08-07 Cuma: 5 iş günü. */
const SD = new Date(Date.UTC(2026, 7, 3));
const ED = new Date(Date.UTC(2026, 7, 7));
/** 2026-08-08 Cumartesi. */
const CUMARTESI = new Date(Date.UTC(2026, 7, 8));

const NO_COR = { get: () => undefined };
const NO_SE = { getStartDate: () => null, getEndDate: () => null };

/** Verilen günlerde tam gün çalışılmış vardiya haritası. */
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

function leaveOf(ucretli: string[], ucretsiz: string[]): LeaveLookup {
  return {
    ucretliIzinli: (_s, gs) => ucretli.includes(gs),
    ucretsizIzinli: (_s, gs) => ucretsiz.includes(gs),
  };
}

const S = "100";

describe("izin kuralı — gereken gün", () => {
  it("izin verisi yokken davranış değişmez (5 iş günü beklenir)", () => {
    const r = summary(S, SD, ED, shiftsOf(S, []), NO_COR, NO_SE, false);
    expect(r.bg).toBe(5);
    expect(r.bek).toBe(5 * G_NET);
    expect(r.eksik).toBe(5 * G_NET);
    expect(r.izinliGun).toBe(0);
  });

  it("NO_LEAVE ile açık çağrı da aynı sonucu verir", () => {
    const a = summary(S, SD, ED, shiftsOf(S, []), NO_COR, NO_SE, false);
    const b = summary(S, SD, ED, shiftsOf(S, []), NO_COR, NO_SE, false, NO_LEAVE);
    expect(b).toEqual(a);
  });

  it("ücretli izin gereken günden düşülür, eksik yazmaz", () => {
    // 5 iş gününün tamamı yıllık izin → hiç eksik olmamalı.
    const gunler = ["03.08.2026", "04.08.2026", "05.08.2026", "06.08.2026", "07.08.2026"];
    const r = summary(S, SD, ED, shiftsOf(S, []), NO_COR, NO_SE, false, leaveOf(gunler, []));
    expect(r.izinliGun).toBe(5);
    expect(r.bg).toBe(0);
    expect(r.eksik).toBe(0);
  });

  it("ücretsiz izin gereken günde kalır, eksik yazar", () => {
    const gunler = ["03.08.2026", "04.08.2026"];
    const r = summary(S, SD, ED, shiftsOf(S, []), NO_COR, NO_SE, false, leaveOf([], gunler));
    expect(r.ucretsizIzinGun).toBe(2);
    expect(r.izinliGun).toBe(0);
    expect(r.bg).toBe(5); // hiçbiri düşülmedi
    expect(r.eksik).toBe(5 * G_NET);
  });

  it("ücretli ve ücretsiz izin bir arada doğru ayrılır", () => {
    const r = summary(
      S,
      SD,
      ED,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      false,
      leaveOf(["03.08.2026", "04.08.2026"], ["05.08.2026"])
    );
    expect(r.izinliGun).toBe(2);
    expect(r.ucretsizIzinGun).toBe(1);
    expect(r.bg).toBe(3); // 5 - 2 ücretli
    expect(r.eksik).toBe(3 * G_NET);
  });

  it("izinli olmasına rağmen geldiyse gün normal sayılır", () => {
    // 03.08 hem izinli hem çalışılmış: gereken günde kalmalı, net sayılmalı.
    const r = summary(
      S,
      SD,
      ED,
      shiftsOf(S, ["03.08.2026"]),
      NO_COR,
      NO_SE,
      false,
      leaveOf(["03.08.2026"], [])
    );
    expect(r.izinliGun).toBe(0);
    expect(r.bg).toBe(5);
    expect(r.cg).toBe(1);
    expect(r.net).toBe(G_NET);
    expect(r.eksik).toBe(4 * G_NET);
  });

  it("cumartesi izni hiçbir şeyi değiştirmez — hafta sonu zaten gereken güne girmiyor", () => {
    const sd = SD;
    const ed = CUMARTESI;
    const izinsiz = summary(S, sd, ed, shiftsOf(S, []), NO_COR, NO_SE, false);
    const cumartesiIzinli = summary(
      S,
      sd,
      ed,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      false,
      leaveOf(["08.08.2026"], [])
    );
    expect(izinsiz.bg).toBe(5);
    expect(cumartesiIzinli.bg).toBe(5);
    expect(cumartesiIzinli.eksik).toBe(izinsiz.eksik);
    expect(cumartesiIzinli.izinliGun).toBe(0);
  });
});

describe("izin kuralı — eksik gün listesi", () => {
  it("ücretli izin günü 'ucretli' olarak işaretlenir", () => {
    const m = getMissingDays(
      S,
      SD,
      ED,
      shiftsOf(S, []),
      NO_COR,
      NO_SE,
      leaveOf(["03.08.2026"], ["04.08.2026"])
    );
    expect(m.find((x) => x.gs === "03.08.2026")?.izin).toBe("ucretli");
    expect(m.find((x) => x.gs === "04.08.2026")?.izin).toBe("ucretsiz");
    expect(m.find((x) => x.gs === "05.08.2026")?.izin).toBeNull();
  });

  it("izin verisi yokken hepsi null kalır", () => {
    const m = getMissingDays(S, SD, ED, shiftsOf(S, []), NO_COR, NO_SE);
    expect(m).toHaveLength(5);
    expect(m.every((x) => x.izin === null)).toBe(true);
  });
});
