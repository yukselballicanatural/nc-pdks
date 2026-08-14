import { loadPdksData } from "@/lib/data/loadPdks";
import { loadLeavesData } from "@/lib/kolay/loadLeaves";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import IzinlerPanel, { type IzinRow } from "@/components/izinler/IzinlerPanel";

export const dynamic = "force-dynamic";

export default async function IzinlerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const izin = await loadLeavesData(data.range.sdParam, data.range.edParam);

  const rows: IzinRow[] = izin.kayitlar
    .map((k, i) => ({
      key: `${k.kolayId}-${k.baslangic}-${i}`,
      sicil: k.sicil,
      adSoyad: k.adSoyad,
      tur: k.tur,
      baslangic: k.baslangic,
      bitis: k.bitis,
      gunSayisi: k.gunler.length,
      durum: k.durum,
      eslesme: k.eslesme,
    }))
    .sort((a, b) => b.baslangic.localeCompare(a.baslangic) || a.adSoyad.localeCompare(b.adSoyad, "tr"));

  const toplamIzinGunu = izin.kayitlar.reduce((n, k) => n + k.gunler.length, 0);

  return (
    <>
      <PageHeader
        title="İzinler"
        description="Kolay İK'dan onaylı izin kayıtları — yıllık, ücretsiz, babalık vb."
        range={data.range}
      />
      <div className="space-y-5 p-7">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="İzin Kaydı"
            value={izin.kullanilabilir ? rows.length : "—"}
            tone="teal"
            hint={izin.kullanilabilir ? `${toplamIzinGunu} izin günü` : "İzin erişimi yok"}
          />
          <StatCard label="Kolay İK Çalışan" value={izin.kolayKisiSayisi} tone="green" />
          <StatCard
            label="Eşleşen Personel"
            value={izin.eslesen}
            tone={izin.eslesmeyen > 0 ? "amber" : "green"}
            hint={`${izin.eslesmeyen} kişi Kolay'da bulunamadı`}
          />
          <StatCard
            label="Kontrol Gerektiren"
            value={izin.kismiEslesen}
            tone={izin.kismiEslesen > 0 ? "amber" : "green"}
            hint="Kısmi isim eşleşmesi"
          />
        </div>

        <IzinlerPanel
          rows={rows}
          kullanilabilir={izin.kullanilabilir}
          yetkiEksik={izin.yetkiEksik}
          hata={izin.hata}
        />
      </div>
    </>
  );
}
