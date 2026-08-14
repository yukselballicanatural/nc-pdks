// Kaynak: pdks_app_stabil_v8_4.py satır 963-989 (PDKSEngine.detect_buddy). Birebir port.
// Aynı sicil için aynı turnikede 60 sn içinde aynı yönlü tekrar geçişleri şüpheli işaretler.
import { ReaderConfig } from "./readerConfig";
import { readerDirection, readerGate } from "./textNorm";
import type { PdksRawEvent } from "./types";

export function detectBuddy(raw: PdksRawEvent[], readerConfig: ReaderConfig): number[] {
  const bs = new Set<number>();
  const bu = new Map<string, PdksRawEvent[]>();
  for (const r of raw) {
    const list = bu.get(r.sicil) ?? [];
    list.push(r);
    bu.set(r.sicil, list);
  }

  for (const recsUnsorted of bu.values()) {
    const rs = [...recsUnsorted].sort((a, b) => a.dt.getTime() - b.dt.getTime());
    for (let i = 0; i < rs.length; i++) {
      if (!readerConfig.isWork(rs[i].ok)) continue;
      const dir1 = readerDirection(rs[i].ok);
      const gate1 = readerGate(rs[i].ok);
      if (!dir1) continue;
      for (let j = i + 1; j < rs.length; j++) {
        if (Math.abs((rs[j].dt.getTime() - rs[i].dt.getTime()) / 1000) > 60) break;
        if (!readerConfig.isWork(rs[j].ok)) continue;
        const dir2 = readerDirection(rs[j].ok);
        const gate2 = readerGate(rs[j].ok);
        if (dir1 === dir2 && gate1 === gate2) {
          bs.add(rs[i].idx);
          bs.add(rs[j].idx);
        }
      }
    }
  }

  return [...bs].sort((a, b) => a - b);
}
