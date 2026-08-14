import { fetchPdksEvents } from "@/lib/db/queries/pdksEvents";
import { ReaderConfig } from "@/lib/engine/readerConfig";
import { calcShifts } from "@/lib/engine/calcShifts";
import { summary } from "@/lib/engine/summary";
import { addDays, dateOnly } from "@/lib/engine/mesaiGunu";
import type { Correction } from "@/lib/engine/summary";

// Bu sayfa her istekte canlı Supabase verisi çekiyor — build sırasında statik
// olarak önceden üretilmeye çalışılmamalı (aksi halde build-time'da env/DB
// erişimi gerekir ve prerender hatası verir).
export const dynamic = "force-dynamic";

// Şimdilik herkes gündüz vardiyası kabul ediliyor (kullanıcı kararı — vardiya
// verisi henüz Supabase'e eklenmedi, eklendiğinde isGece burada güncellenecek).
const isGeceStub = () => false;

function dkp(min: number): string {
  const abs = Math.abs(min);
  return `${Math.floor(abs / 60)}:${String(Math.floor(abs % 60)).padStart(2, "0")}`;
}

export default async function OzetPage() {
  const today = dateOnly(new Date());
  const start = addDays(today, -13); // son 14 gün, varsayılan
  const { events, personByS } = await fetchPdksEvents(start.toISOString(), today.toISOString());

  const readerConfig = new ReaderConfig();
  const shifts = calcShifts(events, readerConfig, isGeceStub);

  const noCorrections = {
    get(): Correction | undefined {
      return undefined;
    },
  };
  const noStartEnd = {
    getStartDate: () => null,
    getEndDate: () => null,
  };

  const sicils = [...personByS.keys()].sort();
  const rows = sicils.map((sicil) => {
    const p = personByS.get(sicil)!;
    const s = summary(sicil, start, today, shifts, noCorrections, noStartEnd, isGeceStub());
    return { sicil, p, s };
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-1 text-xl font-semibold">Özet</h1>
      <p className="mb-4 text-sm text-slate-400">
        {start.toLocaleDateString("tr-TR")} – {today.toLocaleDateString("tr-TR")} · {rows.length} kişi ·
        turnike_gecisler'den canlı okunuyor
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Sicil</th>
              <th className="px-3 py-2 text-left">Ad Soyad</th>
              <th className="px-3 py-2 text-left">Takım Lideri</th>
              <th className="px-3 py-2 text-right">Gün</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2 text-right">Beklenen</th>
              <th className="px-3 py-2 text-right">Eksik</th>
              <th className="px-3 py-2 text-right">Mola</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sicil, p, s }) => (
              <tr key={sicil} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="px-3 py-2 text-slate-400">{sicil}</td>
                <td className="px-3 py-2">
                  {p.ad} {p.soyad}
                </td>
                <td className="px-3 py-2 text-slate-400">{p.takimLideri}</td>
                <td className="px-3 py-2 text-right">{s.cg}</td>
                <td className="px-3 py-2 text-right">{dkp(s.net)}</td>
                <td className="px-3 py-2 text-right text-slate-400">{dkp(s.bek)}</td>
                <td className={`px-3 py-2 text-right ${s.eksik > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {dkp(s.eksik)}
                </td>
                <td className="px-3 py-2 text-right text-slate-400">{dkp(s.mola)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
