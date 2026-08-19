"use client";

// Canlı veri döngüsü — sayfa açık kaldıkça kendini güncel tutar.
//
// NEDEN: Verinin İŞLENMESİ Supabase'in pg_net trigger'ıyla anlık oluyor
// (bkz. supabase/migrations/0008_realtime_webhook.sql) — ama işlenen veri
// veritabanına yazıldıktan sonra, o an AÇIK olan bir tarayıcı sekmesinin bunu
// GÖRMESİ gerekiyor. Bu bileşen o son adımı yapıyor: düzenli kontrol edip veri
// değiştiyse kendini tazeliyor. Burası düzenli aralıkla /api/tick'i çağırır;
// veri sürümü değiştiyse router.refresh() ile sunucu bileşenlerini yeniden
// çizdirir.
//
// router.refresh() "yumuşak" yenilemedir: tablo filtreleri, arama kutusu gibi
// istemci durumları korunur, yalnızca sunucudan gelen veri tazelenir. Sayfa
// zıplamaz, kullanıcı yazdığı filtreyi kaybetmez.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** Kontrol sıklığı. Yapılacak iş yoksa sunucu tarafı iki küçük sorguyla çıkar. */
const ARALIK_MS = 20_000;

/** "Yeni veri alındı" bildiriminin ekranda kalma süresi. */
const BILDIRIM_MS = 4_000;

interface TickYanit {
  surum: string;
  sonKayitNo: number;
  bekleyen: number;
  yenidenHesaplaniyor: boolean;
  kurulumEksik: boolean;
}

type Durum = "baslangic" | "bekliyor" | "kontrol" | "yeni" | "hata";

export default function LiveSync({ baslangicSurumu }: { baslangicSurumu: string }) {
  const router = useRouter();
  const [durum, setDurum] = useState<Durum>("baslangic");
  const [sonKontrol, setSonKontrol] = useState<string | null>(null);
  const [bekleyen, setBekleyen] = useState(0);

  // Sunucunun bu sayfayı çizerken kullandığı sürüm. İlk kontrolde de doğru
  // karşılaştırma yapabilmek için baştan biliniyor olması gerekiyor — yoksa
  // sayfa açılışında gelen yeni veri bir tur boyunca ekrana yansımazdı.
  const surum = useRef(baslangicSurumu);
  const calisiyor = useRef(false);
  const bildirimZaman = useRef<ReturnType<typeof setTimeout> | null>(null);

  const kontrolEt = useCallback(async () => {
    // Üst üste binmesin; sekme arkada ise boşa istek atmayalım.
    if (calisiyor.current || document.hidden) return;
    calisiyor.current = true;
    setDurum((d) => (d === "yeni" ? d : "kontrol"));

    try {
      const res = await fetch("/api/tick", { method: "POST", cache: "no-store" });

      // Oturum düşmüşse: 401, ya da middleware'in login'e yönlendirmesi (bu
      // durumda yanıt 200 ama içerik HTML). İkisinde de sayfayı tazeliyoruz;
      // yönlendirmeyi middleware yapar. "Bağlantı yok" demek yanıltıcı olurdu.
      if (res.status === 401 || res.redirected) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        setDurum("hata");
        return;
      }

      const d = (await res.json()) as TickYanit;
      // Tarayıcının yerel saati — motorun "İstanbul duvar saati UTC alanlarında"
      // sözleşmesiyle ilgisi yok, burada gerçek bir zaman damgası gösteriyoruz.
      setSonKontrol(
        new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      );
      setBekleyen(d.bekleyen);

      if (d.surum !== surum.current) {
        surum.current = d.surum;
        router.refresh();
        setDurum("yeni");
        if (bildirimZaman.current) clearTimeout(bildirimZaman.current);
        bildirimZaman.current = setTimeout(() => setDurum("bekliyor"), BILDIRIM_MS);
      } else {
        setDurum((prev) => (prev === "yeni" ? prev : "bekliyor"));
      }
    } catch {
      setDurum("hata");
    } finally {
      calisiyor.current = false;
    }
  }, [router]);

  useEffect(() => {
    // İlk kontrol zamanlayıcıyla yapılıyor; iki nedeni var: efekt gövdesinde
    // senkron setState zincirleme render tetikliyor (react-hooks/set-state-in-effect),
    // ve kontrolün sayfanın ilk çizimiyle yarışmaması gerekiyor.
    const ilk = setTimeout(kontrolEt, 500);
    const id = setInterval(kontrolEt, ARALIK_MS);

    // Sekmeye geri dönüldüğünde beklemeden kontrol et — kullanıcı ekrana
    // baktığı anda güncel veriyi görmeli.
    const geriDonus = () => {
      if (!document.hidden) kontrolEt();
    };
    document.addEventListener("visibilitychange", geriDonus);
    window.addEventListener("focus", geriDonus);

    return () => {
      clearTimeout(ilk);
      clearInterval(id);
      document.removeEventListener("visibilitychange", geriDonus);
      window.removeEventListener("focus", geriDonus);
      if (bildirimZaman.current) clearTimeout(bildirimZaman.current);
    };
  }, [kontrolEt]);

  const renk =
    durum === "hata"
      ? "#f87171"
      : durum === "yeni"
        ? "#34d399"
        : durum === "kontrol"
          ? "#38bdf8"
          : "#06d6a0";

  const metin =
    durum === "hata"
      ? "Bağlantı yok"
      : durum === "yeni"
        ? "Yeni veri alındı"
        : durum === "baslangic"
          ? "Bağlanıyor…"
          : durum === "kontrol"
            ? "Kontrol ediliyor…"
            : bekleyen > 0
              ? `${bekleyen.toLocaleString("tr-TR")} kayıt işleniyor`
              : `Canlı${sonKontrol ? ` · ${sonKontrol}` : ""}`;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium tabular-nums backdrop-blur transition-all"
      style={{
        background: "rgba(5,9,26,0.82)",
        border: `1px solid ${renk}44`,
        color: "var(--tx-secondary)",
      }}
      title={
        durum === "hata"
          ? "Sunucuya ulaşılamıyor. Bağlantı gelince kendiliğinden devam eder."
          : "Yeni turnike kayıtları otomatik işlenir; ekran kendiliğinden tazelenir."
      }
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full${durum === "kontrol" ? " animate-pulse" : ""}`}
        style={{ background: renk, boxShadow: `0 0 6px ${renk}` }}
      />
      {metin}
    </div>
  );
}
