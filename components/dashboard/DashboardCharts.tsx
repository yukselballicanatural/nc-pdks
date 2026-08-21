"use client";

// Dashboard grafikleri.
//
// RENKLER: SVG sunum özniteliklerinde (fill/stroke) doğrudan `var(--token)`
// kullanılıyor — modern tarayıcıların tamamı destekliyor. Böylece grafikler
// tema değişince JS'siz, kendiliğinden yeni palete geçiyor; renkleri JS'te
// okuyup state'te tutmak gerekmiyor.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = "var(--tx-muted)";
const GRID = "var(--edge-soft)";

const tooltipStyle: React.CSSProperties = {
  background: "var(--sf-strong)",
  border: "1px solid var(--edge)",
  borderRadius: "var(--r-sm)",
  fontSize: 12,
  color: "var(--tx-primary)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  boxShadow: "var(--sh-2)",
  padding: "9px 13px",
};

const legendStyle: React.CSSProperties = { fontSize: 11.5, color: "var(--tx-secondary)" };

export interface DayPoint {
  gun: string;
  saat: number;
  kisi: number;
}

export interface TlPoint {
  tl: string;
  eksikSaat: number;
  kisi: number;
}

export interface DurumPoint {
  name: string;
  value: number;
}

const DURUM_COLORS: Record<string, string> = {
  Tamam: "var(--cl-ok)",
  Eksik: "var(--cl-danger)",
  "Hiç gelmemiş": "var(--cl-violet)",
};

/** Grafik paneli başlığı — sol aksan çubuğu (§11). */
function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div
        aria-hidden
        className="h-3.5 w-[3px] rounded-full"
        style={{ background: "linear-gradient(180deg, var(--ac-sky), var(--ac-cyan))" }}
      />
      <span className="text-[13px] font-semibold" style={{ color: "var(--tx-primary)" }}>
        {children}
      </span>
    </div>
  );
}

/** Veri yokken grafik yerine açıklayıcı bir boşluk — boş eksen çizmekten iyi. */
function BosGrafik({ yukseklik, mesaj }: { yukseklik: string; mesaj: string }) {
  return (
    <div
      className={`flex ${yukseklik} flex-col items-center justify-center gap-2.5 text-center`}
      style={{ color: "var(--tx-secondary)" }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--tx-disabled)" }}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
      <span className="text-xs">{mesaj}</span>
    </div>
  );
}

export function GunlukTrendChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="glass-chart glass-hairline p-5">
      <ChartTitle>Günlük Toplam Çalışma</ChartTitle>
      {data.length === 0 ? (
        <BosGrafik yukseklik="h-60" mesaj="Bu dönemde çalışma kaydı yok." />
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 12, bottom: 4, left: -14 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
              <XAxis
                dataKey="gun"
                stroke={GRID}
                fontSize={10.5}
                tickMargin={7}
                tick={{ fill: AXIS }}
                tickLine={false}
              />
              <YAxis
                stroke={GRID}
                fontSize={10.5}
                tick={{ fill: AXIS }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "var(--ac-sky-edge)", strokeWidth: 1 }}
                formatter={
                  ((v: number, n: string) =>
                    n === "saat"
                      ? [`${v.toFixed(1)} saat`, "Toplam çalışma"]
                      : [String(v), "Gelen kişi"]) as never
                }
              />
              <Legend
                wrapperStyle={legendStyle}
                formatter={(v) => (v === "saat" ? "Toplam saat" : "Gelen kişi")}
              />
              <Line
                type="monotone"
                dataKey="saat"
                stroke="var(--ac-sky)"
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4.5, fill: "var(--ac-sky)", stroke: "var(--ac-sky-dim)", strokeWidth: 7 }}
              />
              <Line
                type="monotone"
                dataKey="kisi"
                stroke="var(--cl-warn)"
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4.5, fill: "var(--cl-warn)", stroke: "var(--cl-warn-dim)", strokeWidth: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DurumPieChart({ data }: { data: DurumPoint[] }) {
  return (
    <div className="glass-chart glass-hairline p-5">
      <ChartTitle>Personel Durum Dağılımı</ChartTitle>
      {data.length === 0 ? (
        <BosGrafik yukseklik="h-60" mesaj="Dağılım için yeterli veri yok." />
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="48%"
                outerRadius="76%"
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={DURUM_COLORS[d.name] ?? "var(--tx-muted)"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={((v: number) => [`${v} kişi`, ""]) as never}
              />
              <Legend wrapperStyle={legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function TlEksikChart({ data }: { data: TlPoint[] }) {
  return (
    <div className="glass-chart glass-hairline p-5">
      <ChartTitle>Ünvan Bazında Eksik Çalışma (en yüksek 12)</ChartTitle>
      {data.length === 0 ? (
        <BosGrafik yukseklik="h-60" mesaj="Bu dönemde eksik çalışma görünmüyor." />
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 8 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="4 4" horizontal={false} />
              <XAxis
                type="number"
                stroke={GRID}
                fontSize={10.5}
                tick={{ fill: AXIS }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="tl"
                stroke={GRID}
                fontSize={10}
                width={136}
                tick={{ fill: "var(--tx-secondary)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "var(--cl-danger-dim)" }}
                formatter={((v: number) => [`${v.toFixed(1)} saat`, "Eksik"]) as never}
              />
              <Bar dataKey="eksikSaat" fill="var(--cl-danger)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
