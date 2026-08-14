// Kaynak: pdks_app_stabil_v8_4.py satır 1136-1154 (PDKSEngine._pair_giris_cikis).
// TEK, ortak giriş/çıkış eşleştirme kuralı — calc_shifts, _calc_turnike_times ve
// _calc_other_total'ın hepsi bu tek fonksiyonu kullanır (ARCHITECTURE.md §2/§3).
// Birebir port, davranış değiştirilmemiştir.
import type { DirectedEvent, GirisCikisPair } from "./types";

/**
 * Kronolojik sıralı giriş/çıkış olaylarını eşleştirir.
 * Kural: açık bir giriş varken yeni bir giriş gelirse yok sayılır (ilk giriş esas alınır).
 * Bekleyen bir giriş yokken çıkış gelirse yok sayılır (eşleşmeyen çıkış).
 *
 * `events` çağıran tarafından `dt`'ye göre sıralı verilmelidir (Python tarafı da
 * bunu garanti etmiyor, sıralamayı çağıran yapıyor — burada da aynı sözleşme).
 */
export function pairGirisCikis(events: DirectedEvent[]): GirisCikisPair[] {
  const pairs: GirisCikisPair[] = [];
  let currentIn: Date | null = null;
  for (const e of events) {
    if (e.in) {
      if (currentIn === null) currentIn = e.dt;
    } else {
      if (currentIn !== null) {
        const deltaMin = (e.dt.getTime() - currentIn.getTime()) / 60000;
        if (deltaMin > 0) pairs.push([currentIn, e.dt]);
        currentIn = null;
      }
    }
  }
  return pairs;
}
