// Otomatik senkronizasyon.
//
// Kullanıcı kararı: hiçbir şey elle tetiklenmeyecek. Yeni turnike kaydı
// geldiğinde sistem kendisi hesaplayıp üstüne eklemeli, Kolay İK personeli de
// kendisi tazelemeli.
//
// İKİ TETİKLEYİCİ, TEK MOTOR:
//   1. Zamanlanmış görev — /api/cron (bkz. vercel.json). Asıl yol.
//   2. Sayfa isteği sonrası — Next `after()` ile, yanıtı bloke etmeden
//      (bkz. app/(app)/layout.tsx). Cron'un çalışmadığı/gecikmiş olduğu
//      durumlarda sistemin kendini toparlamasını sağlar.
//
// İkisi aynı anda denk gelebileceği için veritabanı üzerinden dağıtık kilit
// kullanılır (pdks_sync_state.auto_lock_at). Kilit olmadan aynı gün iki kez
// hesaplanır ve biri diğerinin yazdığı satırları silebilir.
import "server-only";
import { supabaseServer } from "../db/supabaseServer";
import { invalidateAll } from "../data/periodCache";
import { runSync, syncStatus } from "./runSync";
import { syncKolayPersons } from "../kolay/sync";
import { syncTeams } from "../db/queries/teams";

/** Kilit bu süre boyunca geçerli; sahibi çökerse sonra devralınır. */
const LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Boşta kalındığında PDKS durumunun yeniden doğrulanma sıklığı.
 *
 * Bu bir gecikme DEĞİL: yeni kayıt geldiğinde `stale` (maxSourceId > işlenen)
 * doğrudan true olur ve aşağıdaki eşikten bağımsız olarak hemen işlenir. Buradaki
 * eşik yalnızca "yapılacak hiçbir şey yokken ne sıklıkta boş tur atılsın"
 * sorusunu yanıtlıyor — canlı nabız 20 sn'de bir çağırdığı için bunu 3 dakikada
 * bırakmak durum ekranındaki "son senkronizasyon" saatini gereksiz eski
 * gösteriyordu.
 */
const PDKS_CHECK_EVERY_MS = 60 * 1000;

/** Kolay İK personel/birim bilgisi bu kadar eskiyse tazelenir. */
const KOLAY_STALE_MS = 6 * 60 * 60 * 1000;

export interface AutoSyncReport {
  calisti: boolean;
  /** Kilit başkasındaydı ya da hiçbir iş yoktu. */
  atlandi: string | null;
  /** Şema eksik — otomasyon çalışamıyor (migration 0007). */
  kurulumEksik: boolean;
  pdksTur: number;
  pdksMesaj: string | null;
  pdksTamamlandi: boolean;
  kolayTazelendi: boolean;
  kolayMesaj: string | null;
  sureMs: number;
}

/**
 * Kilidi almaya çalışır. Koşullu UPDATE: yalnızca kilit boşsa veya süresi
 * geçmişse yazar. Etkilenen satır dönmezse kilit başkasındadır.
 */
type LockResult = "alindi" | "mesgul" | "sutun_yok";

async function acquireLock(): Promise<LockResult> {
  const sb = supabaseServer();
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOCK_TTL_MS).toISOString();

  const { data, error } = await sb
    .from("pdks_sync_state")
    .update({ auto_lock_at: now.toISOString() })
    .eq("id", 1)
    .or(`auto_lock_at.is.null,auto_lock_at.lt.${cutoff}`)
    .select("id");

  if (error) {
    // Sütun yoksa (migration 0007 çalıştırılmamış) kilitsiz devam etmek yerine
    // hiç çalışmıyoruz — eşzamanlı çalıştırma veri bozabilir. Durumu ayrı
    // döndürüyoruz ki arayüzde "meşgul" gibi yanıltıcı görünmesin.
    if (/auto_lock_at/i.test(error.message)) return "sutun_yok";
    throw new Error(`senkronizasyon kilidi alınamadı: ${error.message}`);
  }
  return (data ?? []).length > 0 ? "alindi" : "mesgul";
}

async function releaseLock(): Promise<void> {
  const sb = supabaseServer();
  await sb.from("pdks_sync_state").update({ auto_lock_at: null }).eq("id", 1);
}

/** Kolay personel önbelleğinin yaşı; hiç yoksa null. */
async function kolayCacheAge(): Promise<number | null> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("kolay_persons").select("synced_at").limit(1);
  if (error) return null; // tablo yok → tazeleme denenmez
  const rows = (data ?? []) as unknown as { synced_at: string | null }[];
  if (rows.length === 0) return Infinity; // tablo boş → hemen doldur
  const ts = rows[0]?.synced_at;
  return ts ? Date.now() - new Date(ts).getTime() : Infinity;
}

/**
 * Gerekiyorsa senkronizasyonu çalıştırır.
 *
 * @param budgetMs Bu süreyi aşmadan durur — serverless zaman limitine
 *   takılmamak için. Tam yeniden hesaplama parçalı olduğu için yarıda kesmek
 *   güvenli; kalan kısım bir sonraki çalıştırmada `rebuild_cursor`'dan sürer.
 * @param fullRebuild true ise devam eden tam yeniden hesaplama da sürdürülür.
 *   Sayfa isteklerinde false verilir (uzun sürer, isteği pahalılaştırır).
 */
