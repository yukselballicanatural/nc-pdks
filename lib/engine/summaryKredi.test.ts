// Klinik/Toplantı çalışma kredisi. Kullanıcı kararı (2026-08-18):
// Klinik + Toplantı net çalışmaya eklenir, Mola + Yemek mola kalır.
import { describe, expect, it } from "vitest";
import {
  getEffectiveMola,
  getNet,
  summary,
  NO_CREDIT,
  type WorkCreditLookup,
} from "./summary";
import { calismaKredisiDk, type TrackerAralik } from "../tracker/araliklar";
import { G_MOLA, G_NET } from "./constants";
import type { ShiftResult } from "./types";
import { shiftKey } from "./calcShifts";

const S = "100";
/** 2026-08-03 Pazartesi → 2026-08-07 Cuma: 5 iş günü. */
const SD = new Date(Date.UTC(2026, 7, 3));
const ED = new Date(Date.UTC(2026, 7, 7));

const NO_COR = { get: () => undefined };
const NO_SE = { getStartDate: () => null, getEndDate: () => null };

const t = (gun: number, h: number, m = 0) => new Date(Date.UTC(2026, 7, gun, h, m));

/**
 * Tek günlük vardiya: net dakika + turnike dışı bir boşluk.
 * brut = net + bosluk, böylece mola = brut - net = bosluk olur.
 */
function shiftsWithGap(gun: number, net: number, gapBas: Date, gapBit: Date) {
  const bosluk = Math.round((gapBit.getTime() - gapBas.getTime()) / 60000);
  const gs = `${String(gun).padStart(2, "0")}.08.2026`;
  const m = new Map<string, ShiftResult>();
  m.set(shiftKey(S, gs), {
    mg: new Date(Date.UTC(2026, 7, gun)),
    gece: false,
    net,
    brut: net + bosluk,
    mola: bosluk,
    otherMin: 0,
    cnt: 4,
    g: new Date(Date.UTC(2026, 7, gun, 9)),
    c: new Date(Date.UTC(2026, 7, gun, 19)),
    pairs: [],
    outsideIntervals: [[gapBas, gapBit]],
    others: [],
  } as unknown as ShiftResult);
  return { shifts: m, gs };
}

function krediOf(gs: string, dk: number): WorkCreditLookup {
  return { krediDk: (_s, g) => (g === gs ? dk : 0) };
}

const ara = (kod: string, bas: Date, bit: Date | null): TrackerAralik => ({
  kod,
  etiket: kod,
  bas,
  bit,
  bildirilenDk: null,
  basKonum: null,
  bitKonum: null,
});

describe("calismaKredisiDk — hangi türler çalışma sayılır", () => {
  const dis: [Date, Date][] = [[t(3, 11, 20), t(3, 12, 0)]]; // 40 dakikalık boşluk

  it("Klinik çalışma sayılır", () => {
    expect(calismaKredisiDk(dis, [ara("clinic", t(3, 11, 20), t(3, 12, 0))])).toBe(40);
  });

  it("Toplantı çalışma sayılır", () => {
    expect(calismaKredisiDk(dis, [ara("meeting", t(3, 11, 20), t(3, 12, 0))])).toBe(40);
  });

  it("Mola çalışma SAYILMAZ", () => {
    expect(calismaKredisiDk(dis, [ara("break", t(3, 11, 20), t(3, 12, 0))])).toBe(0);
  });

  it("Yemek çalışma SAYILMAZ", () => {
    expect(calismaKredisiDk(dis, [ara("launch", t(3, 11, 20), t(3, 12, 0))])).toBe(0);
  });

  it("bilinmeyen yeni bir tür güvenli tarafta kalır — çalışma sayılmaz", () => {
    expect(calismaKredisiDk(dis, [ara("dentist", t(3, 11, 20), t(3, 12, 0))])).toBe(0);
  });

  it("yalnızca turnike DIŞI boşlukla çakışan kısım sayılır (çift sayma imkânsız)", () => {
    // Toplantı 11:00-13:00 ama boşluk yalnızca 11:20-12:00.
    expect(calismaKredisiDk(dis, [ara("meeting", t(3, 11, 0), t(3, 13, 0))])).toBe(40);
  });

  it("boşluk dışında kalan bildirim hiç sayılmaz", () => {
    expect(calismaKredisiDk(dis, [ara("clinic", t(3, 14, 0), t(3, 15, 0))])).toBe(0);
  });

  it("kapanmamış bildirim sayılmaz — süresi bilinmiyor", () => {
    expect(calismaKredisiDk(dis, [ara("clinic", t(3, 11, 20), null)])).toBe(0);
  });

  it("Klinik + Toplantı birlikte toplanır, Mola dışarıda kalır", () => {
    const uzun: [Date, Date][] = [[t(3, 11, 0), t(3, 12, 0)]];
    const aralar = [
      ara("clinic", t(3, 11, 0), t(3, 11, 20)),
      ara("meeting", t(3, 11, 20), t(3, 11, 40)),
      ara("break", t(3, 11, 40), t(3, 12, 0)),
    ];
    expect(calismaKredisiDk(uzun, aralar)).toBe(40);
  });

  it("bildirim yoksa kredi sıfır", () => {
    expect(calismaKredisiDk(dis, [])).toBe(0);
  });
});

