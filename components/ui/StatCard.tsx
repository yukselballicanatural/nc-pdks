// Gösterge (KPI) kartı — DESIGN_SYSTEM.md §10.
//
// Kartın üç görsel unsuru (üst kenar rengi, köşedeki ışıma, ikon zemini) TEK
// bir ton sınıfından türer (.kpi-sky, .kpi-warn ...). Renkler token olduğu
// için açık temada kendiliğinden okunur eşdeğerlerine döner.
//
// NOT (§10): color-mix() bilinçli olarak kullanılmıyor — desteklenmeyen bir
// tarayıcıda tüm bildirim geçersiz sayılır ve kart görünmez kalabilir. Ton
// varyantları düz CSS değişkenleriyle tanımlı.

const TONE_CLASS = {
  teal:   "kpi-sky",
  sky:    "kpi-sky",
  green:  "kpi-ok",
  cyan:   "kpi-cyan",
  red:    "kpi-danger",
  amber:  "kpi-warn",
  violet: "kpi-violet",
  slate:  "kpi-mute",
} as const;

export type StatTone = keyof typeof TONE_CLASS;

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** Emoji ya da kısa simge. Verilmezse ikon rozeti hiç çizilmez. */
  icon?: string;
  tone?: StatTone;
}) {
  return (
    <div className={`kpi ${TONE_CLASS[tone]}`}>
      <div className="flex items-start gap-2.5">
        {icon && (
          <span aria-hidden className="kpi-ico shrink-0 text-[14px] leading-none">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="kpi-label truncate">{label}</div>
          <div className="kpi-val mt-1.5">{value}</div>
        </div>
      </div>

      {/* §2.4 kontrast kuralı: ipucu --tx-muted DEĞİL --tx-secondary ile —
          küçük punto + en soluk ton camda pratikte okunmuyor. */}
      {hint && <div className="kpi-hint mt-2">{hint}</div>}
    </div>
  );
}
