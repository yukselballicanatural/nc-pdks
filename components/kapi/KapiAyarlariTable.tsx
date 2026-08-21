"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Notice, { Vurgu } from "@/components/ui/Notice";
import { setReaderAreaAction } from "@/app/actions/readerRules";
import type { ReaderArea } from "@/lib/engine/types";

export interface KapiRow {
  key: string;
  okuyucu: string;
  alan: ReaderArea;
  /** DB'de açık kayıt var mı (yoksa varsayılan kuraldan geliyor). */
  ozelKural: boolean;
  yon: string;
  kayitSayisi: number;
}

const ALAN_LABEL: Record<ReaderArea, string> = {
  work: "Çalışma Alanı (turnike)",
  break: "Mola / Turnike Dışı",
  ignore: "Hesaplamaya Katmama",
};

export default function KapiAyarlariTable({ rows }: { rows: KapiRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function change(row: KapiRow, value: string) {
    setError(null);
    setBusy(row.okuyucu);
    startTransition(async () => {
      const res = await setReaderAreaAction(row.okuyucu, value as ReaderArea | "default");
      if (!res.ok) setError(res.error);
      setBusy(null);
    });
  }

  const columns: Column<KapiRow>[] = [
    { key: "okuyucu", header: "Okuyucu / Kapı", cell: (r) => <span className="font-medium">{r.okuyucu}</span>, sortValue: (r) => r.okuyucu },
    {
      key: "yon",
      header: "Algılanan Yön",
      align: "center",
      cell: (r) => (
        <span
          style={{
            color:
              r.yon === "Giriş"
                ? "var(--cl-ok)"
                : r.yon === "Çıkış"
                  ? "var(--cl-warn)"
                  : "var(--cl-danger)",
            fontWeight: 600,
          }}
        >
          {r.yon === "-" ? "Belirsiz" : r.yon}
        </span>
      ),
      sortValue: (r) => r.yon,
    },
    {
      key: "kayit",
      header: "Kayıt Sayısı",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums" style={{ color: "var(--tx-secondary)" }}>
          {r.kayitSayisi.toLocaleString("tr-TR")}
        </span>
      ),
      sortValue: (r) => r.kayitSayisi,
    },
    {
      key: "alan",
      header: "Alan Sınıfı",
      cell: (r) => (
        <select
          value={r.ozelKural ? r.alan : "default"}
          disabled={pending && busy === r.okuyucu}
          onChange={(e) => change(r, e.target.value)}
          aria-label={`${r.okuyucu} alan sınıfı`}
          className="input-glass px-2 text-[11px] disabled:opacity-50"
          style={{ height: 28, boxSizing: "border-box" }}
        >
          <option value="default">Varsayılan ({ALAN_LABEL[r.alan]})</option>
          <option value="work">{ALAN_LABEL.work}</option>
          <option value="break">{ALAN_LABEL.break}</option>
          <option value="ignore">{ALAN_LABEL.ignore}</option>
        </select>
      ),
      sortValue: (r) => r.alan,
    },
    {
      key: "durum",
      header: "Geçerli Sınıf",
      align: "center",
      cell: (r) => (
        <span
          className={`pill ${
            r.alan === "work" ? "pill-ok" : r.alan === "ignore" ? "pill-mute" : "pill-warn"
          }`}
          title={r.ozelKural ? "Bu okuyucu için elle özel kural tanımlı" : undefined}
        >
          {r.alan === "work" ? "Çalışma" : r.alan === "ignore" ? "Yoksayılan" : "Mola/Dışı"}
          {r.ozelKural && <span aria-hidden style={{ opacity: 0.7 }}>•</span>}
        </span>
      ),
      sortValue: (r) => r.alan,
    },
  ];

  return (
    <>
      {error && (
        <Notice ton="danger" className="mb-3">
          {error}
        </Notice>
      )}

      <Notice ton="info" baslik="Alan sınıfları hesaplamayı nasıl etkiler?" className="mb-4">
        <ul className="space-y-1">
          <li>
            <span className="pill pill-ok">Çalışma Alanı</span> — giriş/çıkış çiftleri net çalışma
            süresini oluşturur. Varsayılan olarak adında &quot;Turnike&quot; geçen okuyucular.
          </li>
          <li>
            <span className="pill pill-warn">Mola / Turnike Dışı</span> — net çalışmaya sayılmaz,
            Mola Detayı sayfasında ayrı gösterilir.
          </li>
          <li>
            <span className="pill pill-mute">Hesaplamaya Katmama</span> — kayıt tamamen yok sayılır
            (ilk giriş / son çıkış hesabına bile girmez).
          </li>
          <li style={{ color: "var(--tx-secondary)" }}>
            <Vurgu>•</Vurgu> işareti: bu okuyucu için elle özel kural tanımlanmış (varsayılandan
            farklı olabilir).
          </li>
        </ul>
      </Notice>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => r.okuyucu}
        searchPlaceholder="Okuyucu ara..."
      />
    </>
  );
}
