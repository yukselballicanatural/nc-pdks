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
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.075)" }}>
      {/* Başlık şeridi */}
      <div
        className="relative flex flex-wrap items-center gap-3 px-7 py-5 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,17,40,0.60) 0%, rgba(5,9,26,0.40) 100%)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Soldan yumuşak sky tonu */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 top-0 h-full w-40 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 160px 80px at 0% 50%, rgba(56,189,248,0.18), transparent)",
          }}
        />

        <div className="relative min-w-0 flex-1">
          <h1
            className="text-2xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--tx-primary)" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: "var(--tx-secondary)" }}
            >
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="relative ml-auto flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Tarih aralığı şeridi */}
      {showDateBar && range && counts && (
        <Suspense
          fallback={
            <div
              className="h-11"
              style={{
                background: "rgba(5,9,26,0.55)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
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
