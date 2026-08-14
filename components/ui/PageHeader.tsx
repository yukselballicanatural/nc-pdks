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
    <div
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex flex-wrap items-center gap-3 px-6 py-4"
        style={{
          background: "rgba(6,12,24,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div className="min-w-0">
          <h1
            className="text-lg font-semibold tracking-tight"
            style={{ color: "var(--tx-primary)" }}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm" style={{ color: "var(--tx-secondary)" }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        )}
      </div>
      {showDateBar && range && counts && (
        <Suspense
          fallback={
            <div
              className="h-11"
              style={{
                background: "rgba(6,12,24,0.6)",
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
