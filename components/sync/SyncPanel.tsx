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

export default function SyncPanel({ initial }: { initial: SyncStatus }) {
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

      <div className="glass-card p-4">
        <div className="mb-3 text-sm font-medium">İşlemler</div>
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
            {running ? "Çalışıyor…" : "Yeni Verileri Al"}
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
          <strong style={{ color: "var(--tx-secondary)" }}>Yeni Verileri Al:</strong> yalnızca son
          senkronizasyondan sonra eklenen turnike kayıtlarını okur ve etkilenen günleri yeniden
          hesaplar — saniyeler sürer.
          <br />
          <strong style={{ color: "var(--tx-secondary)" }}>Tümünü Yeniden Hesapla:</strong> Kapı
          Ayarları veya gece vardiyası listesi değiştiyse gerekir; tüm günleri baştan işler.
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
