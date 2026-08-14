// Kaynak: pdks_app_stabil_v8_4.py satır 992-1134
// (_alarm_split_events, _alarm_vardiya_recs, detect_alarms, _alarm_uname). Birebir port.
import { ALARM_DEDUP_SN, ALARM_KART_SN } from "./constants";
import { formatHms as fmtHms, mesaiGunu } from "./mesaiGunu";
import { ReaderConfig } from "./readerConfig";
import { readerDirection, readerGate } from "./textNorm";
import type { Alarm, AlarmTipVal, PdksRawEvent } from "./types";
import type { IsGeceFn } from "./calcShifts";

interface WorkEvent {
  dt: Date;
  in: boolean;
  ok: string;
  gate: string;
  idx: number;
}
interface OtherEvent {
  dt: Date;
  ok: string;
  dir: string;
  idx: number;
}

/**
 * Bir vardiya gününün kayıtlarını turnike (yönü belirli) ve turnike-dışı olarak ayırır.
 * calc_shifts ile AYNI tekilleştirme kuralı uygulanır (ALARM_DEDUP_SN).
 */
function alarmSplitEvents(
  recs: PdksRawEvent[],
  readerConfig: ReaderConfig
): { work: WorkEvent[]; other: OtherEvent[] } {
  const work: WorkEvent[] = [];
  const other: OtherEvent[] = [];
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
          (r.dt.getTime() - lastSig.dt.getTime()) / 1000 <= ALARM_DEDUP_SN
        ) {
          continue;
        }
        work.push({ dt: r.dt, in: direction === "in", ok, gate, idx: r.idx });
        lastSig = { sig, dt: r.dt };
        continue;
      }
    }
    other.push({ dt: r.dt, ok, dir: readerDirection(ok), idx: r.idx });
  }
  return { work, other };
}

function alarmVardiyaRecs(
  raw: PdksRawEvent[],
  readerConfig: ReaderConfig,
  isGece: IsGeceFn
): Map<string, { sicil: string; mg: Date; recs: PdksRawEvent[] }> {
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
  return vardiyaRecs;
}


export interface AlarmUnameFn {
  (sicil: string): string;
}

export function detectAlarms(
  raw: PdksRawEvent[],
  readerConfig: ReaderConfig,
  isGece: IsGeceFn,
  alarmUname: AlarmUnameFn
): Alarm[] {
  const alarms: Alarm[] = [];
  const addAlarm = (
    tip: AlarmTipVal,
    sicil: string,
    mg: Date,
    dt: Date,
    ok: string,
    detay: string,
    idx: number | null,
    refDt: Date | null
  ) => {
    alarms.push({ tip, sicil, mg, dt, ok, detay, idx, refDt });
  };

  const vardiyaRecs = alarmVardiyaRecs(raw, readerConfig, isGece);
  const kartPool: (WorkEvent & { sicil: string; mg: Date })[] = [];

  const sortedEntries = [...vardiyaRecs.values()].sort((a, b) => {
    if (a.mg.getTime() !== b.mg.getTime()) return a.mg.getTime() - b.mg.getTime();
    return a.sicil < b.sicil ? -1 : a.sicil > b.sicil ? 1 : 0;
  });

  for (const { sicil, mg, recs: recsUnsorted } of sortedEntries) {
    const recs = [...recsUnsorted].sort((a, b) => a.dt.getTime() - b.dt.getTime());
    const { work, other } = alarmSplitEvents(recs, readerConfig);
    for (const w of work) kartPool.push({ ...w, sicil, mg });

    type StreamEvent =
      | ({ kind: "work" } & WorkEvent)
      | ({ kind: "other" } & OtherEvent);
    const stream: StreamEvent[] = [
      ...work.map((w) => ({ kind: "work" as const, ...w })),
      ...other.map((o) => ({ kind: "other" as const, ...o })),
    ].sort((a, b) => a.dt.getTime() - b.dt.getTime());

    let acikGiris: Date | null = null;
    for (const e of stream) {
      if (e.kind === "work") {
        if (e.in) {
          if (acikGiris === null) {
            acikGiris = e.dt;
          } else {
            addAlarm(
              "TURNIKE_ATLAMA",
              sicil,
              mg,
              e.dt,
              e.ok,
              `${fmtHms(acikGiris)} turnike girisi halen acikken ${fmtHms(e.dt)}'de yeni turnike girisi yapilmis. ` +
                `Aradaki turnike cikis kaydi yok - turnikeden atlayarak cikilmis olabilir.`,
              e.idx,
              acikGiris
            );
            acikGiris = e.dt;
          }
        } else {
          if (acikGiris === null) {
            addAlarm(
              "TURNIKE_ATLAMA",
              sicil,
              mg,
              e.dt,
              e.ok,
              `${fmtHms(e.dt)}'de turnike cikisi var ama oncesinde turnike giris kaydi yok - ` +
                `turnikeden atlayarak girilmis olabilir.`,
              e.idx,
              null
            );
          } else {
            acikGiris = null;
          }
        }
      } else {
        if (acikGiris !== null && e.dir === "out") {
          addAlarm(
            "TURNIKESIZ_CIKIS",
            sicil,
            mg,
            e.dt,
            e.ok,
            `Turnike girisi ${fmtHms(acikGiris)}'de yapilmis, turnikeden cikis yapilmadan ` +
              `${fmtHms(e.dt)}'de '${e.ok}' kapisindan cikilmis.`,
            e.idx,
            acikGiris
          );
        }
      }
    }
  }

  // --- KART_BASMA: zaman sıralı pencere taraması
  kartPool.sort((a, b) => a.dt.getTime() - b.dt.getTime());
  const n = kartPool.length;
  for (let i = 0; i < n; i++) {
    const a = kartPool[i];
    const digerleri: typeof kartPool = [];
    let j = i - 1;
    while (j >= 0 && (a.dt.getTime() - kartPool[j].dt.getTime()) / 1000 <= ALARM_KART_SN) {
      const b = kartPool[j];
      if (b.gate === a.gate && b.in === a.in && b.sicil !== a.sicil) digerleri.push(b);
      j -= 1;
    }
    j = i + 1;
    while (j < n && (kartPool[j].dt.getTime() - a.dt.getTime()) / 1000 <= ALARM_KART_SN) {
      const b = kartPool[j];
      if (b.gate === a.gate && b.in === a.in && b.sicil !== a.sicil) digerleri.push(b);
      j += 1;
    }
    if (digerleri.length === 0) continue;
    digerleri.sort((x, y) => x.dt.getTime() - y.dt.getTime());
    const kim = digerleri.map((b) => `${alarmUname(b.sicil)} (${b.sicil}) ${fmtHms(b.dt)}`).join(", ");
    const yon = a.in ? "Giris" : "Cikis";
    const kapi = a.gate ? `Kapi ${a.gate}` : "kapi belirsiz";
    addAlarm(
      "KART_BASMA",
      a.sicil,
      a.mg,
      a.dt,
      a.ok,
      `${ALARM_KART_SN} sn icinde ayni turnikeden (${kapi}, ${yon}) su kisilerle birlikte gecilmis: ` +
        `${kim}. Tek kisinin birden fazla kart okutmasi olabilir.`,
      a.idx,
      null
    );
  }

  alarms.sort((x, y) => {
    if (x.dt.getTime() !== y.dt.getTime()) return x.dt.getTime() - y.dt.getTime();
    if (x.sicil !== y.sicil) return x.sicil < y.sicil ? -1 : 1;
    return x.tip < y.tip ? -1 : x.tip > y.tip ? 1 : 0;
  });

  return alarms;
}
