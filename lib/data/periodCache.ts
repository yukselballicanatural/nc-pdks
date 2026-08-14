// Dönem verisi için kısa ömürlü süreç-içi önbellek.
//
// Materyalize tablolardan okuma zaten hızlı (~500 ms) ama her sayfa geçişinde
// 7 sorgu tekrar atılıyordu. Kullanıcı bir dönemi seçip sayfalar arasında
// dolaşırken bu iş tamamen tekrar — 60 sn boyunca aynı sonucu paylaşıyoruz.
//
// React'in `cache()`'i yalnızca TEK istek boyunca geçerlidir; bu ondan farklı,
// istekler arası. Sınırlı tutulur (MAX_ENTRIES) ki bellek büyümesin.
//
// Tazelik: veri değiştiren her yol (düzeltme kaydı/silme, kapı kuralı,
// senkronizasyon) invalidateAll() çağırır — bkz. app/actions ve app/api/sync.
import "server-only";

const TTL_MS = 60_000;
const MAX_ENTRIES = 8;

interface Entry<T> {
  at: number;
  value: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Anahtar başına en fazla TTL_MS boyunca aynı promise'i paylaşır.
 * Promise saklanır (değer değil) — böylece eşzamanlı istekler tek sorgu yapar.
 */
export function cachedByKey<T>(key: string, produce: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.value as Promise<T>;

  const value = produce();
  store.set(key, { at: now, value });

  // Hata durumunda önbellekte kalmasın, sonraki istek tekrar denesin.
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });

  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) store.delete(oldest[0]);
  }

  return value;
}

/** Veri değiştiren her işlemden sonra çağrılır. */
export function invalidateAll(): void {
  store.clear();
}
