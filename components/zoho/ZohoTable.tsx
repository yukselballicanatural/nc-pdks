"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";

export interface ZohoRow {
  key: string;
  fullName: string;
  originalAgentName: string;
  employmentNo: string;
  email: string;
  role: string;
  status: string;
  startDate: string | null;
  seniority: string;
  region: string;
  pdksVar: boolean;
}

export default function ZohoTable({ rows }: { rows: ZohoRow[] }) {
  const [role, setRole] = useState("");
  const [durum, setDurum] = useState("");

  const roleList = useMemo(
    () => [...new Set(rows.map((r) => r.role).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (role && r.role !== role) return false;
        if (durum === "Aktif" && r.status !== "active") return false;
        if (durum === "Pasif" && r.status === "active") return false;
        if (durum === "Sicil No Eksik" && r.employmentNo) return false;
        if (durum === "PDKS Kaydı Var" && !r.pdksVar) return false;
        return true;
      }),
    [rows, role, durum]
  );

  const columns: Column<ZohoRow>[] = [
    { key: "fullName", header: "Görünen Ad", cell: (r) => <span className="font-medium">{r.fullName || "-"}</span>, sortValue: (r) => r.fullName },
    {
      key: "orig",
      header: "Gerçek Ad",
      cell: (r) => <span className="text-slate-400">{r.originalAgentName || "-"}</span>,
      sortValue: (r) => r.originalAgentName,
    },
    {
      key: "emp",
      header: "Sicil (Employment No)",
      align: "center",
      cell: (r) =>
        r.employmentNo ? (
          <span className="tabular-nums">{r.employmentNo}</span>
        ) : (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-300">Eksik</span>
        ),
      sortValue: (r) => Number(r.employmentNo) || 9e15,
    },
    {
      key: "pdks",
      header: "PDKS Kaydı",
      align: "center",
      cell: (r) =>
        r.pdksVar ? (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-300">Var</span>
        ) : (
          <span className="text-slate-600">-</span>
        ),
      sortValue: (r) => (r.pdksVar ? 0 : 1),
    },
    { key: "role", header: "Rol / Takım", cell: (r) => <span className="text-slate-400">{r.role || "-"}</span>, sortValue: (r) => r.role },
    { key: "email", header: "E-posta", cell: (r) => <span className="text-xs text-slate-500">{r.email || "-"}</span>, sortValue: (r) => r.email },
    {
      key: "start",
      header: "İşe Giriş",
      align: "center",
      cell: (r) => <span className="text-slate-400">{r.startDate ?? "-"}</span>,
      sortValue: (r) => r.startDate ?? "",
    },
    { key: "sen", header: "Kıdem", align: "center", cell: (r) => <span className="text-slate-400">{r.seniority || "-"}</span>, sortValue: (r) => r.seniority },
    {
      key: "status",
      header: "Durum",
      align: "center",
      cell: (r) => (
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            r.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-700/40 text-slate-500"
          }`}
        >
          {r.status === "active" ? "Aktif" : r.status || "-"}
        </span>
      ),
      sortValue: (r) => r.status,
    },
  ];

  return (
    <>
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
        Bu liste <span className="text-slate-300">zoho_users</span> tablosundan salt-okunur gelir.
        <span className="text-amber-300"> Sicil (Employment No) eksik olan kayıtlar</span> PDKS
        verisiyle sadece isim üzerinden eşleşebilir — Zoho CRM&apos;de bu alanı doldurmak eşleşmeyi
        kesinleştirir.
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.fullName} ${r.originalAgentName} ${r.employmentNo} ${r.email} ${r.role}`}
        searchPlaceholder="Ad, sicil, e-posta veya rol ara..."
        filters={[
          { label: "Tüm Roller", options: roleList, value: role, onChange: setRole },
          {
            label: "Tüm Kayıtlar",
            options: ["Aktif", "Pasif", "Sicil No Eksik", "PDKS Kaydı Var"],
            value: durum,
            onChange: setDurum,
          },
        ]}
      />
    </>
  );
}
