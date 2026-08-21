"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Notice, { Vurgu } from "@/components/ui/Notice";

interface SyncStatus {
  lastSourceId: number;
  currentMaxSourceId: number;
  stale: boolean;
  rebuilding: boolean;
  lastSyncAt: string | null;
  message: string;
}

interface SyncResult {
  mode: string;
  done: boolean;
  processedDays: number;
  processedRows: number;
  shiftsWritten: number;
  alarmsWritten: number;
  cursor: string | null;
  message: string;
}

interface Health {
  kilitHazir: boolean;
  kolayTabloHazir: boolean;
  kolayKayit: number;
  kolaySyncedAt: string | null;
  eksikler: string[];
}

export default function SyncPanel({
  initial,
  health,
}: {
  initial: SyncStatus;
  health: Health;
}) {
  const router = useRouter();
  // Durum bilinçli olarak state'te TUTULMUYOR: `useState(initial)` prop değişince
  // güncellenmez, dolayısıyla canlı yenileme (LiveSync → router.refresh()) sunucudan
  // taze durum getirdiğinde ekran eski değeri göstermeye devam ederdi. Prop'un
  // kendisi tek kaynak; tazeleme sunucu tarafında olur.
  const status = initial;
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function addLog(line: string) {
    setLog((l) => [...l, line]);
  }

  /**
   * Tam yeniden hesaplama parça parça ilerler; `done: false` geldikçe tekrar
   * çağırıyoruz (her çağrı birkaç gün işler, serverless limitine sığsın diye).
   */
  async function sync(force: boolean) {
    setRunning(true);
    setError(null);
    setLog([]);
    try {
      for (let step = 0; step < 200; step++) {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: force && step === 0 }),
        });
        const data: SyncResult & { error?: string } = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? "Senkronizasyon başarısız.");
          break;
        }
        addLog(
          `${data.mode === "full" ? "Yeniden hesaplama" : "Artımlı güncelleme"}: ${data.message}` +
            (data.processedRows ? ` (${data.processedRows.toLocaleString("tr-TR")} ham kayıt okundu)` : "")
        );
        if (data.done) break;
      }

      // Durumu ayrıca çekmiyoruz: refresh sunucu bileşenini yeniden çizdirir ve
      // taze durum prop olarak gelir (tek kaynak).
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bilinmeyen hata");
    } finally {
      setRunning(false);
    }
  }

  const bekleyen = Math.max(0, status.currentMaxSourceId - status.lastSourceId);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--tx-secondary)" }}>
            Durum
          </div>
          <div className="mt-2 text-lg font-semibold">
            {status.rebuilding ? (
              <span className="pill pill-warn">Yeniden hesaplama yarıda</span>
            ) : status.stale ? (
              <span className="pill pill-warn">Güncelleme bekliyor</span>
            ) : (
              <span className="pill pill-ok">Güncel</span>
            )}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
            {status.lastSyncAt
              ? `Son senkronizasyon: ${new Date(status.lastSyncAt).toLocaleString("tr-TR")}`
              : "Henüz hiç senkronize edilmedi"}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--tx-secondary)" }}>
            İşlenmemiş Kayıt
          </div>
          <div className="mt-2 text-lg font-semibold tabular-nums">
            {bekleyen.toLocaleString("tr-TR")}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
            Kaynakta en son kayıt no: {status.currentMaxSourceId.toLocaleString("tr-TR")}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--tx-secondary)" }}>
            Son İşlem
          </div>
          <div className="mt-2 text-sm" style={{ color: "var(--tx-secondary)" }}>
            {status.message || "—"}
          </div>
        </div>
      </div>

      {health.eksikler.length > 0 ? (
        <Notice ton="danger" baslik="Otomatik senkronizasyon çalışamıyor — veritabanı kurulumu eksik">
          <ul className="list-inside list-disc space-y-1">
            {health.eksikler.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-2">
            Bu adımlar tamamlanana kadar aşağıdaki düğmelerle elle senkronize edebilirsiniz;
            hesaplama doğru çalışır, yalnızca otomatik tetikleme devre dışıdır.
          </p>
        </Notice>
      ) : null}

      <Notice
        ton="ok"
        baslik={
          health.eksikler.length === 0
            ? "Otomatik çalışıyor — elle bir şey yapmanız gerekmiyor"
            : "Otomatik çalışma nasıl işler"
        }
      >
        Yeni bir turnike geçişi veya mola/klinik/toplantı bildirimi Supabase&apos;e
        yazıldığı anda <span style={{ color: "var(--tx-primary)" }}>Supabase&apos;in kendisi
        haber verip</span> sistem etkilenen günü hesaplayıp üstüne ekliyor — bekleme yok.
        Kolay İK personel ve izin bilgisi de kendiliğinden tazeleniyor. Sayfa açıkken sağ
        alttaki &quot;Canlı&quot; göstergesi bunu 20 saniyede bir kontrol edip ekranı
        kendiliğinden tazeler; ayrıca sayfa açılışlarının ardından ve günde bir (Vercel Hobby
        planı sınırı) yedek bir kontrol daha çalışır. Eşzamanlı çalışmayı veritabanı kilidi
        engelliyor.
        {health.kolayTabloHazir && (
          <>
            {" "}
            Kolay İK önbelleğinde{" "}
            <span style={{ color: "var(--tx-primary)" }}>{health.kolayKayit}</span> çalışan var
            {health.kolaySyncedAt && (
              <> (son tazeleme: {new Date(health.kolaySyncedAt).toLocaleString("tr-TR")})</>
            )}
            .
          </>
        )}
        <br />
        <br />
        Aşağıdaki düğmelere yalnızca <Vurgu>beklemek istemediğinizde</Vurgu> ya da Kapı
        Ayarları&apos;nı değiştirdikten sonra hemen sonuç görmek istediğinizde ihtiyaç duyarsınız.
      </Notice>

      <div className="glass-card p-4">
        <div className="mb-3 text-sm font-medium">Elle Tetikleme (isteğe bağlı)</div>
        <div className="nc-toolbar">
          <button
            onClick={() => sync(false)}
            disabled={running}
            className="btn-base btn-primary px-4"
            style={{ height: 34 }}
          >
            {running ? "Çalışıyor…" : "Şimdi Kontrol Et"}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Tüm dönem baştan hesaplanacak. Veri kaybı olmaz (ham veri kaynakta durur) ama birkaç dakika sürebilir. Devam edilsin mi?"
                )
              )
                sync(true);
            }}
            disabled={running}
            className="btn-base btn-ghost px-4"
            style={{ height: 34 }}
          >
            Tümünü Yeniden Hesapla
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
          <strong style={{ color: "var(--tx-secondary)" }}>Şimdi Kontrol Et:</strong> otomatiğin
          bir sonraki turunu beklemeden yeni kayıtları işler — saniyeler sürer.
          <br />
          <strong style={{ color: "var(--tx-secondary)" }}>Tümünü Yeniden Hesapla:</strong> Kapı
          Ayarları veya gece vardiyası listesi değiştiyse gerekir. Bu değişiklikleri sistem
          kendisi de fark edip yeniden hesaplamayı başlatır; bu düğme yalnızca hemen bitmesini
          istediğinizde işe yarar.
        </p>
      </div>

      {error && (
        <Notice ton="danger">{error}</Notice>
      )}

      {log.length > 0 && (
        <div className="glass-card p-4">
          <div className="mb-2 text-sm font-medium">İşlem Kaydı</div>
          <ul className="space-y-1 text-xs" style={{ color: "var(--tx-secondary)" }}>
            {log.map((l, i) => (
              <li key={i} className="tabular-nums">
                {i + 1}. {l}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
