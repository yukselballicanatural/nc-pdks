"use client";

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

const AXIS   = "#3b5272";
const GRID   = "rgba(255,255,255,0.048)";

const tooltipStyle = {
  backgroundColor: "rgba(6, 12, 28, 0.96)",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: 14,
  fontSize: 12,
  color: "#f0f4ff",
  backdropFilter: "blur(24px)",
  boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset",
  padding: "10px 14px",
};

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
  Tamam:           "#34d399",
  Eksik:           "#f87171",
  "Hiç gelmemiş":  "#a78bfa",
};

/* Grafik paneli başlığı */
function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <div
        aria-hidden
        className="h-4 w-0.5 rounded-full"
        style={{ background: "linear-gradient(180deg, var(--ac-sky), var(--ac-cyan))" }}
      />
      <span
        className="text-sm font-semibold tracking-tight"
        style={{ color: "var(--tx-primary)" }}
      >
        {children}
      </span>
    </div>
  );
}

export function GunlukTrendChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="glass-chart p-6">
      <ChartTitle>Günlük Toplam Çalışma (saat)</ChartTitle>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
            <XAxis
              dataKey="gun"
              stroke={AXIS}
              fontSize={11}
              tickMargin={6}
              tick={{ fill: "#3b5272" }}
            />
            <YAxis stroke={AXIS} fontSize={11} tick={{ fill: "#3b5272" }} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: "rgba(56,189,248,0.18)", strokeWidth: 1 }}
              formatter={((v: number, n: string) =>
                n === "saat"
                  ? [`${v.toFixed(1)} saat`, "Toplam çalışma"]
                  : [String(v), "Gelen kişi"]) as never}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#7a96be" }}
              formatter={(v) => (v === "saat" ? "Toplam saat" : "Gelen kişi")}
            />
            <Line
              type="monotone"
              dataKey="saat"
              stroke="#38bdf8"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 5, fill: "#38bdf8", stroke: "rgba(56,189,248,0.35)", strokeWidth: 8 }}
            />
            <Line
              type="monotone"
              dataKey="kisi"
              stroke="#fbbf24"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 5, fill: "#fbbf24", stroke: "rgba(251,191,36,0.35)", strokeWidth: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DurumPieChart({ data }: { data: DurumPoint[] }) {
  return (
    <div className="glass-chart p-6">
      <ChartTitle>Personel Durum Dağılımı</ChartTitle>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="46%"
              outerRadius="74%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={DURUM_COLORS[d.name] ?? "#3b5272"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={((v: number) => [`${v} kişi`, ""]) as never}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#7a96be" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TlEksikChart({ data }: { data: TlPoint[] }) {
  return (
    <div className="glass-chart p-6">
      <ChartTitle>Ünvan Bazında Eksik Çalışma (saat, en yüksek 12)</ChartTitle>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 16, bottom: 5, left: 10 }}
          >
            <CartesianGrid stroke={GRID} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              stroke={AXIS}
              fontSize={11}
              tick={{ fill: "#3b5272" }}
            />
            <YAxis
              type="category"
              dataKey="tl"
              stroke={AXIS}
              fontSize={10}
              width={140}
              tick={{ fill: "#7a96be" }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(248,113,113,0.06)" }}
              formatter={((v: number) => [`${v.toFixed(1)} saat`, "Eksik"]) as never}
            />
            <Bar dataKey="eksikSaat" fill="#f87171" radius={[0, 7, 7, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
