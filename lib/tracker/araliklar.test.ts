// Olay akışı -> aralık dönüşümü testleri.
import { describe, expect, it } from "vitest";
import { araligiAcikla, araEtiketi, cakismaDk, olaylardanAraliklar } from "./araliklar";
import { ISTANBUL_OFFSET_MS } from "../engine/tz";
import type { TrackerEventRow } from "../db/queries/timeTracker";

/** UTC saatinden olay üretir. */
function ol(
  saatUtc: string,
  eventType: string,
  breakId: string | null = null,
  elapsedSeconds: number | null = null
): TrackerEventRow {
  return {
    userId: "1",
    userName: "X",
    employeeCode: null,
    email: null,
    eventType,
    breakId,
    breakName: breakId,
    occurredAt: `2026-08-17T${saatUtc}:00.000Z`,
    elapsedSeconds,
  };
}

/** Duvar saati Date -> "HH:MM" (UTC alanları duvar saatini taşır). */
function hm(d: Date | null): string | null {
  if (!d) return null;
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

describe("olaylardanAraliklar", () => {
  it("checkin/checkout mesai aralığı üretir ve UTC'yi İstanbul duvar saatine çevirir", () => {
    // 08:00 UTC = 11:00 İstanbul
    const r = olaylardanAraliklar([ol("08:00", "checkin"), ol("16:30", "checkout")]);
    expect(r.mesai).toHaveLength(1);
    expect(hm(r.mesai[0].bas)).toBe("11:00");
    expect(hm(r.mesai[0].bit)).toBe("19:30");
    expect(r.kapanmamis).toBe(0);
  });

  it("saat kaydırması tam olarak İstanbul offset'i kadar", () => {
    const r = olaylardanAraliklar([ol("08:00", "checkin")]);
    const ham = new Date("2026-08-17T08:00:00.000Z").getTime();
    expect(r.mesai[0].bas.getTime() - ham).toBe(ISTANBUL_OFFSET_MS);
  });

  it("mola başlangıç/bitiş aralığı üretir ve türü etiketler", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "checkin"),
      ol("08:20", "break_start", "clinic"),
      ol("09:00", "break_stop", "clinic", 2400),
      ol("16:00", "checkout"),
    ]);
    expect(r.aralar).toHaveLength(1);
    expect(r.aralar[0].etiket).toBe("Klinik");
    expect(hm(r.aralar[0].bas)).toBe("11:20");
    expect(hm(r.aralar[0].bit)).toBe("12:00");
    expect(r.aralar[0].bildirilenDk).toBe(40);
  });

  it("dört ara türünü de doğru etiketler", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "break_start", "break"),
      ol("08:10", "break_stop", "break"),
      ol("09:00", "break_start", "clinic"),
      ol("09:10", "break_stop", "clinic"),
      ol("10:00", "break_start", "meeting"),
      ol("10:10", "break_stop", "meeting"),
      ol("11:00", "break_start", "launch"),
      ol("11:10", "break_stop", "launch"),
    ]);
    expect(r.aralar.map((a) => a.etiket)).toEqual(["Mola", "Klinik", "Toplantı", "Yemek"]);
  });

  it("kapanmamış mola açık bırakılır, bitiş uydurulmaz", () => {
    const r = olaylardanAraliklar([ol("08:00", "checkin"), ol("08:30", "break_start", "break")]);
    expect(r.aralar).toHaveLength(1);
    expect(r.aralar[0].bit).toBeNull();
    expect(r.kapanmamis).toBe(2); // açık mola + açık mesai
  });

  it("checkout açık kalan molayı da kapatır", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "checkin"),
      ol("08:30", "break_start", "break"),
      ol("09:00", "checkout"),
    ]);
    expect(hm(r.aralar[0].bit)).toBe("12:00");
    expect(r.kapanmamis).toBe(0);
  });

  it("üst üste iki break_start: ilki açık kalır, ikincisi normal işler", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "break_start", "break"),
      ol("08:30", "break_start", "clinic"),
      ol("09:00", "break_stop", "clinic"),
    ]);
    expect(r.aralar).toHaveLength(2);
    expect(r.aralar[0].bit).toBeNull();
    expect(r.aralar[1].etiket).toBe("Klinik");
    expect(hm(r.aralar[1].bit)).toBe("12:00");
  });

  it("eşleşmeyen break_stop yok sayılır", () => {
    const r = olaylardanAraliklar([ol("09:00", "break_stop", "break", 600)]);
    expect(r.aralar).toHaveLength(0);
    expect(r.kapanmamis).toBe(0);
  });

  it("boş akış boş sonuç verir", () => {
    const r = olaylardanAraliklar([]);
    expect(r.aralar).toHaveLength(0);
    expect(r.mesai).toHaveLength(0);
  });

  it("bilinmeyen ara türünde kaynaktaki ad korunur", () => {
    expect(araEtiketi("dentist", "Dentist")).toBe("Dentist");
    expect(araEtiketi(null, null)).toBe("Ara");
  });
});

describe("cakismaDk", () => {
  const t = (h: number, m = 0) => new Date(Date.UTC(2026, 7, 17, h, m));

  it("tam kapsanan aralık tüm süreyi verir", () => {
    expect(cakismaDk(t(11), t(12), t(11, 10), t(11, 40))).toBe(30);
  });

  it("kısmi çakışma yalnızca kesişimi verir", () => {
    expect(cakismaDk(t(11), t(12), t(11, 40), t(12, 30))).toBe(20);
  });

  it("hiç çakışmayan aralık 0 verir", () => {
    expect(cakismaDk(t(11), t(12), t(13), t(14))).toBe(0);
  });

  it("kapanmamış aralık 0 sayılır — süresi bilinmiyor", () => {
    expect(cakismaDk(t(11), t(12), t(11, 10), null)).toBe(0);
  });

  it("sınırda temas çakışma sayılmaz", () => {
    expect(cakismaDk(t(11), t(12), t(12), t(13))).toBe(0);
  });
});

describe("araligiAcikla", () => {
  const t = (h: number, m = 0) => new Date(Date.UTC(2026, 7, 17, h, m));

  it("kullanıcının örneği: 11:20-12:00 arası 40 dakikayı klinik olarak açıklar", () => {
    const aralar = [
      { kod: "clinic", etiket: "Klinik", bas: t(11, 20), bit: t(12, 0), bildirilenDk: 40 },
    ];
    expect(araligiAcikla(t(11, 20), t(12, 0), aralar)).toEqual([{ etiket: "Klinik", dk: 40 }]);
  });

  it("aynı türden parçalar toplanır ve büyükten küçüğe sıralanır", () => {
    const aralar = [
      { kod: "break", etiket: "Mola", bas: t(11, 0), bit: t(11, 10), bildirilenDk: null },
      { kod: "clinic", etiket: "Klinik", bas: t(11, 15), bit: t(11, 45), bildirilenDk: null },
      { kod: "break", etiket: "Mola", bas: t(11, 50), bit: t(11, 55), bildirilenDk: null },
    ];
    expect(araligiAcikla(t(11), t(12), aralar)).toEqual([
      { etiket: "Klinik", dk: 30 },
      { etiket: "Mola", dk: 15 },
    ]);
  });

  it("açıklama yoksa boş liste döner", () => {
    expect(araligiAcikla(t(11), t(12), [])).toEqual([]);
  });
});
