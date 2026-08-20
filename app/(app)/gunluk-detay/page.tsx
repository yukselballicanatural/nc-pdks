import { loadPdksData, visiblePeople } from "@/lib/data/loadPdks";
import { getEffectiveMola, getNet } from "@/lib/engine/summary";
import { addDays, formatGs, formatGsHms, formatHm, gunAdi, isWeekday } from "@/lib/engine/mesaiGunu";
import { guvenliKonumLinki } from "@/lib/tracker/araliklar";
import { shiftKey } from "@/lib/engine/calcShifts";
import { gunKredisiDetay, gunKronolojisi } from "@/lib/tracker/araliklar";
import { G_MOLA, G_NET, N_MOLA, N_NET } from "@/lib/engine/constants";
import PageHeader from "@/components/ui/PageHeader";
import DetayTable, { type DetayRow } from "@/components/detay/DetayTable";

export const dynamic = "force-dynamic";

export default async function GunlukDetayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, shifts, corLookup, isGece, session, izinGunBilgi, izinVerisiVar, trackerKredi, tracker } =
    data;

  const rows: DetayRow[] = [];
  for (const p of visiblePeople(data)) {
    const gece = isGece(p.sicil);
    const std = gece ? N_NET : G_NET;
    const adSoyad = `${p.ad} ${p.soyad}`.trim() || p.sicil;

    const izinler = izinGunBilgi.get(p.sicil);
    const aralar = tracker.bySicil.get(p.sicil) ?? [];

    for (let d = range.sd; d <= range.ed; d = addDays(d, 1)) {
      const gs = formatGs(d);
      const izin = izinler?.get(gs) ?? null;
      const sh = shifts.get(shiftKey(p.sicil, gs));
      const cor = corLookup.get(p.sicil, gs);
      const net = getNet(p.sicil, gs, shifts, corLookup, trackerKredi);
      const krediDetay =
        sh && aralar.length > 0 ? gunKredisiDetay(sh.outsideIntervals, aralar) : [];
      const gunOlaylari =
        aralar.length > 0
          ? gunKronolojisi(d, addDays(d, 1), aralar).map((o) => ({
              etiket: o.etiket,
              bas: formatHm(o.bas),
              bit: o.bit ? formatHm(o.bit) : null,
              dk: o.dk,
              konum: guvenliKonumLinki(o.basKonum) ?? guvenliKonumLinki(o.bitKonum),
            }))
          : [];

      rows.push({
        key: `${p.sicil}-${gs}`,
        sicil: p.sicil,
        adSoyad,
        unvan: p.unvan || "Bilinmiyor",
        tarih: gs,
        gun: gunAdi(d),
        giris: sh ? formatGsHms(sh.g) : null,
        cikis: sh ? formatGsHms(sh.c) : null,
        vardiya: gece ? "Gece" : "Gündüz",
        net,
        mola: sh
          ? getEffectiveMola(p.sicil, gs, shifts, corLookup, trackerKredi)
          : cor
            ? (gece ? N_MOLA : G_MOLA)
            : 0,
        // Turnike kaydı yok ama tracker kredisiyle net>0 ise (bkz. hasData
        // yorumu) mola kavramı yok (0) — toplam = net, brüt de net'e eşit.
        brut: sh ? sh.brut : cor ? net + (gece ? N_MOLA : G_MOLA) : net,
        netFark: net > 0 ? net - std : 0,
        kayit: sh ? sh.cnt : null,
        duzeltmeNeden: cor ? String(cor.neden ?? "Düzeltme") : null,
        izinTuru: izin?.tur ?? null,
        izinUcretli: izin?.ucretli ?? null,
        krediDetay,
        krediDk: krediDetay.reduce((t, k) => t + k.dk, 0),
        gunOlaylari,
        // net>0 turnike kaydı olmayan bir günde de klinik/toplantı kredisiyle
        // gerçekleşebilir (bkz. lib/tracker/araliklar.ts turnikesizGunlukKredi)
        // — o günü "kayıtsız" göstermemek için üçüncü koşul eklendi.
        hasData: Boolean(sh) || Boolean(cor) || net > 0,
        hafta: !isWeekday(d),
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Günlük Detay"
        description="Kişi ve gün bazında ilk giriş / son çıkış, net çalışma ve fark"
        range={range}
      />
      <div className="p-6">
        <DetayTable
          rows={rows}
          canEdit={session?.role === "admin"}
          izinVerisiVar={izinVerisiVar}
        />
      </div>
    </>
  );
}
