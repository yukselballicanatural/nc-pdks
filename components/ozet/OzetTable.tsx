"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { dkp, dks } from "@/lib/format";

export interface OzetRow {
  sicil: string;
  adSoyad: string;
  takimLideri: string;
  bolum: string;
  vardiya: "GECE" | "GUNDUZ";
  gerekenGun: number; // bg — dönemdeki hafta içi gün sayısı (herkes için aynı)
  gelinenGun: number; // cg — çalışma kaydı olan gün sayısı
  turnikeIci: number; // net
  turnikeDisi: number; // mola
  toplamSure: number; // brüt
  beklenenNet: number;
  netFark: number; // net - beklenen (pozitif = fazla)
  hafta: number; // cmt/paz net
  turnikeKaydi: number; // dönemdeki turnike (çalışma alanı) kayıt sayısı
  eksikGunler: { gs: string; gun: string }[];
}

export default function OzetTable({ rows }: { rows: OzetRow[] }) {
  const [tl, setTl] = useState("");
  const [durum, setDurum] = useState("");
  const [detay, setDetay] = useState<OzetRow | null>(null);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.takimLideri).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.takimLideri !== tl) return false;
        if (durum === "Turnike Kullananlar" && r.turnikeKaydi === 0) return false;
        if (durum === "Turnike Kullanmayanlar" && r.turnikeKaydi > 0) return false;
        if (durum === "Eksik" && (r.netFark >= 0 || r.turnikeKaydi === 0)) return false;
        if (durum === "Tamam" && r.netFark < 0) return false;
        if (durum === "Hiç Gelmemiş" && r.gelinenGun !== 0) return false;
        return true;
      }),
    [rows, tl, durum]
  );

  const turnikesizSayisi = useMemo(() => rows.filter((r) => r.turnikeKaydi === 0).length, [rows]);

  const columns: Column<OzetRow>[] = [
    {
      key: "sicil",
      header: "Sicil",
      width: "70px",
      cell: (r) => <span className="text-slate-500">{r.sicil}</span>,
      sortValue: (r) => Number(r.sicil) || r.sicil,
    },
    {
      key: "adSoyad",
      header: "Ad Soyad",
      cell: (r) => <span className="font-medium">{r.adSoyad}</span>,
      sortValue: (r) => r.adSoyad,
    },
    {
      key: "tl",
      header: "Takım Lideri",
      cell: (r) => (
        <span className={r.takimLideri === "Bilinmiyor" ? "text-red-400" : "text-slate-400"}>
          {r.takimLideri}
        </span>
      ),
      sortValue: (r) => r.takimLideri,
    },
    {
      key: "vardiya",
      header: "Vardiya",
      align: "center",
      cell: (r) => (
        <span className={r.vardiya === "GECE" ? "text-violet-300" : "text-amber-300"}>
          {r.vardiya === "GECE" ? "Gece" : "Gündüz"}
        </span>
      ),
      sortValue: (r) => r.vardiya,
    },
    {
      key: "gun",
      header: "Gereken / Geldiği Gün",
      align: "center",
      cell: (r) => (
        <span>
          <span className="text-slate-400">{r.gerekenGun}</span>
          <span className="text-slate-600"> / </span>
          <span className={r.gelinenGun < r.gerekenGun ? "text-red-400" : "text-emerald-400"}>
            {r.gelinenGun}
          </span>
        </span>
      ),
      sortValue: (r) => r.gelinenGun,
    },
    {
      key: "net",
      header: "Turnike İçi",
      align: "right",
      cell: (r) => dkp(r.turnikeIci),
      sortValue: (r) => r.turnikeIci,
    },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) => <span className="text-slate-400">{dkp(r.turnikeDisi)}</span>,
      sortValue: (r) => r.turnikeDisi,
    },
    {
      key: "brut",
      header: "Toplam Süre",
      align: "right",
      cell: (r) => <span className="text-slate-400">{dkp(r.toplamSure)}</span>,
      sortValue: (r) => r.toplamSure,
    },
    {
      key: "bek",
      header: "Beklenen Net",
      align: "right",
      cell: (r) => <span className="text-slate-500">{dkp(r.beklenenNet)}</span>,
      sortValue: (r) => r.beklenenNet,
    },
    {
      key: "fark",
      header: "Net Fark",
      align: "right",
      cell: (r) => (
        <span className={r.netFark < 0 ? "font-medium text-red-400" : "font-medium text-emerald-400"}>
          {dks(r.netFark)}
        </span>
      ),
      sortValue: (r) => r.netFark,
    },
    {
      key: "hafta",
      header: "Cmt/Paz",
      align: "right",
      cell: (r) => (r.hafta > 0 ? <span className="text-amber-300">{dkp(r.hafta)}</span> : <span className="text-slate-600">-</span>),
      sortValue: (r) => r.hafta,
    },
    {
      key: "durum",
      header: "Durum",
      align: "center",
      cell: (r) =>
        r.turnikeKaydi === 0 ? (
          <span
            className="rounded bg-slate-700/50 px-1.5 py-0.5 text-xs text-slate-400"
            title="Bu kişinin dönemde hiç turnike kaydı yok — turnike dışı kapıları kullanıyor, bu yüzden turnike bazlı çalışma süresi hesaplanamaz."
          >
            Turnike kaydı yok
          </span>
        ) : r.gelinenGun === 0 ? (
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">Hiç gelmemiş</span>
        ) : r.netFark < 0 ? (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-300">Eksik</span>
        ) : (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-300">Tamam</span>
        ),
      sortValue: (r) => (r.turnikeKaydi === 0 ? -1 : r.gelinenGun === 0 ? 0 : r.netFark < 0 ? 1 : 2),
    },
  ];

  return (
    <>
      {turnikesizSayisi > 0 && (
        <div className="mb-3 rounded border border-slate-700 bg-slate-800/40 p-2 text-xs text-slate-400">
          Bu dönemde <span className="text-slate-200">{turnikesizSayisi}</span> kişinin hiç turnike
          kaydı yok (teknik/depo/klinik personeli genelde &quot;Personel GİRİŞ&quot;, &quot;Soyunma
          Odası&quot;, &quot;Lobi geçiş&quot; kapılarını kullanıyor). Turnike bazlı çalışma süresi bu
          kişiler için hesaplanamaz; <span className="text-slate-200">Turnike kaydı yok</span> olarak
          işaretlendiler. Sadece turnike kullananları görmek için durum filtresinden{" "}
          <span className="text-slate-200">Turnike Kullananlar</span> seçin.
        </div>
      )}
      <p className="mb-3 text-xs text-slate-500">
        💡 Sütun başlığına tıkla = sırala · Satıra tıkla = eksik günleri gör
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.sicil}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.takimLideri} ${r.bolum}`}
        searchPlaceholder="Ad, soyad, sicil veya bölüm ara..."
        filters={[
          { label: "Tüm Takım Liderleri", options: tlList, value: tl, onChange: setTl },
          {
            label: "Tüm Durumlar",
            options: [
              "Turnike Kullananlar",
              "Turnike Kullanmayanlar",
              "Eksik",
              "Tamam",
              "Hiç Gelmemiş",
            ],
            value: durum,
            onChange: setDurum,
          },
        ]}
        onRowClick={(r) => setDetay(r)}
        rowClass={(r) =>
          r.turnikeKaydi === 0 ? "opacity-60" : r.gelinenGun === 0 ? "bg-red-950/20" : ""
        }
      />

      {detay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetay(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-lg font-semibold">{detay.adSoyad}</div>
            <div className="mb-4 text-sm text-slate-400">
              {detay.takimLideri} · Sicil {detay.sicil}
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-slate-800 p-2">
                <div className="text-xs text-slate-500">Turnike İçi (Net)</div>
                <div className="tabular-nums">{dkp(detay.turnikeIci)}</div>
              </div>
              <div className="rounded border border-slate-800 p-2">
                <div className="text-xs text-slate-500">Beklenen</div>
                <div className="tabular-nums">{dkp(detay.beklenenNet)}</div>
              </div>
            </div>
            <div className="mb-2 text-sm font-medium text-slate-300">
              Gelmediği İş Günleri ({detay.eksikGunler.length})
            </div>
            {detay.eksikGunler.length === 0 ? (
              <p className="text-sm text-emerald-400">Tüm iş günlerinde kayıt var.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detay.eksikGunler.map((d) => (
                  <li key={d.gs} className="flex justify-between rounded bg-slate-800/50 px-2 py-1">
                    <span>{d.gs}</span>
                    <span className="text-slate-500">{d.gun}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setDetay(null)}
              className="mt-4 w-full rounded-md border border-slate-700 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
