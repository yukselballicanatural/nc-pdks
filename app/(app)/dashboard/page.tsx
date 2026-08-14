import { loadPdksData, visiblePeople } from "@/lib/data/loadPdks";
import { summary } from "@/lib/engine/summary";
import { getNet } from "@/lib/engine/summary";
import { addDays, formatGs, gunAdi, isWeekday } from "@/lib/engine/mesaiGunu";
import { shiftKey } from "@/lib/engine/calcShifts";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  DurumPieChart,
  GunlukTrendChart,
  TlEksikChart,
  type DayPoint,
  type DurumPoint,
  type TlPoint,
} from "@/components/dashboard/DashboardCharts";
import { dkp } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, shifts, corLookup, startEndLookup, isGece, alarmCounts, buddyTotal, turnikeCountByS } =
    data;
  const allPeople = visiblePeople(data);

  // Turnike kaydı olmayanlar (teknik/depo/klinik personeli) turnike bazlı hesaba
  // giremez; eksik saat istatistiğine katılsalar tüm toplamları yanıltırlar.
  const people = allPeople.filter((p) => (turnikeCountByS.get(p.sicil) ?? 0) > 0);
  const turnikesiz = allPeople.length - people.length;

  let totalNet = 0;
  let totalEksik = 0;
  let totalFazla = 0;
  let hicGelmeyen = 0;
  let eksikOlan = 0;
  let tamamOlan = 0;
  const tlEksik = new Map<string, { eksik: number; kisi: number }>();

  for (const p of people) {
    const s = summary(p.sicil, range.sd, range.ed, shifts, corLookup, startEndLookup, isGece(p.sicil));
    totalNet += s.net;
    if (s.eksik > 0) totalEksik += s.eksik;
    else totalFazla += -s.eksik;

    if (s.cg === 0) hicGelmeyen++;
    else if (s.eksik > 0) eksikOlan++;
    else tamamOlan++;

    const cur = tlEksik.get(p.unvan || "Bilinmiyor") ?? { eksik: 0, kisi: 0 };
    cur.eksik += Math.max(0, s.eksik);
    cur.kisi += 1;
    tlEksik.set(p.unvan || "Bilinmiyor", cur);
  }

  // Günlük trend
  const sicils = people.map((p) => p.sicil);
  const dayPoints: DayPoint[] = [];
  for (let d = range.sd; d <= range.ed; d = addDays(d, 1)) {
    const gs = formatGs(d);
    let dayMin = 0;
    let kisi = 0;
    for (const sicil of sicils) {
      const net = getNet(sicil, gs, shifts, corLookup);
      if (net > 0) {
        dayMin += net;
        kisi++;
      }
    }
    dayPoints.push({
      gun: `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")} ${gunAdi(d)}`,
      saat: +(dayMin / 60).toFixed(1),
      kisi,
    });
  }

  const durumData: DurumPoint[] = [
    { name: "Tamam", value: tamamOlan },
    { name: "Eksik", value: eksikOlan },
    { name: "Hiç gelmemiş", value: hicGelmeyen },
  ].filter((d) => d.value > 0);

  const tlData: TlPoint[] = [...tlEksik.entries()]
    .map(([tl, v]) => ({ tl: tl.length > 22 ? tl.slice(0, 21) + "…" : tl, eksikSaat: +(v.eksik / 60).toFixed(1), kisi: v.kisi }))
    .filter((d) => d.eksikSaat > 0)
    .sort((a, b) => b.eksikSaat - a.eksikSaat)
    .slice(0, 12)
    .reverse();

  let isGunu = 0;
  for (let d = range.sd; d <= range.ed; d = addDays(d, 1)) if (isWeekday(d)) isGunu++;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Dönem geneline ait özet göstergeler"
        range={range}
      />
      <div className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Turnike Kullanan Personel"
            value={people.length}
            icon="👥"
            tone="teal"
            hint={`${isGunu} iş günü · ${turnikesiz} kişi turnike kullanmıyor (hariç)`}
          />
          <StatCard label="Toplam Çalışma" value={`${(totalNet / 60).toFixed(0)} sa`} icon="⏰" tone="green" hint={dkp(totalNet)} />
          <StatCard label="Toplam Eksik" value={`${(totalEksik / 60).toFixed(0)} sa`} icon="📉" tone="red" hint={`${eksikOlan + hicGelmeyen} kişide eksik var`} />
          <StatCard label="Toplam Fazla Mesai" value={`${(totalFazla / 60).toFixed(0)} sa`} icon="📈" tone="amber" hint={`${tamamOlan} kişi hedefi tuttu`} />
        </div>

        {turnikesiz > 0 && (
          <div className="rounded border border-slate-700 bg-slate-800/40 p-3 text-xs text-slate-400">
            Bu dönemde <span className="text-slate-200">{turnikesiz}</span> kişinin hiç turnike kaydı
            yok (teknik/depo/klinik personeli turnike dışı kapıları kullanıyor). Çalışma süresi
            turnike giriş/çıkışına göre hesaplandığı için bu kişiler yukarıdaki toplamlara{" "}
            <span className="text-slate-200">dahil edilmedi</span> — aksi halde eksik saat rakamları
            yanıltıcı olurdu. Listeyi Özet sayfasında görebilirsiniz.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Turnikesiz Çıkış"
            value={(alarmCounts.TURNIKESIZ_CIKIS ?? 0).toLocaleString("tr-TR")}
            icon="🚨"
            tone="red"
          />
          <StatCard
            label="Kart Basma Şüphesi"
            value={(alarmCounts.KART_BASMA ?? 0).toLocaleString("tr-TR")}
            icon="👥"
            tone="amber"
          />
          <StatCard
            label="Turnike Atlama"
            value={(alarmCounts.TURNIKE_ATLAMA ?? 0).toLocaleString("tr-TR")}
            icon="⚠️"
            tone="violet"
          />
        </div>

        <GunlukTrendChart data={dayPoints} />

        <div className="grid gap-3 lg:grid-cols-2">
          <DurumPieChart data={durumData} />
          <TlEksikChart data={tlData} />
        </div>

        <p className="text-xs" style={{ color: "var(--tx-muted)" }}>
          Buddy punch şüpheli kayıt: {buddyTotal.toLocaleString("tr-TR")} · Vardiya bilgisi henüz
          sisteme girilmediği için tüm personel gündüz vardiyası (450 dk) kabul edilmektedir.
        </p>
      </div>
    </>
  );
}
