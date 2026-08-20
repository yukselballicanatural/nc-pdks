import { Suspense } from "react";
import DateRangeBar from "@/components/nav/DateRangeBar";
import { addDays, isWeekday } from "@/lib/engine/mesaiGunu";
import { nowWallClock, toDateParam } from "@/lib/engine/tz";
import type { DateRange } from "@/lib/data/loadPdks";

/** Dönemdeki toplam gün ve hafta içi (iş) günü sayısı — Özet'teki "Gereken Gün" ile aynı. */
export function rangeDayCounts(range: DateRange) {
  let dayCount = 0;
  let workdayCount = 0;
  for (let d = range.sd; d <= range.ed; d = addDays(d, 1)) {
    dayCount++;
    if (isWeekday(d)) workdayCount++;
  }
  return { dayCount, workdayCount };
}

export default function PageHeader({
  title,
  description,
  range,
  showDateBar = true,
  actions,
}: {
  title: string;
  description?: string;
  range?: DateRange;
  showDateBar?: boolean;
  actions?: React.ReactNode;
}) {
  const counts = range ? rangeDayCounts(range) : null;

  return (
    /* z-header: takvim/popover'ın tablo başlığının altında kalmaması için
       başlık kabı yüksek bir yığın katmanında durur (bkz. globals.css).
       BİLİNÇLİ OLARAK sticky DEĞİL: yapışkan olsaydı tablonun kendi sticky
       başlığı (top:0) bu şeridin ARKASINA girer, sütun adları görünmezdi. */
    <div
      className="z-header"
      style={{
        borderBottom: "1px solid var(--edge-soft)",
        background: "var(--sf-1)",
        backdropFilter: "blur(var(--blur)) saturate(var(--sat))",
        WebkitBackdropFilter: "blur(var(--blur)) saturate(var(--sat))",
      }}
    >
      {/* Başlık şeridi */}
      <div className="relative flex flex-wrap items-center gap-3 overflow-hidden px-6 py-4">
        {/* Soldan yumuşak marka tonu — cam üstünde derinlik hissi */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 top-0 h-full w-40"
          style={{
            background:
              "radial-gradient(ellipse 160px 80px at 0% 50%, var(--ac-sky-dim), transparent)",
          }}
        />

        <div className="relative min-w-0 flex-1">
          <h1
            className="text-[22px] font-semibold leading-tight"
            style={{ color: "var(--tx-primary)" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-0.5 text-[12.5px] leading-relaxed"
              style={{ color: "var(--tx-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="nc-toolbar relative ml-auto">{actions}</div>
        )}
      </div>

      {/* Tarih aralığı şeridi */}
      {showDateBar && range && counts && (
        <Suspense
          fallback={
            <div
              className="h-[55px]"
              style={{
                background: "var(--sf-2)",
                borderTop: "1px solid var(--edge-soft)",
              }}
            />
          }
        >
          <DateRangeBar
            sd={range.sdParam}
            ed={range.edParam}
            today={toDateParam(nowWallClock())}
            dayCount={counts.dayCount}
            workdayCount={counts.workdayCount}
          />
        </Suspense>
      )}
    </div>
  );
}
