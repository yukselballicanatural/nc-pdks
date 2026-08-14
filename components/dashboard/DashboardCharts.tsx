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

const AXIS = "#64748b";
const GRID = "#1e293b";

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
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
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 text-sm font-medium text-slate-300">Günlük Toplam Çalışma (saat)</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="gun" stroke={AXIS} fontSize={11} tickMargin={6} />
            <YAxis stroke={AXIS} fontSize={11} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={((v: number, n: string) =>
                n === "saat"
                  ? [`${v.toFixed(1)} saat`, "Toplam çalışma"]
                  : [String(v), "Gelen kişi"]) as never}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "saat" ? "Toplam saat" : "Gelen kişi")} />
            <Line type="monotone" dataKey="saat" stroke="#2dd4bf" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="kisi" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DurumPieChart({ data }: { data: DurumPoint[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 text-sm font-medium text-slate-300">Personel Durum Dağılımı</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={DURUM_COLORS[d.name] ?? "#64748b"} stroke="#0f172a" />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={((v: number) => [`${v} kişi`, ""]) as never} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TlEksikChart({ data }: { data: TlPoint[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 text-sm font-medium text-slate-300">
        Takım Bazında Eksik Çalışma (saat, en yüksek 12)
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, bottom: 5, left: 10 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke={AXIS} fontSize={11} />
            <YAxis type="category" dataKey="tl" stroke={AXIS} fontSize={10} width={140} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={((v: number) => [`${v.toFixed(1)} saat`, "Eksik"]) as never}
            />
            <Bar dataKey="eksikSaat" fill="#f87171" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
