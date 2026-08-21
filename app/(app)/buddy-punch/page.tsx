import { loadPdksData } from "@/lib/data/loadPdks";
import { formatGs, formatHms } from "@/lib/engine/mesaiGunu";
import { readerDirection } from "@/lib/engine/textNorm";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Notice, { Vurgu } from "@/components/ui/Notice";
import LogTable, { type LogRow } from "@/components/log/LogTable";

export const dynamic = "force-dynamic";

const ALAN_ADI = { work: "Çalışma", break: "Mola/Dışı", ignore: "Yoksayılan" } as const;

export default async function BuddyPunchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, personByS, readerConfig, buddy, tlFilter } = data;

  const rows: LogRow[] = buddy
    .filter((r) => !tlFilter || personByS.get(r.sicil)?.unvan === tlFilter)
    .map((r, i) => {
      const p = personByS.get(r.sicil);
      const dir = readerDirection(r.ok);
      return {
        key: `${r.sicil}-${r.dt.getTime()}-${i}`,
        tarih: formatGs(r.mg),
        saat: formatHms(r.dt),
        okuyucu: r.ok,
        alan: ALAN_ADI[readerConfig.getArea(r.ok)],
        yon: dir === "in" ? "Giriş" : dir === "out" ? "Çıkış" : "-",
        sicil: r.sicil,
        adSoyad: p ? `${p.ad} ${p.soyad}`.trim() || r.sicil : r.sicil,
        unvan: p?.unvan || "Bilinmiyor",
        buddy: true,
      };
    });

  const kisiSayisi = new Set(rows.map((r) => r.sicil)).size;
  const gunSayisi = new Set(rows.map((r) => r.tarih)).size;

  return (
    <>
      <PageHeader
        title="Buddy Punch"
        description="Aynı kişinin aynı turnikede aynı yönde 60 saniye içinde tekrarlanan okutmaları"
        range={range}
      />
      <div className="p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Şüpheli Kayıt" value={rows.length} icon="⚠️" tone="red" />
          <StatCard label="İlgili Personel" value={kisiSayisi} icon="👥" tone="amber" />
          <StatCard label="Etkilenen Gün" value={gunSayisi} icon="📅" tone="sky" />
        </div>
        <Notice ton="info" className="mb-3">
          Bu kayıtlar hesaplamada <Vurgu>tekilleştirilir</Vurgu> — çift okutma çalışma süresini
          şişirmez. Burada yalnızca şüpheli davranış tespiti amacıyla listeleniyor.
        </Notice>
        <LogTable rows={rows} />
      </div>
    </>
  );
}
