"use client";

// Titreşen nokta ızgarası arka planı (giriş ekranı).
//
// NEDEN THREE.JS DEĞİL: Bu efektin kaynağı bir WebGL shader'ıydı ve three.js'i
// cdnjs'ten <script> etiketiyle yüklüyordu. Giriş ekranının görünümünü dış bir
// CDN'e bağlamak istemedim: ağ CDN'i engelliyorsa (kurum ağlarında olağan) ya da
// yavaşsa arka plan sessizce hiç çizilmez, üstelik ~600 KB'lık bir kütüphane
// yalnızca kare noktalar çizmek için indirilir. Shader'ın yaptığı iş — sabit
// ızgarada, hücre başına rastgele opaklıkla titreşen kareler ve merkezden dışa
// açılan giriş animasyonu — Canvas 2D'de bağımlılıksız üretilebiliyor.
//
// Shader'ın random() fonksiyonu birebir taşındı ki desen aynı karakterde olsun.
import { useEffect, useRef } from "react";
import { useHtmlAttr } from "@/lib/ui/useHtmlAttr";

/** Hücre boyu ve nokta boyu (CSS pikseli) — shader'daki u_total_size / u_dot_size. */
const IZGARA = 20;
const NOKTA = 6;

/** Shader'daki u_opacities dizisi: onda üçü soluk, onda biri tam parlak. */
const OPAKLIKLAR = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1.0];

/** Her hücrenin opaklığının yenilenme periyodu (sn). */
const PERIYOT_SN = 5;

/** Giriş animasyonunun hız çarpanı — merkezden dışa açılma. */
const GIRIS_HIZI = 3;

/**
 * Giriş animasyonu bittikten sonra kare aralığı (ms).
 *
 * Her karede yeniden çizmek gereksiz: hücre opaklıkları PERIYOT_SN'lik pencerelerde
 * ve hücre başına farklı fazda değişiyor, yani 60 fps ile 12 fps arasında görünür
 * bir fark yok. Tam ekranda ~5000 nokta olduğu için bu, işlemci yükünü beşte bire
 * indiriyor — giriş ekranı için bedavaya gelen bir tasarruf.
 */
const KARE_ARALIK_MS = 80;

/** Giriş animasyonunun her karede çizileceği süre (sn). */
const GIRIS_SURESI_SN = 1;

const PHI = 1.61803398874989484820459;

/**
 * Shader'daki random()'ın aynısı:
 *   fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x)
 * distance(xy*PHI, xy) = |xy| * (PHI-1) olduğu için hypot ile sadeleşiyor.
 * fract negatif değerlerde de [0,1) vermeli — bu yüzden Math.floor kullanılıyor,
 * Math.trunc değil.
 */
function rastgele(x: number, y: number): number {
  const d = Math.hypot(x, y) * (PHI - 1);
  const v = Math.tan(d * 0.5) * x;
  return v - Math.floor(v);
}

export default function DotMatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Noktalar eskiden sabit beyazdı; açık temada zemin de açık olduğu için
  // tamamen görünmez oluyordu. Renk artık temaya göre seçiliyor ve tema
  // değişince efekt yeniden çiziliyor (tema effect bağımlılığında).
  const tema = useHtmlAttr("data-theme", "dark");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hareket azaltma tercihi: animasyon yerine tek bir durağan kare çizilir.
    const hareketAzalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let sutun = 0;
    let satir = 0;
    let dpr = 1;

    const olcekle = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sutun = Math.ceil(w / IZGARA) + 1;
      satir = Math.ceil(h / IZGARA) + 1;
    };

    /**
     * @param t Başlangıçtan beri geçen süre (sn). hareketAzalt durumunda büyük bir
     *   değer verilir ki tüm noktalar açılmış görünsün.
     */
    const ciz = (t: number) => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = tema === "light" ? "rgba(23, 43, 99, 0.42)" : "#ffffff";

      const merkezX = sutun / 2;
      const merkezY = satir / 2;

      // Noktalar opaklığa göre gruplanıp toplu çiziliyor. Nokta başına globalAlpha
      // atamak ~5000 durum değişikliği demek olurdu; ayrık opaklık sayısı ise en
      // fazla sekiz (dört temel değer × parlama çarpanı).
      const kovalar = new Map<number, number[]>();

      for (let sy = 0; sy < satir; sy++) {
        for (let sx = 0; sx < sutun; sx++) {
          const fazKaydirma = rastgele(sx, sy);

          // Giriş animasyonu: merkeze uzaklık + hücreye özel rastgele gecikme.
          const gecikme = Math.hypot(merkezX - sx, merkezY - sy) * 0.01 + fazKaydirma * 0.15;
          const ilerleme = t * GIRIS_HIZI;
          if (ilerleme < gecikme) continue;

          // Açıldıktan hemen sonra kısa bir parlama (shader'daki 1.25 çarpanı).
          const parlama = ilerleme < gecikme + 0.1 ? 1.25 : 1;

          // Opaklık, hücre başına farklı fazda olmak üzere PERIYOT_SN'de bir yenilenir.
          const pencere = Math.floor(t / PERIYOT_SN + fazKaydirma + PERIYOT_SN);
          const r = rastgele(sx * pencere, sy * pencere);
          const temel = OPAKLIKLAR[Math.min(OPAKLIKLAR.length - 1, Math.floor(r * 10))];

          const alfa = Math.min(1, temel * parlama);
          const kova = kovalar.get(alfa);
          if (kova) kova.push(sx, sy);
          else kovalar.set(alfa, [sx, sy]);
        }
      }

      for (const [alfa, noktalar] of kovalar) {
        ctx.globalAlpha = alfa;
        for (let i = 0; i < noktalar.length; i += 2) {
          ctx.fillRect(noktalar[i] * IZGARA, noktalar[i + 1] * IZGARA, NOKTA, NOKTA);
        }
      }
      ctx.globalAlpha = 1;
    };

    olcekle();

    if (hareketAzalt) {
      ciz(10);
      const yenidenBoyutla = () => {
        olcekle();
        ciz(10);
      };
      window.addEventListener("resize", yenidenBoyutla);
      return () => window.removeEventListener("resize", yenidenBoyutla);
    }

    const baslangic = performance.now();
    let sonKare = 0;
    let kareId = 0;

    const dongu = (simdi: number) => {
      kareId = requestAnimationFrame(dongu);
      const t = (simdi - baslangic) / 1000;
      // Giriş animasyonu boyunca her kare; sonrasında seyrek.
      if (t > GIRIS_SURESI_SN && simdi - sonKare < KARE_ARALIK_MS) return;
      sonKare = simdi;
      ciz(t);
    };
    kareId = requestAnimationFrame(dongu);

    window.addEventListener("resize", olcekle);
    return () => {
      cancelAnimationFrame(kareId);
      window.removeEventListener("resize", olcekle);
    };
  }, [tema]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0"
    />
  );
}
