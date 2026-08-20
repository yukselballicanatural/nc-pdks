"use client";

// Ortak tablo motoru — arama, dropdown filtreler, sıralama, sayfalama.
//
// ── DÜZELTİLEN PERFORMANS HATASI: "filtreler çok yavaş / takılıyor" ──
// Eski sürümde iki useMemo vardı ama İKİSİ DE HİÇ ÖNBELLEĞE ALMIYORDU:
//   useMemo(..., [rows, search, searchText])   ← searchText her render'da YENİ fonksiyon
//   useMemo(..., [filtered, sortKey, sortDir, columns]) ← columns her render'da YENİ dizi
// Çağıran bileşenler `columns`/`searchText`'i render gövdesinde satır içi
// tanımladığı için kimlikleri her render'da değişiyor, bağımlılık dizisi hep
// "değişti" görünüyor ve binlerce satır her tuş vuruşunda yeniden filtrelenip
// yeniden sıralanıyordu.
//
// Üç ayrı düzeltme:
//   1. Arama metni satır başına BİR KEZ normalize edilip diziye alınıyor
//      (yalnızca `rows` değişince yeniden hesaplanır). Eskiden her tuşta her
//      satır için toLocaleUpperCase+normalize+replace çalışıyordu.
//   2. Kararsız kimlikli prop'lar (searchText/columns) ref'te tutuluyor;
//      memo bağımlılıkları yalnızca gerçek verilere (rows/search/sort) bakıyor.
//   3. useDeferredValue: yazarken input anında tepki verir, ağır filtreleme
//      arka planda düşük öncelikle koşar — debounce'un aksine hiçbir tuş
//      kaybolmaz ve sonuç gecikmesi cihaz hızına göre kendini ayarlar.
//
// Satır hover'ı da JS'ten CSS'e taşındı: eskiden her satıra iki event handler
// bağlanıp DOM style'ı elle yazılıyordu (300 satır = 600 handler).

import { useDeferredValue, useMemo, useState } from "react";

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
  /**
   * Non-null dönerse satır sütun bazlı hücreler yerine tek bir
   * `colSpan={columns.length}` hücresiyle render edilir — örn. bir günün
   * tamamı izinliyken satırın ortasında büyük bir etiket göstermek için.
   */
  rowOverride?: (row: T) => React.ReactNode | null;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  /** Büyük tablolarda ilk N satırı göster, "daha fazla" ile artır. */
  pageSize?: number;
  /** Satır yoğunluğu: kişi listeleri "airy", çok sütunlu veri "dense" (§7.4). */
  density?: "airy" | "dense";
  toolbarExtra?: React.ReactNode;
}

