// Kolay İK (kolayik.com) Public API istemcisi.
//
// Doğrulanmış gerçekler (canlı token ile denendi, 2026-08-14):
//   Kök       : https://api.kolayik.com/v2
//   Kimlik    : Authorization: Bearer <token>
//   person/list -> POST, gövde multipart/form-data, `status=1` zorunlu.
//                  Yanıt SADECE id/firstName/lastName içerir; birim/yönetici
//                  bilgisi için person/bulk-view gerekir.
//   leave/list  -> GET, sorgu parametreleriyle.
//   person/bulk-view -> POST, JSON {person_ids:[...]}. Zengin veri: unitList
//                  (Bölüm/Departman/Unvan/Firma/Şube) + managerId. Sicil no ve
//                  vardiya alanı Kolay'da YOK — eşleştirme isimle yapılıyor.
//   unit/show-unit-tree -> GET, birim ağacı.
//
// Dört uç noktanın hepsi bu token'da açık (yetkiler 2026-08-14'te verildi).
import "server-only";

const KOLAY_ROOT = "https://api.kolayik.com/v2";
const TIMEOUT_MS = 20_000;

export class KolayError extends Error {
  constructor(
    message: string,
    readonly kind: "yetki" | "token_yok" | "ag" | "api"
  ) {
    super(message);
    this.name = "KolayError";
  }
}

function token(): string {
  const t = process.env.KOLAY_API_TOKEN;
  if (!t) {
    throw new KolayError(
      "KOLAY_API_TOKEN ortam değişkeni tanımlı değil. Vercel → Settings → Environment Variables'a ekleyin.",
      "token_yok"
    );
  }
  return t;
}

interface KolayEnvelope<T> {
  error: boolean;
  code?: number;
  message?: string;
  data?: T;
}

/** Kolay'ın yetki/kapsam hatası ile gerçek API hatasını ayırır. */
function classify(message: string): "yetki" | "api" {
  return /Geçersiz API bilgisi|Geçersiz giriş bilgisi/i.test(message) ? "yetki" : "api";
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${KOLAY_ROOT}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token()}`, Accept: "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof KolayError) throw e;
    throw new KolayError(
      `Kolay İK'ya ulaşılamadı: ${e instanceof Error ? e.message : "ağ hatası"}`,
      "ag"
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let body: KolayEnvelope<T>;
  try {
    body = JSON.parse(text) as KolayEnvelope<T>;
  } catch {
    throw new KolayError(`Kolay İK beklenmeyen yanıt verdi (HTTP ${res.status}).`, "api");
  }

  if (body.error) {
    const msg = body.message ?? `HTTP ${res.status}`;
    throw new KolayError(msg, classify(msg));
  }
  if (body.data === undefined) {
    throw new KolayError("Kolay İK yanıtında veri alanı yok.", "api");
  }
  return body.data;
}

/* ── person/list ── */

export interface KolayPerson {
  id: string;
  firstName: string;
  lastName: string;
}

interface PersonListPage {
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  items: KolayPerson[];
}

/**
 * Tüm çalışanları sayfa sayfa çeker.
 * @param aktif true = çalışanlar, false = işten ayrılanlar
 */
export async function fetchKolayPeople(aktif = true): Promise<KolayPerson[]> {
  const all: KolayPerson[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const fd = new FormData();
    fd.set("status", aktif ? "1" : "0");
    fd.set("page", String(page));
    const data = await call<PersonListPage>("/person/list", { method: "POST", body: fd });
    all.push(...(data.items ?? []));
    lastPage = data.lastPage ?? 1;
    page++;
    // Sonsuz döngü koruması: API tutarsız lastPage döndürürse dur.
  } while (page <= lastPage && page <= 50);

  return all;
}

/* ── leave/list ── */

export type LeaveStatus = "approved" | "rejected" | "waiting" | "cancelled";

/** leave/list'in gerçek yanıt şekli (canlı doğrulandı). */
export interface KolayLeave {
  id?: string;
  startDate?: string;
  endDate?: string;
  returnDate?: string;
  comment?: string;
  type?: { id?: string; name?: string; limitation?: string };
  person?: { id?: string; name?: string; status?: string };
  replacementPerson?: { id?: string; name?: string };
  status?: string;
  /** Kolay'ın saydığı iş günü sayısı — string gelebiliyor. */
  usedDays?: number | string;
  isPaid?: boolean;
}

/** Kolay tarih biçimi: "YYYY-MM-DD HH:mm:ss" (yerel/İstanbul kabul edilir). */
function kolayDate(gun: string, saat: string): string {
  return `${gun} ${saat}`;
}

/**
 * Belirli aralıktaki izin kayıtları.
 *
 * @param sd "YYYY-MM-DD" başlangıç
 * @param ed "YYYY-MM-DD" bitiş (gün sonuna kadar dahil edilir)
 */
