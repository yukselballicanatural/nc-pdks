// Kaynak: pdks_app_stabil_v8_4.py satır 144-193 (ReaderConfig). Birebir port.
// Kalıcı hal Supabase `reader_rules` tablosunda tutulur (bkz. lib/db/queries/readerRules.ts);
// bu sınıf sadece in-memory sınıflandırma mantığını taşır.
import { readerIsTurnike } from "./textNorm";
import type { ReaderArea } from "./types";

export class ReaderConfig {
  workReaders: Set<string>;
  breakReaders: Set<string>;
  ignoreReaders: Set<string>;
  /** getArea on binlerce olay için çağrılıyor; sınıflandırma değişene kadar önbelleklenir. */
  private areaCache = new Map<string, ReaderArea>();

  constructor(init?: { work_readers?: string[]; break_readers?: string[]; ignore_readers?: string[] }) {
    this.workReaders = new Set(init?.work_readers ?? []);
    this.breakReaders = new Set(init?.break_readers ?? []);
    this.ignoreReaders = new Set(init?.ignore_readers ?? []);
  }

  setArea(okuyucu: string, area: ReaderArea | null) {
    const name = String(okuyucu ?? "").trim();
    if (!name) return;
    this.workReaders.delete(name);
    this.breakReaders.delete(name);
    this.ignoreReaders.delete(name);
    if (area === "work") this.workReaders.add(name);
    else if (area === "break") this.breakReaders.add(name);
    else if (area === "ignore") this.ignoreReaders.add(name);
    this.areaCache.clear();
  }

  getArea(okuyucu: string): ReaderArea {
    const raw = String(okuyucu ?? "");
    const hit = this.areaCache.get(raw);
    if (hit !== undefined) return hit;

    const name = raw.trim();
    let val: ReaderArea;
    if (this.ignoreReaders.has(name)) val = "ignore";
    else if (this.workReaders.has(name)) val = "work";
    else if (this.breakReaders.has(name)) val = "break";
    else val = readerIsTurnike(name) ? "work" : "break";

    this.areaCache.set(raw, val);
    return val;
  }

  isWork(okuyucu: string): boolean {
    return this.getArea(okuyucu) === "work";
  }

  isIgnored(okuyucu: string): boolean {
    return this.getArea(okuyucu) === "ignore";
  }

  toJSON() {
    return {
      work_readers: [...this.workReaders].sort(),
      break_readers: [...this.breakReaders].sort(),
      ignore_readers: [...this.ignoreReaders].sort(),
    };
  }
}
