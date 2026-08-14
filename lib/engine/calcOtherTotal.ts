// Kaynak: pdks_app_stabil_v8_4.py satır 1255-1280 (PDKSEngine._calc_other_total).
// Birebir port — yönü belirlenemeyen okuyucular için eski "ardışık ikili eşleştirme"
// davranışı bilinçli olarak korunur (geriye dönük uyumluluk, ARCHITECTURE.md §5).
import { pairGirisCikis } from "./pairGirisCikis";
import { readerDirection } from "./textNorm";

export interface OtherRec {
  dt: Date;
  ok: string;
}

export function calcOtherTotal(others: OtherRec[]): number {
  if (others.length < 2) return 0;
  const sorted = [...others].sort((a, b) => a.dt.getTime() - b.dt.getTime());
  const directed: { dt: Date; in: boolean }[] = [];
  const undirected: OtherRec[] = [];
  for (const r of sorted) {
    const d = readerDirection(r.ok);
    if (d) directed.push({ dt: r.dt, in: d === "in" });
    else undirected.push(r);
  }

  let total = 0;
  for (const [g, c] of pairGirisCikis(directed)) {
    const delta = (c.getTime() - g.getTime()) / 60000;
    if (delta > 0 && delta < 480) total += delta; // 8 saati geçmesin
  }
  for (let i = 0; i + 1 < undirected.length; i += 2) {
    const delta = (undirected[i + 1].dt.getTime() - undirected[i].dt.getTime()) / 60000;
    if (delta > 0 && delta < 480) total += delta;
  }
  return total;
}