export async function fetchKolayLeaves(opts: {
  sd: string;
  ed: string;
  status?: LeaveStatus;
  personId?: string;
  limit?: number;
}): Promise<KolayLeave[]> {
  // status ve limit ZORUNLU — biri eksikse Kolay "The status/limit field is
  // required" hatası döndürür.
  //
  // include_inactive_employees: dokümanda "false" yazıyor ama API bu değeri
  // REDDEDİYOR ("must be true or false" diyerek). 0/1 kabul ediyor. Bu parametre
  // yanlış gönderildiğinde tüm istek hataya düşüyor, boş liste değil — bu yüzden
  // burada 0/1 kullanılıyor (canlı doğrulandı).
  const qs = new URLSearchParams();
  qs.set("startDate", kolayDate(opts.sd, "00:00:00"));
  qs.set("endDate", kolayDate(opts.ed, "23:59:59"));
  qs.set("status", opts.status ?? "approved");
  qs.set("limit", String(opts.limit ?? 5000));
  if (opts.personId) qs.set("personId", opts.personId);
  qs.set("include_inactive_employees", "0");

  // Kolay bu uç noktada bazı hesaplarda düz dizi, bazılarında {items:[...]}
  // döndürüyor; ikisini de karşılıyoruz.
  const data = await call<KolayLeave[] | { items?: KolayLeave[] }>(
    `/leave/list?${qs.toString()}`,
    { method: "GET" }
  );
  return Array.isArray(data) ? data : (data.items ?? []);
}

/** Bağlantı/yetki durumu — arayüzde teşhis göstermek için. */
export interface KolayHealth {
  tokenVar: boolean;
  personList: { ok: boolean; sayi?: number; hata?: string };
  leaveList: { ok: boolean; sayi?: number; hata?: string; yetkiEksik: boolean };
}

export async function kolayHealth(sd: string, ed: string): Promise<KolayHealth> {
  const tokenVar = Boolean(process.env.KOLAY_API_TOKEN);
  if (!tokenVar) {
    return {
      tokenVar: false,
      personList: { ok: false, hata: "Token yok" },
      leaveList: { ok: false, hata: "Token yok", yetkiEksik: false },
    };
  }

  const [p, l] = await Promise.all([
    fetchKolayPeople(true).then(
      (r) => ({ ok: true as const, sayi: r.length }),
      (e: unknown) => ({ ok: false as const, hata: e instanceof Error ? e.message : "hata" })
    ),
    fetchKolayLeaves({ sd, ed, status: "approved", limit: 1 }).then(
      (r) => ({ ok: true as const, sayi: r.length, yetkiEksik: false }),
      (e: unknown) => ({
        ok: false as const,
        hata: e instanceof Error ? e.message : "hata",
        yetkiEksik: e instanceof KolayError && e.kind === "yetki",
      })
    ),
  ]);

  return { tokenVar, personList: p, leaveList: l };
}

/* ── person/bulk-view ── */

export interface KolayUnitItem {
  unitItemId: string;
  unitItemName: string;
  unitId: string;
  unitName: string;
}

interface KolayUnitAssignment {
  startDate?: string;
  endDate?: string;
  managerId?: string | null;
  default?: boolean;
  active?: boolean;
  items?: KolayUnitItem[];
}

interface KolayPersonDetailRaw {
  id: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string | null;
  status?: string;
  employmentStartDate?: string | null;
  unitList?: KolayUnitAssignment[];
}

/** PDKS'in ihtiyaç duyduğu alanlara indirgenmiş kişi kaydı. */
export interface KolayPersonDetail {
  id: string;
  ad: string;
  soyad: string;
  tamAd: string;
  isEposta: string | null;
  /** "Bölüm" — PDKS'teki `pozisyon` alanıyla aynı değerleri taşır. */
  bolum: string | null;
  /** "Departman" — takım. */
  departman: string | null;
  unvan: string | null;
  firma: string | null;
  sube: string | null;
  managerKolayId: string | null;
  iseGiris: string | null;
  durum: string;
}

/** Yalnızca yürürlükteki (active) birim ataması geçerli; eskiler geçmiş kaydı. */
function currentAssignment(p: KolayPersonDetailRaw): KolayUnitAssignment | null {
  const list = p.unitList ?? [];
  return list.find((u) => u.active) ?? list.find((u) => u.default) ?? null;
}

function unitValue(a: KolayUnitAssignment | null, unitName: string): string | null {
  if (!a) return null;
  return a.items?.find((i) => i.unitName === unitName)?.unitItemName ?? null;
}

function toDetail(p: KolayPersonDetailRaw): KolayPersonDetail {
  const a = currentAssignment(p);
  const ad = (p.firstName ?? "").trim();
  const soyad = (p.lastName ?? "").trim();
  return {
    id: p.id,
    ad,
    soyad,
    tamAd: `${ad} ${soyad}`.trim(),
    isEposta: p.workEmail ?? null,
    bolum: unitValue(a, "Bölüm"),
    departman: unitValue(a, "Departman"),
    unvan: unitValue(a, "Unvan"),
    firma: unitValue(a, "Firma"),
    sube: unitValue(a, "Şube"),
    managerKolayId: a?.managerId ?? null,
    iseGiris: p.employmentStartDate ?? null,
    durum: p.status ?? "active",
  };
}

/** bulk-view tek istekte sınırlı sayıda kişi kabul ediyor. */
const BULK_CHUNK = 50;

/** Verilen kimlikler için ayrıntılı kayıtları gruplar hâlinde çeker. */
export async function fetchKolayPersonDetails(ids: string[]): Promise<KolayPersonDetail[]> {
  const out: KolayPersonDetail[] = [];
  for (let i = 0; i < ids.length; i += BULK_CHUNK) {
    const data = await call<{ persons: KolayPersonDetailRaw[] }>("/person/bulk-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_ids: ids.slice(i, i + BULK_CHUNK) }),
    });
    out.push(...(data.persons ?? []).map(toDetail));
  }
  return out;
}

/** Tüm aktif çalışanların ayrıntılı kaydı (person/list + bulk-view). */
export async function fetchAllKolayDetails(): Promise<KolayPersonDetail[]> {
  const people = await fetchKolayPeople(true);
  return fetchKolayPersonDetails(people.map((p) => p.id));
}
