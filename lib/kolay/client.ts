// Kolay İK (kolayik.com) Public API istemcisi.
//
// Doğrulanmış gerçekler (canlı token ile denendi, 2026-08-14):
//   Kök       : https://api.kolayik.com/v2
//   Kimlik    : Authorization: Bearer <token>
//   person/list -> POST, gövde multipart/form-data, `status=1` zorunlu.
//                  Yanıt SADECE id/firstName/lastName içerir; sicil, vardiya,
//                  birim gibi alanlar bu uç noktada YOK. Onlar person/bulk-view
//                  ve unit/show-unit-tree'de, ikisi de bu token'a kapalı.
//   leave/list  -> GET, sorgu parametreleriyle.
//
// YETKİ NOTU: Bu token'da şu an leave/list izni AÇIK DEĞİL — çağrı, kapalı
// uç noktalarla birebir aynı "Geçersiz API bilgisi" hatasını döndürüyor
// (person/list aynı başlıkla sorunsuz çalışıyor, yani sorun token'ın kendisi
// değil kapsamı). İzin Kolay panelinden açıldığında burada kod değişikliği
// gerekmeden çalışacak; UI durumu kullanıcıya açıkça bildirir.
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

export interface KolayLeave {
  id?: string;
  personId?: string;
  person?: { id?: string; firstName?: string; lastName?: string };
  leaveType?: { id?: string; name?: string } | string;
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  duration?: number | string;
  comment?: string;
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
  const qs = new URLSearchParams();
  qs.set("startDate", kolayDate(opts.sd, "00:00:00"));
  qs.set("endDate", kolayDate(opts.ed, "23:59:59"));
  qs.set("limit", String(opts.limit ?? 1000));
  if (opts.status) qs.set("status", opts.status);
  if (opts.personId) qs.set("personId", opts.personId);
  qs.set("include_inactive_employees", "false");

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