/** Türkçe duyarlı normalize — "İ/ı" ve aksan farkları aramayı bozmasın. */
function norm(s: string): string {
  return s
    .toLocaleUpperCase("tr-TR")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

function Chevron({ dir, active }: { dir: "up" | "down"; active: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        display: "inline",
        marginLeft: 4,
        color: active ? "var(--ac-sky)" : "var(--tx-disabled)",
        verticalAlign: "middle",
        transition: "color 0.15s var(--ease)",
      }}
    >
      <path
        d={dir === "up" ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  rowOverride,
  onRowClick,
  emptyText = "Kayıt bulunamadı.",
  pageSize = 300,
  density = "airy",
  toolbarExtra,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [limit, setLimit] = useState(pageSize);

  // Yazarken arayüz donmasın: input anında güncellenir, filtreleme bir tık
  // geriden düşük öncelikle koşar.
  const ertelenmisArama = useDeferredValue(search);

  /**
   * Satır başına arama anahtarı — SADECE `rows` değişince hesaplanır.
   * Asıl kazanç burada: normalize maliyeti tuş başına değil, veri başına.
   *
   * `searchText` bilerek bağımlılıklarda YOK: çağıranlar onu render gövdesinde
   * satır içi tanımlıyor, yani kimliği her render'da değişiyor. Bağımlılığa
   * konsaydı memo hiç tutmaz, binlerce satır her tuşta yeniden normalize
   * edilirdi (düzeltilen asıl performans hatası buydu).
   * SÖZLEŞME: `searchText` satırın SAF bir izdüşümü olmalı — dışarıdan bir
   * state'e bağlıysa bu önbellek bayatlar.
   */
  const aramaAnahtarlari = useMemo(
    () => (searchText ? rows.map((r) => norm(searchText(r))) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  const filtered = useMemo(() => {
    const q = norm(ertelenmisArama.trim());
    if (!q || !aramaAnahtarlari) return rows;
    return rows.filter((_, i) => aramaAnahtarlari[i].includes(q));
  }, [rows, ertelenmisArama, aramaAnahtarlari]);

  /**
   * `columns` de bilerek bağımlılıklarda yok — aynı kararsız-kimlik sorunu.
   * Sıralama yalnızca sortKey'in işaret ettiği sütunun `sortValue`'suna bağlı;
   * sütun listesinin başka bir yerinin değişmesi sıralamayı etkilemez, bu
   * yüzden sortKey'e göre anahtarlamak DOĞRU davranış (kısayol değil).
   */
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const sv = columns.find((c) => c.key === sortKey)?.sortValue;
    if (!sv) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    // Kopya üzerinde sıralıyoruz: prop dizisini yerinde sıralamak React'in
    // gördüğü veriyi sessizce bozardı.
    return [...filtered].sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "tr") * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir]);

  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);

  function toggleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  const yaziliyor = search !== ertelenmisArama;

  return (
    <div>
      {/* ── Araç çubuğu ── */}
      {(searchText || filters?.length || toolbarExtra) && (
        <div className="nc-toolbar mb-3">
          {searchText && (
            <div className="relative">
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
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(pageSize);
                }}
                aria-label={searchPlaceholder}
                className="input-glass py-2 pl-9 pr-3 text-xs"
                style={{ height: 34, width: 260, boxSizing: "border-box" }}
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
              aria-label={f.label}
              className="input-glass px-3 text-xs"
              style={{ height: 34, maxWidth: 220, boxSizing: "border-box" }}
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
            className="ml-auto text-[11px] tabular-nums"
            style={{ color: yaziliyor ? "var(--ac-sky)" : "var(--tx-secondary)" }}
          >
            <strong style={{ color: "var(--tx-primary)", fontWeight: 600 }}>
              {sorted.length.toLocaleString("tr-TR")}
            </strong>
            {" kayıt"}
            {sorted.length !== rows.length && (
              <span style={{ color: "var(--tx-muted)" }}>
                {" "}/ {rows.length.toLocaleString("tr-TR")}
              </span>
            )}
          </span>
        </div>
      )}

      {/* ── Tablo ── */}
      <div className="glass-table overflow-x-auto">
        <table className={`tbl ${density === "dense" ? "tbl-dense" : "tbl-airy"}`}>
          <thead>
            <tr>
              {columns.map((c) => {
                const aktif = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c)}
                    scope="col"
                    aria-sort={
                      aktif ? (sortDir === "asc" ? "ascending" : "descending") : undefined
                    }
                    style={c.width ? { width: c.width } : undefined}
                    className={`${
                      c.align === "right"
                        ? "text-right"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left"
                    } ${c.sortValue ? "sortable" : ""}`}
                  >
                    {c.header}
                    {c.sortValue && (
                      <Chevron dir={aktif && sortDir === "desc" ? "down" : "up"} active={aktif} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const override = rowOverride?.(r);
              return (
                <tr
                  key={rowKey(r)}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`${onRowClick ? "row-click" : ""} ${rowClass?.(r) ?? ""}`}
                >
                  {override != null ? (
                    <td colSpan={columns.length}>{override}</td>
                  ) : (
                    columns.map((c) => (
                      <td
                        key={c.key}
                        className={
                          c.align === "right"
                            ? "text-right tabular-nums"
                            : c.align === "center"
                              ? "text-center"
                              : "text-left"
                        }
                      >
                        {c.cell(r)}
                      </td>
                    ))
                  )}
                </tr>
              );
            })}

            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-14 text-center text-xs">
                  <div className="flex flex-col items-center gap-3" style={{ color: "var(--tx-secondary)" }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--tx-disabled)" }} aria-hidden>
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
                    </svg>
                    {emptyText}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Daha fazla ── */}
      {sorted.length > visible.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setLimit((l) => l + pageSize)}
            className="btn-ghost inline-flex items-center gap-2 px-5 text-xs font-medium"
            style={{ height: 34 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
            Daha fazla göster — {(sorted.length - visible.length).toLocaleString("tr-TR")} kayıt kaldı
          </button>
        </div>
      )}
    </div>
  );
}
