// Kaynak: pdks_app_stabil_v8_4.py satır 144-193 (ReaderConfig). Birebir port.
// Kalıcı hal Supabase `reader_rules` tablosunda tutulur (bkz. lib/db/queries/readerRules.ts);
// bu sınıf sadece in-memory sınıflandırma mantığını taşır.
import { readerIsTurnike } from "./textNorm";
import type { ReaderArea } from "./types";

export class ReaderConfig {
  workReaders: Set<string>;
  breakReaders: Set<string>;
  ignoreReaders: Set<string>;

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
  }

  getArea(okuyucu: string): ReaderArea {
    const name = String(okuyucu ?? "").trim();
    if (this.ignoreReaders.has(name)) return "ignore";
    if (this.workReaders.has(name)) return "work";
    if (this.breakReaders.has(name)) return "break";
    return readerIsTurnike(name) ? "work" : "break";
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
