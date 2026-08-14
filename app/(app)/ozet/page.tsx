import { fetchPdksEvents } from "@/lib/db/queries/pdksEvents";
import { ReaderConfig } from "@/lib/engine/readerConfig";
import { calcShifts } from "@/lib/engine/calcShifts";
import { summary } from "@/lib/engine/summary";
import { addDays, dateOnly } from "@/lib/engine/mesaiGunu";
import type { Correction } from "@/lib/engine/summary";
import OzetTable, { type OzetRow } from "@/components/ozet/OzetTable";

// Bu sayfa her istekte canlı Supabase verisi çekiyor — build sırasında statik
// olarak önceden üretilmeye çalışılmamalı (aksi halde build-time'da env/DB
// erişimi gerekir ve prerender hatası verir).
export const dynamic = "force-dynamic";

// Şimdilik herkes gündüz vardiyası kabul ediliyor (kullanıcı kararı — vardiya
// verisi henüz Supabase'e eklenmedi, eklendiğinde isGece burada güncellenecek).
const isGeceStub = () => false;

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
  const rows: OzetRow[] = sicils.map((sicil) => {
    const p = personByS.get(sicil)!;
    const s = summary(sicil, start, today, shifts, noCorrections, noStartEnd, isGeceStub());
    return {
      sicil,
      ad: p.ad,
      soyad: p.soyad,
      takimLideri: p.takimLideri,
      cg: s.cg,
      net: s.net,
      bek: s.bek,
      eksik: s.eksik,
      mola: s.mola,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <h1 className="mb-1 text-xl font-semibold">Özet</h1>
      <p className="mb-4 text-sm text-slate-400">
        {start.toLocaleDateString("tr-TR")} – {today.toLocaleDateString("tr-TR")} · {rows.length} kişi ·
        turnike_gecisler&apos;den canlı okunuyor
      </p>
      <OzetTable rows={rows} />
    </div>
  );
}
