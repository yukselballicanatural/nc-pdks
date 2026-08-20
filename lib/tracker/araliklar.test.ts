// Olay akışı -> aralık dönüşümü testleri.
import { describe, expect, it } from "vitest";
import {
  araligiAcikla,
  araEtiketi,
  cakismaDk,
  gunKredisiDetay,
  gunKronolojisi,
  olaylardanAraliklar,
  type TrackerAralik,
} from "./araliklar";
import { ISTANBUL_OFFSET_MS } from "../engine/tz";
import type { TrackerEventRow } from "../db/queries/timeTracker";

/** UTC saatinden olay üretir. */
function ol(
  saatUtc: string,
  eventType: string,
  breakId: string | null = null,
  elapsedSeconds: number | null = null,
  mapLink: string | null = null
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
    mapLink,
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

  it("checkout aynı anda açık olan BİRDEN FAZLA türü de kapatır", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "checkin"),
      ol("08:10", "break_start", "clinic"),
      ol("08:20", "break_start", "meeting"),
      ol("08:30", "checkout"),
    ]);
    expect(r.aralar).toHaveLength(2);
    expect(r.aralar.every((a) => a.bit !== null)).toBe(true);
    expect(r.kapanmamis).toBe(0);
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

  it("farklı türde iki tane açık ara birbirini KESMEZ, ikisi bağımsız kapanır", () => {
    // Gerçek hata (canlı veride yakalandı, 2026-08-19): Klinik açıkken Yemek
    // başlıyor, Yemek kapanıyor, sonra Klinik'in GERÇEK kapanışı geliyor.
    // Eski tek-slotlu tasarımda Yemek başladığında Klinik erken "kapanmamış"
    // olarak kayda geçiyordu ve gerçek kapanışı artık eşleştirilemiyordu.
    const r = olaylardanAraliklar([
      ol("08:26", "break_start", "clinic"),
      ol("08:27", "break_start", "launch"),
      ol("08:28", "break_stop", "launch"),
      ol("08:29", "break_stop", "clinic"),
    ]);
    const klinik = r.aralar.find((a) => a.etiket === "Klinik");
    const yemek = r.aralar.find((a) => a.etiket === "Yemek");
    expect(klinik?.bit).not.toBeNull();
    expect(hm(klinik!.bit)).toBe("11:29");
    expect(yemek?.bit).not.toBeNull();
    expect(hm(yemek!.bit)).toBe("11:28");
    expect(r.kapanmamis).toBe(0);
  });

  it("aynı türde üst üste iki break_start: ilki açık kalır (kapanmamış), ikincisi kapanır", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "break_start", "clinic"),
      ol("08:30", "break_start", "clinic"),
      ol("09:00", "break_stop", "clinic"),
    ]);
    expect(r.aralar).toHaveLength(2);
    expect(r.aralar[0].bit).toBeNull();
    expect(hm(r.aralar[0].bas)).toBe("11:00");
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

  it("başlangıç ve bitiş konumu (map_link) aralığa doğru taşınır", () => {
    const r = olaylardanAraliklar([
      ol("08:00", "break_start", "clinic", null, "https://maps.example/a"),
      ol("08:20", "break_stop", "clinic", null, "https://maps.example/b"),
    ]);
    expect(r.aralar[0].basKonum).toBe("https://maps.example/a");
    expect(r.aralar[0].bitKonum).toBe("https://maps.example/b");
  });

  it("kapanmamış aralıkta bitKonum null kalır", () => {
    const r = olaylardanAraliklar([ol("08:00", "break_start", "clinic", null, "https://maps.example/a")]);
    expect(r.aralar[0].basKonum).toBe("https://maps.example/a");
    expect(r.aralar[0].bitKonum).toBeNull();
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
      { kod: "clinic", etiket: "Klinik", bas: t(11, 20), bit: t(12, 0), bildirilenDk: 40, basKonum: null, bitKonum: null },
    ];
    expect(araligiAcikla(t(11, 20), t(12, 0), aralar)).toEqual([{ etiket: "Klinik", dk: 40 }]);
  });

  it("aynı türden parçalar toplanır ve büyükten küçüğe sıralanır", () => {
    const aralar = [
      { kod: "break", etiket: "Mola", bas: t(11, 0), bit: t(11, 10), bildirilenDk: null, basKonum: null, bitKonum: null },
      { kod: "clinic", etiket: "Klinik", bas: t(11, 15), bit: t(11, 45), bildirilenDk: null, basKonum: null, bitKonum: null },
      { kod: "break", etiket: "Mola", bas: t(11, 50), bit: t(11, 55), bildirilenDk: null, basKonum: null, bitKonum: null },
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

describe("gunKredisiDetay", () => {
  const t = (h: number, m = 0) => new Date(Date.UTC(2026, 7, 17, h, m));

  it("Klinik + Toplantı kırılımını verir, Mola/Yemek dışarıda kalır", () => {
    const dis: [Date, Date][] = [[t(11), t(13)]];
    const aralar = [
      { kod: "clinic", etiket: "Klinik", bas: t(11), bit: t(11, 20), bildirilenDk: null, basKonum: null, bitKonum: null },
      { kod: "meeting", etiket: "Toplantı", bas: t(11, 20), bit: t(11, 35), bildirilenDk: null, basKonum: null, bitKonum: null },
      { kod: "break", etiket: "Mola", bas: t(11, 35), bit: t(11, 45), bildirilenDk: null, basKonum: null, bitKonum: null },
      { kod: "launch", etiket: "Yemek", bas: t(12), bit: t(12, 30), bildirilenDk: null, basKonum: null, bitKonum: null },
    ];
    expect(gunKredisiDetay(dis, aralar)).toEqual([
      { etiket: "Klinik", dk: 20 },
      { etiket: "Toplantı", dk: 15 },
    ]);
  });

  it("kredi yoksa boş liste döner", () => {
    const dis: [Date, Date][] = [[t(11), t(12)]];
    const aralar = [{ kod: "break", etiket: "Mola", bas: t(11), bit: t(11, 30), bildirilenDk: null, basKonum: null, bitKonum: null }];
    expect(gunKredisiDetay(dis, aralar)).toEqual([]);
  });

  it("birden çok turnike dışı aralıktaki aynı tür toplanır", () => {
    const dis: [Date, Date][] = [
      [t(9), t(9, 20)],
      [t(14), t(14, 30)],
    ];
    const aralar = [
      { kod: "clinic", etiket: "Klinik", bas: t(9), bit: t(9, 20), bildirilenDk: null, basKonum: null, bitKonum: null },
      { kod: "clinic", etiket: "Klinik", bas: t(14), bit: t(14, 30), bildirilenDk: null, basKonum: null, bitKonum: null },
    ];
    expect(gunKredisiDetay(dis, aralar)).toEqual([{ etiket: "Klinik", dk: 50 }]);
  });
});

describe("gunKronolojisi", () => {
  const gun = (h: number, m = 0) => new Date(Date.UTC(2026, 7, 17, h, m));
  const gunBas = gun(0);
  const gunBit = gun(24);
  const ara = (
    etiket: string,
    kod: string,
    bas: Date,
    bit: Date | null
  ): TrackerAralik => ({ kod, etiket, bas, bit, bildirilenDk: null, basKonum: null, bitKonum: null });

  it("gün içindeki olayları kronolojik sırayla döner, dakikayı hesaplar", () => {
    const aralar = [
      ara("Yemek", "launch", gun(12), gun(12, 30)),
      ara("Klinik", "clinic", gun(11), gun(11, 40)),
    ];
    const r = gunKronolojisi(gunBas, gunBit, aralar);
    expect(r.map((o) => o.etiket)).toEqual(["Klinik", "Yemek"]);
    expect(r[0].dk).toBe(40);
    expect(r[1].dk).toBe(30);
  });

  it("hâlâ açık (bit=null) olay dk=null ile listelenir", () => {
    const r = gunKronolojisi(gunBas, gunBit, [ara("Klinik", "clinic", gun(11), null)]);
    expect(r).toHaveLength(1);
    expect(r[0].dk).toBeNull();
  });

  it("gün sınırı dışında tamamen kalan (önceki/sonraki gün) olay listelenmez", () => {
    const oncekiGunTam = new Date(Date.UTC(2026, 7, 16, 22));
    const sonrakiGun = new Date(Date.UTC(2026, 7, 18, 1));
    const r = gunKronolojisi(gunBas, gunBit, [
      ara("Mola", "break", oncekiGunTam, new Date(Date.UTC(2026, 7, 16, 23))),
      ara("Yemek", "launch", sonrakiGun, null),
    ]);
    expect(r).toHaveLength(0);
  });

  it("önceki günde başlayıp bu güne taşan (gece yarısını aşan) olay bu günde de görünür", () => {
    const oncekiGunBaslangic = new Date(Date.UTC(2026, 7, 16, 23));
    const r = gunKronolojisi(gunBas, gunBit, [ara("Mola", "break", oncekiGunBaslangic, gun(0, 30))]);
    expect(r).toHaveLength(1);
    expect(r[0].dk).toBe(90);
  });

  it("boş aralık listesi boş sonuç verir", () => {
    expect(gunKronolojisi(gunBas, gunBit, [])).toEqual([]);
  });
});
