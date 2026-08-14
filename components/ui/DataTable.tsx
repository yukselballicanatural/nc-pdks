"use client";

import { useMemo, useState } from "react";

export type ColType = "str" | "num" | "time" | "date";

export interface Column<T> {
  key: string;
  header: string;
  type?: ColType;
  align?: "left" | "right" | "center";
  width?: string;
  /** Görüntülenecek içerik. */
  cell: (row: T) => React.ReactNode;
  /** Sıralama için ham değer (verilmezse sıralama kapalı). */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Arama yapılacak metni üretir; verilmezse arama kutusu gizlenir. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Ek dropdown filtreleri. */
  filters?: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
  }[];
  rowClass?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  /** Büyük tablolarda ilk N satırı göster, "daha fazla" ile artır. */
  pageSize?: number;
  toolbarExtra?: React.ReactNode;
}

function norm(s: string): string {
  return s
    .toLocaleUpperCase("tr-TR")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/* Sıralama ok SVG'leri */
function ChevronUp({ active }: { active: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        display: "inline",
        marginLeft: 3,
        color: active ? "var(--ac-sky)" : "var(--tx-disabled)",
        verticalAlign: "middle",
        transition: "color 0.15s",
      }}
    >
      <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronDown({ active }: { active: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        display: "inline",
        marginLeft: 3,
        color: active ? "var(--ac-sky)" : "var(--tx-disabled)",
        verticalAlign: "middle",
        transition: "color 0.15s",
      }}
    >
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = "Ara...",
  filters,
  rowClass,
  onRowClick,
  emptyText = "Kayıt bulunamadı.",
  pageSize = 300,
  toolbarExtra,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [limit, setLimit] = useState(pageSize);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    if (!q || !searchText) return rows;
    return rows.filter((r) => norm(searchText(r)).includes(q));
  }, [rows, search, searchText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "tr") * dir;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const visible = sorted.slice(0, limit);

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      {/* Toolbar */}
      {(searchText || filters?.length || toolbarExtra) && (
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          {searchText && (
            <div className="relative">
              {/* Arama ikonu */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--tx-muted)" }}
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(pageSize);
                }}
                className="input-glass w-64 pl-8 pr-3 py-2 text-sm"
              />
            </div>
          )}
          {filters?.map((f) => (
            <select
              key={f.label}
              value={f.value}
              onChange={(e) => {
                f.onChange(e.target.value);
                setLimit(pageSize);
              }}
              className="input-glass max-w-56 px-2 py-2 text-sm"
            >
              <option value="">{f.label}</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          {toolbarExtra}
          <span
            className="ml-auto text-xs tabular-nums"
            style={{ color: "var(--tx-muted)" }}
          >
            {sorted.length.toLocaleString("tr-TR")} kayıt
            {sorted.length !== rows.length &&
              ` (toplam ${rows.length.toLocaleString("tr-TR")})`}
          </span>
        </div>
      )}

      {/* Tablo */}
      <div className="glass-table overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="glass-thead sticky top-0 z-10">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  style={
                    c.width
                      ? { width: c.width, color: "var(--tx-secondary)" }
                      : { color: "var(--tx-secondary)" }
                  }
                  className={`whitespace-nowrap px-3 py-3 text-[10.5px] font-semibold uppercase tracking-wider ${
                    c.align === "right"
                      ? "text-right"
                      : c.align === "center"
                        ? "text-center"
                        : "text-left"
                  } ${c.sortValue ? "cursor-pointer select-none hover:text-[var(--tx-primary)] transition-colors duration-150" : ""}`}
                >
                  {c.header}
                  {c.sortValue && sortKey === c.key
                    ? sortDir === "asc"
                      ? <ChevronUp active />
                      : <ChevronDown active />
                    : c.sortValue
                      ? <ChevronUp active={false} />
                      : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, idx) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`${onRowClick ? "cursor-pointer" : ""} ${
                  rowClass?.(r) ?? ""
                }`}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.048)",
                  transition: "background 0.12s",
                  background:
                    idx % 2 === 0
                      ? "rgba(255,255,255,0.013)"
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "rgba(56,189,248,0.055)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    idx % 2 === 0 ? "rgba(255,255,255,0.013)" : "transparent";
                }}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 ${
                      c.align === "right"
                        ? "text-right tabular-nums"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                    style={{
                      color: "var(--tx-primary)",
                      fontFeatureSettings: c.align === "right" ? '"tnum"' : undefined,
                    }}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-sm"
                  style={{ color: "var(--tx-muted)" }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--tx-disabled)" }} aria-hidden>
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
                    </svg>
                    {emptyText}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Daha fazla */}
      {sorted.length > visible.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setLimit((l) => l + pageSize)}
            className="btn-ghost inline-flex items-center gap-2 px-5 py-2 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6"/>
            </svg>
            Daha fazla göster —{" "}
            {(sorted.length - visible.length).toLocaleString("tr-TR")} kayıt kaldı
          </button>
        </div>
      )}
    </div>
  );
}
