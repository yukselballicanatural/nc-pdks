import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// DESIGN_SYSTEM.md §13: Outfit = başlıklar, Inter = gövde metni.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"], // latin-ext: Türkçe ğ/ş/ı/İ glifleri
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PDKS Pro — Natural Clinic",
  description: "Personel Devam Kontrol Sistemi",
};

/**
 * Tema, ilk boyamadan ÖNCE <html>'e yazılmalı; yoksa koyu tema seçili bir
 * kullanıcıda sayfa bir kare boyunca açık temada yanıp söner (FOUC).
 * Bu yüzden senkron, bloklayan küçük bir script kullanılıyor — React
 * hidrasyonunu beklemek çok geç olurdu.
 */
const TEMA_SCRIPTI = `(function(){var e=document.documentElement;try{var t=localStorage.getItem('pdks-tema');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}e.setAttribute('data-theme',t);var s=localStorage.getItem('pdks-sidebar');if(s!=='mini'&&s!=='full'){s=window.innerWidth<=900?'mini':'full';}e.setAttribute('data-sidebar',s);}catch(x){e.setAttribute('data-theme','dark');e.setAttribute('data-sidebar','full');}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      data-theme="dark"
      data-sidebar="full"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPTI }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
