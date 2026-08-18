// Kimlik eşleştirme testleri.
//
// Beklenen değerler canlı veriden alındı: Yüksel Ballıca'nın Zoho zuid'i
// 20111581669, Employment_No'su 39190, PDKS sicili de 39190.
import { describe, expect, it } from "vitest";
import { buildKimlikIndeksi, kimlikCoz, type ZohoKimlik } from "./kimlik";

const ZOHO: ZohoKimlik[] = [
  {
    id: "645008000780826001",
    zuid: "20111581669",
    employmentNo: "39190",
    eposta: "yuksel.ballica@natural.clinic",
    ad: "Yuksel Ballica",
  },
  {
    id: "645008000679249001",
    zuid: "20099999999",
    employmentNo: "39049",
    eposta: "mertay.karaman@natural.clinic",
    ad: "Mertay Karaman",
  },
  {
    // Employment_No'su PDKS'te olmayan (kapsam dışı) kişi
    id: "645008000000392001",
    zuid: "20095866497",
    employmentNo: "99999",
    eposta: "resul@natural.clinic",
    ad: "Resul Mürtezaoğlu",
  },
  {
    // Employment_No hiç yok — yalnızca isimle bulunabilir
    id: "645008000000111111",
    zuid: "20088888888",
    employmentNo: null,
    eposta: "ayse.demir@natural.clinic",
    ad: "Ayşe Demir",
  },
];

const PERSONEL = [
  { sicil: "39190", ad: "YÜKSEL", soyad: "BALLICA" },
  { sicil: "39049", ad: "MERTAY", soyad: "KARAMAN" },
  { sicil: "40001", ad: "AYŞE", soyad: "DEMİR" },
];

const IX = buildKimlikIndeksi(ZOHO, PERSONEL);

describe("kimlikCoz", () => {
  it("user_id = zuid ile bulur (canlı verideki asıl yol)", () => {
    const r = kimlikCoz({ userId: "20111581669", userName: null, email: null }, IX);
    expect(r).toEqual({ sicil: "39190", yol: "zuid" });
  });

  it("user_id = zoho id ile de bulur", () => {
    const r = kimlikCoz({ userId: "645008000679249001", userName: null, email: null }, IX);
    expect(r).toEqual({ sicil: "39049", yol: "zoho_id" });
  });

  it("adı bozuk olsa bile user_id doğruysa eşleşir", () => {
    // Canlı veride adı "Unknown"/"Email Test" olup user_id'si doğru kayıtlar var.
    // İsme öncelik verilse bu kayıtlar kaybolurdu.
    const r = kimlikCoz({ userId: "20111581669", userName: "Unknown", email: null }, IX);
    expect(r).toEqual({ sicil: "39190", yol: "zuid" });
  });

  it("e-posta ile bulur", () => {
    const r = kimlikCoz(
      { userId: null, userName: null, email: "Mertay.Karaman@Natural.Clinic" },
      IX
    );
    expect(r).toEqual({ sicil: "39049", yol: "eposta" });
  });

  it("kimlik yoksa isimle bulur ve Türkçe harf farkını yutar", () => {
    // Tracker ASCII yazıyor ("Yuksel Ballica"), PDKS'te "YÜKSEL BALLICA".
    const r = kimlikCoz({ userId: null, userName: "Yuksel Ballica", email: null }, IX);
    expect(r).toEqual({ sicil: "39190", yol: "isim" });
  });

  it("Employment_No PDKS'te yoksa Zoho ismiyle geri düşer", () => {
    const r = kimlikCoz({ userId: "20088888888", userName: null, email: null }, IX);
    expect(r).toEqual({ sicil: "40001", yol: "zuid" });
  });

  it("kapsam dışı kişi (Employment_No PDKS'te yok, isim de yok) eşleşmez", () => {
    const r = kimlikCoz({ userId: "20095866497", userName: null, email: null }, IX);
    expect(r).toBeNull();
  });

  it("tanınmayan kimlik ve isim eşleşmez", () => {
    expect(kimlikCoz({ userId: "999", userName: "Test User", email: null }, IX)).toBeNull();
  });

  it("boş girdi eşleşmez", () => {
    expect(kimlikCoz({ userId: null, userName: null, email: null }, IX)).toBeNull();
  });

  it("aynı isimde iki kişi varsa ilk kayıt korunur, ikincisi isme bağlanmaz", () => {
    const ix = buildKimlikIndeksi(ZOHO, [
      { sicil: "1", ad: "ALİ", soyad: "VELİ" },
      { sicil: "2", ad: "ALİ", soyad: "VELİ" },
    ]);
    const r = kimlikCoz({ userId: null, userName: "Ali Veli", email: null }, ix);
    expect(r?.sicil).toBe("1");
  });
});
