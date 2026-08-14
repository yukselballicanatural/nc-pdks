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
      {(searchText || filters?.length || toolbarExtra) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {searchText && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(pageSize);
              }}
              className="w-64 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-teal-500"
            />
          )}
          {filters?.map((f) => (
            <select
              key={f.label}
              value={f.value}
              onChange={(e) => {
                f.onChange(e.target.value);
                setLimit(pageSize);
              }}
              className="max-w-56 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-teal-500"
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
          <span className="ml-auto text-xs text-slate-500">
            {sorted.length.toLocaleString("tr-TR")} kayıt
            {sorted.length !== rows.length && ` (toplam ${rows.length.toLocaleString("tr-TR")})`}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  style={c.width ? { width: c.width } : undefined}
                  className={`whitespace-nowrap px-3 py-2 font-medium ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  } ${c.sortValue ? "cursor-pointer select-none hover:text-slate-200" : ""}`}
                >
                  {c.header}
                  {sortKey === c.key && (
                    <span className="ml-1 text-teal-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`border-t border-slate-800 ${
                  onRowClick ? "cursor-pointer" : ""
                } hover:bg-slate-800/50 ${rowClass?.(r) ?? ""}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-1.5 ${
                      c.align === "right"
                        ? "text-right tabular-nums"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > visible.length && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setLimit((l) => l + pageSize)}
            className="rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Daha fazla göster ({(sorted.length - visible.length).toLocaleString("tr-TR")} kayıt kaldı)
          </button>
        </div>
      )}
    </div>
  );
}
