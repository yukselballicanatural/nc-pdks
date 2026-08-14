import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { loadPdksData } from "@/lib/data/loadPdks";
import { fetchAllReaderNames, fetchReaderUsage } from "@/lib/db/queries/materialized";
import { readerDirection } from "@/lib/engine/textNorm";
import PageHeader from "@/components/ui/PageHeader";
import KapiAyarlariTable, { type KapiRow } from "@/components/kapi/KapiAyarlariTable";

export const dynamic = "force-dynamic";

export default async function KapiAyarlariPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/ozet");

  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { readerConfig, range } = data;

  // Sayılar seçili dönemden, liste ise tüm zamanlardan gelir — dönemde hiç
  // kullanılmayan bir okuyucu da sınıflandırılabilir olmalı.
  const [counts, allNames] = await Promise.all([
    fetchReaderUsage(range.sdParam, range.edParam),
    fetchAllReaderNames(),
  ]);

  const özelSet = new Set<string>([
    ...readerConfig.workReaders,
    ...readerConfig.breakReaders,
    ...readerConfig.ignoreReaders,
  ]);

  const allReaders = new Set<string>([...allNames, ...counts.keys(), ...özelSet]);

  const rows: KapiRow[] = [...allReaders]
    .sort((a, b) => a.localeCompare(b, "tr"))
    .map((ok) => {
      const dir = readerDirection(ok);
      return {
        key: ok,
        okuyucu: ok,
        alan: readerConfig.getArea(ok),
        ozelKural: özelSet.has(ok),
        yon: dir === "in" ? "Giriş" : dir === "out" ? "Çıkış" : "-",
        kayitSayisi: counts.get(ok) ?? 0,
      };
    });

  return (
    <>
      <PageHeader
        title="Kapı Ayarları"
        description="Okuyucuların çalışma / mola / yoksayılan olarak sınıflandırılması"
        showDateBar={false}
      />
      <div className="p-6">
        <KapiAyarlariTable rows={rows} />
      </div>
    </>
  );
}
