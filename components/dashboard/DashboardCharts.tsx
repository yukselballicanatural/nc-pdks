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

const AXIS = "#3d5270";
const GRID = "rgba(255,255,255,0.05)";

const tooltipStyle = {
  backgroundColor: "rgba(8,15,28,0.95)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  fontSize: 12,
  color: "#eef2ff",
  backdropFilter: "blur(20px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
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
  Tamam: "#34d399",
  Eksik: "#f87171",
  "Hiç gelmemiş": "#a78bfa",
};

export function GunlukTrendChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="glass-chart p-5">
      <div
        className="mb-4 text-sm font-semibold tracking-tight"
        style={{ color: "var(--tx-primary)" }}
      >
        Günlük Toplam Çalışma (saat)
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
            <XAxis dataKey="gun" stroke={AXIS} fontSize={11} tickMargin={6} tick={{ fill: "#3d5270" }} />
            <YAxis stroke={AXIS} fontSize={11} tick={{ fill: "#3d5270" }} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: "rgba(56,189,248,0.15)", strokeWidth: 1 }}
              formatter={((v: number, n: string) =>
                n === "saat"
                  ? [`${v.toFixed(1)} saat`, "Toplam çalışma"]
                  : [String(v), "Gelen kişi"]) as never}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#7b93b8" }}
              formatter={(v) => (v === "saat" ? "Toplam saat" : "Gelen kişi")}
            />
            <Line
              type="monotone"
              dataKey="saat"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#38bdf8", stroke: "rgba(56,189,248,0.3)", strokeWidth: 6 }}
            />
            <Line
              type="monotone"
              dataKey="kisi"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#fbbf24", stroke: "rgba(251,191,36,0.3)", strokeWidth: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DurumPieChart({ data }: { data: DurumPoint[] }) {
  return (
    <div className="glass-chart p-5">
      <div
        className="mb-4 text-sm font-semibold tracking-tight"
        style={{ color: "var(--tx-primary)" }}
      >
        Personel Durum Dağılımı
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={DURUM_COLORS[d.name] ?? "#3d5270"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={((v: number) => [`${v} kişi`, ""]) as never}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#7b93b8" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TlEksikChart({ data }: { data: TlPoint[] }) {
  return (
    <div className="glass-chart p-5">
      <div
        className="mb-4 text-sm font-semibold tracking-tight"
        style={{ color: "var(--tx-primary)" }}
      >
        Takım Bazında Eksik Çalışma (saat, en yüksek 12)
      </div>
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
              tick={{ fill: "#3d5270" }}
            />
            <YAxis
              type="category"
              dataKey="tl"
              stroke={AXIS}
              fontSize={10}
              width={140}
              tick={{ fill: "#7b93b8" }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "rgba(248,113,113,0.05)" }}
              formatter={((v: number) => [`${v.toFixed(1)} saat`, "Eksik"]) as never}
            />
            <Bar
              dataKey="eksikSaat"
              fill="#f87171"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