describe("getNet / getEffectiveMola kredi ile", () => {
  const { shifts, gs } = shiftsWithGap(3, 400, t(3, 11, 20), t(3, 12, 0)); // net 400, boşluk 40

  it("kredi verilmezse davranış birebir eskisi gibi", () => {
    expect(getNet(S, gs, shifts, NO_COR)).toBe(400);
    expect(getNet(S, gs, shifts, NO_COR, NO_CREDIT)).toBe(400);
    expect(getEffectiveMola(S, gs, shifts, NO_COR)).toBe(40);
  });

  it("kredi nete eklenir, mola aynı miktarda azalır", () => {
    const k = krediOf(gs, 40);
    expect(getNet(S, gs, shifts, NO_COR, k)).toBe(440);
    expect(getEffectiveMola(S, gs, shifts, NO_COR, k)).toBe(0);
  });

  it("net brütü aşamaz, mola negatife düşmez", () => {
    const k = krediOf(gs, 9999);
    expect(getNet(S, gs, shifts, NO_COR, k)).toBe(440); // brut = 400 + 40
    expect(getEffectiveMola(S, gs, shifts, NO_COR, k)).toBe(0);
  });

  it("elle düzeltme varsa kredi UYGULANMAZ — yöneticinin değeri son söz", () => {
    const cor = { get: () => ({ sicil: S, tarih: gs, yeni: 420 }) };
    const k = krediOf(gs, 40);
    expect(getNet(S, gs, shifts, cor, k)).toBe(420);
    expect(getEffectiveMola(S, gs, shifts, cor, k)).toBe(20); // 440 brüt - 420
  });

  it("vardiyası olmayan güne kredi düşmez", () => {
    const k = krediOf("04.08.2026", 60);
    expect(getNet(S, "04.08.2026", shifts, NO_COR, k)).toBe(0);
  });
});

describe("summary kredi ile", () => {
  it("kredi eksik saati azaltır", () => {
    // 1 gün çalışılmış (400dk), 40dk klinik. Gereken 5 gün.
    const { shifts, gs } = shiftsWithGap(3, 400, t(3, 11, 20), t(3, 12, 0));

    const krediyle = summary(S, SD, ED, shifts, NO_COR, NO_SE, false, undefined, krediOf(gs, 40));
    const kredisiz = summary(S, SD, ED, shifts, NO_COR, NO_SE, false);

    expect(kredisiz.net).toBe(400);
    expect(krediyle.net).toBe(440);
    // Eksik tam olarak kredi kadar azalmalı.
    expect(kredisiz.eksik - krediyle.eksik).toBe(40);
    // Gereken gün sayısı DEĞİŞMEZ — kredi günü değil süreyi etkiler.
    expect(krediyle.bg).toBe(kredisiz.bg);
    expect(krediyle.bek).toBe(5 * G_NET);
  });

  it("kredi mola toplamını da azaltır", () => {
    const { shifts, gs } = shiftsWithGap(3, 400, t(3, 11, 20), t(3, 12, 0));
    const krediyle = summary(S, SD, ED, shifts, NO_COR, NO_SE, false, undefined, krediOf(gs, 25));
    const kredisiz = summary(S, SD, ED, shifts, NO_COR, NO_SE, false);
    expect(kredisiz.mola - krediyle.mola).toBe(25);
  });

  it("brüt toplam kredi ile DEĞİŞMEZ — süre hanesi değişiyor, süre değil", () => {
    const { shifts, gs } = shiftsWithGap(3, 400, t(3, 11, 20), t(3, 12, 0));
    const krediyle = summary(S, SD, ED, shifts, NO_COR, NO_SE, false, undefined, krediOf(gs, 40));
    const kredisiz = summary(S, SD, ED, shifts, NO_COR, NO_SE, false);
    expect(krediyle.total).toBe(kredisiz.total);
    expect(krediyle.total).toBe(440);
  });

  it("kredi yoksa sonuç eski hesapla birebir aynı", () => {
    const { shifts } = shiftsWithGap(3, 400, t(3, 11, 20), t(3, 12, 0));
    const a = summary(S, SD, ED, shifts, NO_COR, NO_SE, false);
    const b = summary(S, SD, ED, shifts, NO_COR, NO_SE, false, undefined, NO_CREDIT);
    expect(b).toEqual(a);
  });

  it("iş kuralı sabitleri değişmedi", () => {
    expect(G_NET).toBe(450);
    expect(G_MOLA).toBe(90);
  });
});
