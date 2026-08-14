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
    <div className="border-b border-slate-800">
      <div className="flex flex-wrap items-center gap-3 px-6 py-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {showDateBar && range && counts && (
        <Suspense fallback={<div className="h-12 border-b border-slate-800 bg-slate-900/50" />}>
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
