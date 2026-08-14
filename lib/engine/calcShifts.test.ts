import { describe, expect, it } from "vitest";
import { calcShifts, shiftKey } from "./calcShifts";
import { ReaderConfig } from "./readerConfig";
import type { PdksRawEvent } from "./types";

function rec(sicil: string, dt: Date, ok: string, idx: number): PdksRawEvent {
  return { sicil, ad: "", soyad: "", dt, ok, firma: "", sube: "", dept: "", dir: "", idx };
}

describe("calcShifts (ARCHITECTURE.md §2/§3 kuralları)", () => {
  it("gündüz vardiyasında basit giriş/çıkış net süreyi hesaplar", () => {
    const raw = [
      rec("1", new Date(2026, 0, 5, 8, 0), "TURNIKE 1 GIRIS", 0),
      rec("1", new Date(2026, 0, 5, 17, 30), "TURNIKE 1 CIKIS", 1),
    ];
    const rc = new ReaderConfig();
    const shifts = calcShifts(raw, rc, () => false);
    const sh = shifts.get(shiftKey("1", "05.01.2026"));
    expect(sh?.net).toBe(9 * 60 + 30);
  });

  it("gece vardiyasında saat 12:00'den önceki kayıtlar bir önceki günün vardiyasına sayılır", () => {
    const raw = [
      rec("2", new Date(2026, 0, 5, 22, 0), "TURNIKE 1 GIRIS", 0), // 5 Ocak gecesi giriş
      rec("2", new Date(2026, 0, 6, 6, 0), "TURNIKE 1 CIKIS", 1), // 6 Ocak sabahı çıkış (saat<12)
    ];
    const rc = new ReaderConfig();
    const shifts = calcShifts(raw, rc, () => true);
    // Her iki kayıt da 5 Ocak vardiyasına ait olmalı (6 Ocak 06:00 < 12:00 -> önceki gün)
    const sh5 = shifts.get(shiftKey("2", "05.01.2026"));
    const sh6 = shifts.get(shiftKey("2", "06.01.2026"));
    expect(sh5).toBeDefined();
    expect(sh6).toBeUndefined();
    expect(sh5?.net).toBe(8 * 60);
  });

  it("aynı yön/aynı turnike 60 sn içindeki tekrar kayıt tekilleştirilir", () => {
    const raw = [
      rec("3", new Date(2026, 0, 5, 8, 0, 0), "TURNIKE 1 GIRIS", 0),
      rec("3", new Date(2026, 0, 5, 8, 0, 30), "TURNIKE 1 GIRIS", 1), // 30sn sonra tekrar giriş -> yok sayılır
      rec("3", new Date(2026, 0, 5, 17, 0, 0), "TURNIKE 1 CIKIS", 2),
    ];
    const rc = new ReaderConfig();
    const shifts = calcShifts(raw, rc, () => false);
    const sh = shifts.get(shiftKey("3", "05.01.2026"));
    expect(sh?.net).toBe(9 * 60);
    expect(sh?.cnt).toBe(3); // ham kayıt sayımı değişmez, sadece eşleştirmede tekilleştirilir
  });

  it("ignore okuyucular hesaplamaya hiç katılmaz", () => {
    const raw = [
      rec("4", new Date(2026, 0, 5, 8, 0), "TURNIKE 1 GIRIS", 0),
      rec("4", new Date(2026, 0, 5, 12, 0), "KANTIN GIRIS", 1),
      rec("4", new Date(2026, 0, 5, 17, 0), "TURNIKE 1 CIKIS", 2),
    ];
    const rc = new ReaderConfig();
    rc.setArea("KANTIN GIRIS", "ignore");
    const shifts = calcShifts(raw, rc, () => false);
    const sh = shifts.get(shiftKey("4", "05.01.2026"));
    expect(sh?.cnt).toBe(2); // KANTIN GIRIS tamamen atlanmış
  });
});
