"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [status, setStatus] = useState(initial);
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

      const st = await fetch("/api/sync").then((r) => r.json());
      if (!st.error) setStatus(st);
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
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--tx-muted)" }}>
            Durum
          </div>
          <div className="mt-2 text-lg font-semibold">
            {status.rebuilding ? (
              <span style={{ color: "var(--cl-warning, #fbbf24)" }}>Yeniden hesaplama yarıda</span>
            ) : status.stale ? (
              <span style={{ color: "var(--cl-warning, #fbbf24)" }}>Güncelleme bekliyor</span>
            ) : (
              <span style={{ color: "var(--cl-success, #34d399)" }}>Güncel</span>
            )}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--tx-secondary)" }}>
            {status.lastSyncAt
              ? `Son senkronizasyon: ${new Date(status.lastSyncAt).toLocaleString("tr-TR")}`
              : "Henüz hiç senkronize edilmedi"}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--tx-muted)" }}>
            İşlenmemiş Kayıt
          </div>
          <div className="mt-2 text-lg font-semibold tabular-nums">
            {bekleyen.toLocaleString("tr-TR")}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--tx-secondary)" }}>
            Kaynakta en son kayıt no: {status.currentMaxSourceId.toLocaleString("tr-TR")}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--tx-muted)" }}>
            Son İşlem
          </div>
          <div className="mt-2 text-sm" style={{ color: "var(--tx-secondary)" }}>
            {status.message || "—"}
          </div>
        </div>
      </div>

      {health.eksikler.length > 0 ? (
        <div
          className="rounded-xl p-4 text-xs leading-relaxed"
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.28)",
            color: "var(--tx-secondary)",
          }}
        >
          <div className="mb-1.5 text-sm font-semibold" style={{ color: "var(--cl-danger)" }}>
            Otomatik senkronizasyon çalışamıyor — veritabanı kurulumu eksik
          </div>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {health.eksikler.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p className="mt-2" style={{ color: "var(--tx-muted)" }}>
            Bu adımlar tamamlanana kadar aşağıdaki düğmelerle elle senkronize edebilirsiniz;
            hesaplama doğru çalışır, yalnızca otomatik tetikleme devre dışıdır.
          </p>
        </div>
      ) : null}

      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{
          background: "rgba(6,214,160,0.08)",
          border: "1px solid rgba(6,214,160,0.22)",
          color: "var(--tx-secondary)",
        }}
      >
        <div className="mb-1.5 text-sm font-semibold" style={{ color: "var(--ac-cyan)" }}>
          {health.eksikler.length === 0
            ? "Otomatik çalışıyor — elle bir şey yapmanız gerekmiyor"
            : "Otomatik çalışma nasıl işler"}
        </div>
        Yeni turnike kaydı geldiğinde sistem bunu kendisi görüp yalnızca etkilenen günleri
        hesaplayıp üstüne ekliyor. Kolay İK personel ve izin bilgisi de kendiliğinden
        tazeleniyor. İki tetikleyici var: zamanlanmış görev (10 dakikada bir) ve sayfa
        açılışlarının ardından çalışan arka plan kontrolü. Eşzamanlı çalışmayı veritabanı
        kilidi engelliyor.
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
        Aşağıdaki düğmelere yalnızca <span style={{ color: "var(--tx-primary)" }}>beklemek
        istemediğinizde</span> ya da Kapı Ayarları&apos;nı değiştirdikten sonra hemen sonuç
        görmek istediğinizde ihtiyaç duyarsınız.
      </div>

      <div className="glass-card p-4">
        <div className="mb-3 text-sm font-medium">Elle Tetikleme (isteğe bağlı)</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sync(false)}
            disabled={running}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #38bdf8, #06d6a0)",
              color: "#06091a",
            }}
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
            className="rounded-xl px-4 py-2 text-sm transition-all disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--tx-secondary)",
            }}
          >
            Tümünü Yeniden Hesapla
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--tx-muted)" }}>
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
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "var(--cl-danger, #f87171)",
          }}
        >
          {error}
        </div>
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
