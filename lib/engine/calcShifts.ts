// Kaynak: pdks_app_stabil_v8_4.py satır 1156-1243 (PDKSEngine.calc_shifts). Birebir port.
// "calc_shifts'in kendisi bilinçli olarak değiştirilmemiştir." (ARCHITECTURE.md §2)
import { G_NET, N_NET } from "./constants";
import { calcOtherTotal, type OtherRec } from "./calcOtherTotal";
import { formatGs, mesaiGunu } from "./mesaiGunu";
import { pairGirisCikis } from "./pairGirisCikis";
import { ReaderConfig } from "./readerConfig";
import { readerDirection, readerGate } from "./textNorm";
import type { GirisCikisPair, PdksRawEvent, ShiftResult } from "./types";

export interface IsGeceFn {
  (sicil: string): boolean;
}

/** Sonuç anahtarı: `${sicil}::${gs}` (gs = dd.MM.yyyy). shifts Map'i bu anahtarla tutulur. */
export function shiftKey(sicil: string, gs: string): string {
  return `${sicil}::${gs}`;
}

export function calcShifts(
  raw: PdksRawEvent[],
  readerConfig: ReaderConfig,
  isGece: IsGeceFn
): Map<string, ShiftResult> {
  const byUser = new Map<string, PdksRawEvent[]>();
  for (const r of raw) {
    if (readerConfig.isIgnored(r.ok)) continue;
    const list = byUser.get(r.sicil) ?? [];
    list.push(r);
    byUser.set(r.sicil, list);
  }

  const vardiyaRecs = new Map<string, { sicil: string; mg: Date; recs: PdksRawEvent[] }>();
  for (const [sicil, recsUnsorted] of byUser) {
    const recs = [...recsUnsorted].sort((a, b) => a.dt.getTime() - b.dt.getTime());
    const gece = isGece(sicil);
    for (const r of recs) {
      const mg = mesaiGunu(r.dt, gece);
      const key = `${sicil}::${mg.getTime()}`;
      const entry = vardiyaRecs.get(key);
      if (entry) entry.recs.push(r);
      else vardiyaRecs.set(key, { sicil, mg, recs: [r] });
    }
  }

  const shifts = new Map<string, ShiftResult>();

  for (const { sicil, mg, recs: recsUnsorted } of vardiyaRecs.values()) {
    const recs = [...recsUnsorted].sort((a, b) => a.dt.getTime() - b.dt.getTime());
    if (recs.length === 0) continue;
    const gece = isGece(sicil);
    const std = gece ? N_NET : G_NET;
    const gs = formatGs(mg);

    const workRecs: { dt: Date; in: boolean; ok: string; gate: string }[] = [];
    const otherRecs: OtherRec[] = [];
    let lastSig: { sig: [string, string]; dt: Date } | null = null;

    for (const r of recs) {
      const ok = r.ok;
      if (readerConfig.isWork(ok)) {
        const direction = readerDirection(ok);
        if (direction) {
          const gate = readerGate(ok);
          const sig: [string, string] = [direction, gate];
          if (
            lastSig &&
            lastSig.sig[0] === sig[0] &&
            lastSig.sig[1] === sig[1] &&
            (r.dt.getTime() - lastSig.dt.getTime()) / 1000 <= 60
          ) {
            continue; // aynı yön/aynı turnike 60 sn tekrarında ilk kayıt tutulur
          }
          workRecs.push({ dt: r.dt, in: direction === "in", ok, gate });
          lastSig = { sig, dt: r.dt };
          continue;
        }
        otherRecs.push({ dt: r.dt, ok });
      } else {
        otherRecs.push({ dt: r.dt, ok });
      }
    }

    const pairs: GirisCikisPair[] = pairGirisCikis(workRecs);
    const netMin = pairs.reduce((sum, [g, c]) => sum + (c.getTime() - g.getTime()) / 60000, 0);

    const ilkGiris = recs[0].dt;
    const sonCikis = recs[recs.length - 1].dt;

    const brut = Math.max(0, (sonCikis.getTime() - ilkGiris.getTime()) / 60000);
    const molaMin = Math.max(0, brut - netMin);
    const fark = netMin - std;

    const outsideIntervals: [Date, Date][] = [];
    let cursor = ilkGiris;
    for (const [start, end] of pairs) {
      if (start > cursor) outsideIntervals.push([cursor, start]);
      if (end > cursor) cursor = end;
    }
    if (sonCikis > cursor) outsideIntervals.push([cursor, sonCikis]);

    shifts.set(shiftKey(sicil, gs), {
      g: ilkGiris,
      c: sonCikis,
      gece,
      cnt: recs.length,
      net: netMin,
      brut,
      fark,
      mg,
      mola: molaMin,
      pairs,
      outsideIntervals,
      others: otherRecs,
      otherMin: calcOtherTotal(otherRecs),
    });
  }

  return shifts;
}
