"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Notice, { Vurgu } from "@/components/ui/Notice";

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
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.originalAgentName || "-"}</span>,
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
          <span className="pill pill-danger">Eksik</span>
        ),
      sortValue: (r) => Number(r.employmentNo) || 9e15,
    },
    {
      key: "pdks",
      header: "PDKS Kaydı",
      align: "center",
      cell: (r) =>
        r.pdksVar ? (
          <span className="pill pill-ok">Var</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => (r.pdksVar ? 0 : 1),
    },
    { key: "role", header: "Rol / Takım", cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.role || "-"}</span>, sortValue: (r) => r.role },
    { key: "email", header: "E-posta", cell: (r) => <span className="cell-code">{r.email || "-"}</span>, sortValue: (r) => r.email },
    {
      key: "start",
      header: "İşe Giriş",
      align: "center",
      cell: (r) => <span className="tabular-nums" style={{ color: "var(--tx-secondary)" }}>{r.startDate ?? "-"}</span>,
      sortValue: (r) => r.startDate ?? "",
    },
    { key: "sen", header: "Kıdem", align: "center", cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.seniority || "-"}</span>, sortValue: (r) => r.seniority },
    {
      key: "status",
      header: "Durum",
      align: "center",
      cell: (r) => (
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            r.status === "active" ? "pill-ok" : "pill-mute"
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
      <Notice ton="info" className="mb-4">
        Bu liste <Vurgu>zoho_users</Vurgu> tablosundan salt-okunur gelir.{" "}
        <span style={{ color: "var(--cl-warn)", fontWeight: 600 }}>
          Sicil (Employment No) eksik olan kayıtlar
        </span>{" "}
        PDKS verisiyle sadece isim üzerinden eşleşebilir — Zoho CRM&apos;de bu alanı doldurmak
        eşleşmeyi kesinleştirir.
      </Notice>
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