export async function autoSync(
  opts: { budgetMs?: number; fullRebuild?: boolean } = {}
): Promise<AutoSyncReport> {
  const budgetMs = opts.budgetMs ?? 45_000;
  const fullRebuild = opts.fullRebuild ?? true;
  const t0 = Date.now();
  const rapor: AutoSyncReport = {
    calisti: false,
    atlandi: null,
    kurulumEksik: false,
    pdksTur: 0,
    pdksMesaj: null,
    pdksTamamlandi: true,
    kolayTazelendi: false,
    kolayMesaj: null,
    sureMs: 0,
  };

  // Ucuz ön kontrol: kilidi almadan önce yapılacak iş var mı?
  const durum = await syncStatus().catch(() => null);
  const kolayYas = await kolayCacheAge();

  const pdksIsVar = Boolean(
    durum && (durum.stale || (durum.rebuilding && fullRebuild))
  );
  const pdksKontrolGerek =
    !durum?.lastSyncAt || Date.now() - new Date(durum.lastSyncAt).getTime() > PDKS_CHECK_EVERY_MS;
  const kolayIsVar = kolayYas !== null && kolayYas > KOLAY_STALE_MS;

  if (!pdksIsVar && !kolayIsVar && !pdksKontrolGerek) {
    rapor.atlandi = "Veri güncel, yapılacak iş yok.";
    rapor.sureMs = Date.now() - t0;
    return rapor;
  }

  const kilit = await acquireLock();
  if (kilit !== "alindi") {
    rapor.atlandi =
      kilit === "sutun_yok"
        ? "Otomatik senkronizasyon kurulmamış: pdks_sync_state.auto_lock_at sütunu yok (migration 0007 çalıştırılmalı)."
        : "Başka bir senkronizasyon sürüyor.";
    rapor.kurulumEksik = kilit === "sutun_yok";
    rapor.sureMs = Date.now() - t0;
    return rapor;
  }

  rapor.calisti = true;
  try {
    // 1) PDKS — yeni turnike kayıtlarını işle. Tam yeniden hesaplama parçalı
    //    olduğu için bütçe bitene kadar tur atıyoruz.
    if (pdksIsVar || pdksKontrolGerek) {
      for (let tur = 0; tur < 20; tur++) {
        if (Date.now() - t0 > budgetMs) {
          rapor.pdksTamamlandi = false;
          break;
        }
        const r = await runSync();
        rapor.pdksTur++;
        rapor.pdksMesaj = r.message;
        if (r.done) break;
        if (!fullRebuild && r.mode === "full") {
          // Sayfa isteğinde tam yeniden hesaplamayı sürüklemeyelim; cron devralır.
          rapor.pdksTamamlandi = false;
          break;
        }
      }
    }

    // 2) Kolay İK — personel/birim bilgisi ve takım tanımları.
    if (kolayIsVar && Date.now() - t0 < budgetMs) {
      try {
        const k = await syncKolayPersons();
        const t = await syncTeams();
        rapor.kolayTazelendi = true;
        rapor.kolayMesaj = `${k.toplam} çalışan (${k.satis} satış), ${t.eklendi} takım eklendi, ${t.guncellendi} güncellendi.`;
      } catch (e) {
        // Kolay erişilemezse PDKS tarafını başarısız saymıyoruz.
        rapor.kolayMesaj = `Kolay İK tazelenemedi: ${e instanceof Error ? e.message : "hata"}`;
      }
    }
  } finally {
    await releaseLock();
    invalidateAll();
  }

  rapor.sureMs = Date.now() - t0;
  return rapor;
}

export interface AutoSyncHealth {
  /** pdks_sync_state.auto_lock_at var mı? Yoksa otomasyon hiç çalışmaz. */
  kilitHazir: boolean;
  /** kolay_persons tablosu var mı? */
  kolayTabloHazir: boolean;
  /** Kolay personel önbelleğindeki kayıt sayısı. */
  kolayKayit: number;
  /** Kolay verisinin son tazelenme zamanı. */
  kolaySyncedAt: string | null;
  /** Eksik olan kurulum adımları — arayüzde listelenir. */
  eksikler: string[];
}

/** Otomasyonun çalışabilir durumda olup olmadığını raporlar. */
export async function autoSyncHealth(): Promise<AutoSyncHealth> {
  const sb = supabaseServer();

  const [kilitRes, kolayRes] = await Promise.all([
    sb.from("pdks_sync_state").select("auto_lock_at").eq("id", 1).limit(1),
    sb.from("kolay_persons").select("synced_at", { count: "exact" }).limit(1),
  ]);

  const kilitHazir = !kilitRes.error;
  const kolayTabloHazir = !kolayRes.error;
  const kolayRows = (kolayRes.data ?? []) as unknown as { synced_at: string | null }[];

  const eksikler: string[] = [];
  if (!kilitHazir) {
    eksikler.push(
      "pdks_sync_state tablosuna auto_lock_at sütunu eklenmeli (migration 0007) — bu olmadan otomatik senkronizasyon hiç çalışmaz."
    );
  }
  if (!kolayTabloHazir) {
    eksikler.push(
      "kolay_persons tablosu oluşturulmalı (migration 0006) — bu olmadan izinler sicile bağlanamaz ve takımlar Kolay İK'dan beslenemez."
    );
  }

  return {
    kilitHazir,
    kolayTabloHazir,
    kolayKayit: kolayRes.count ?? 0,
    kolaySyncedAt: kolayRows[0]?.synced_at ?? null,
    eksikler,
  };
}
