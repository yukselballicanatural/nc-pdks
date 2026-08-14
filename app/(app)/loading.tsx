// Tüm (app) route'ları için ortak iskelet.
//
// İki işi var:
//  1) Sayfa geçişinde ekran anında boyanır — sunucu render'ı beklenmez.
//  2) Next dinamik route'ları loading.tsx OLMADAN hiç prefetch etmiyor
//     (node_modules/next/dist/docs/01-app/02-guides/runtime-prefetching.md);
//     bu dosya sayesinde route kabuğu link göründüğü anda önceden çekiliyor.
export default function Loading() {
  return (
    <div className="anim-fade-in">
      {/* Başlık şeridi — PageHeader ile aynı yükseklik */}
      <div
        className="px-7 py-5 overflow-hidden"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.075)",
          background: "linear-gradient(180deg, rgba(8,17,40,0.60) 0%, rgba(5,9,26,0.40) 100%)",
        }}
      >
        <div className="skel h-7 w-52 rounded-xl" />
        <div className="skel mt-2.5 h-3.5 w-80" />
      </div>

      {/* Dönem şeridi — DateRangeBar ile aynı yükseklik */}
      <div
        className="flex items-center gap-2.5 px-5 py-2.5"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.075)",
          background: "rgba(5,9,26,0.55)",
        }}
      >
        <div className="skel h-4 w-14 rounded-lg" />
        <div className="skel h-8 w-64 rounded-xl" />
        <div className="skel h-8 w-52 rounded-xl" />
        <div className="ml-auto skel h-3.5 w-28" />
      </div>

      <div className="space-y-5 p-7">
        {/* Gösterge kartları — 4 kolon */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.048)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {/* Üst çizgi skel */}
              <div className="skel h-0.5 w-full absolute inset-x-0 top-0 rounded-t-2xl" style={{ borderRadius: 0 }} />
              <div className="skel h-3 w-20" />
              <div className="skel mt-3.5 h-8 w-24 rounded-xl" />
              <div className="skel mt-2.5 h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Tablo konteyneri */}
        <div
          className="overflow-hidden"
          style={{
            background: "rgba(7,14,28,0.88)",
            border: "1px solid rgba(255,255,255,0.085)",
            borderRadius: 14,
          }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center gap-2.5 p-3.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="skel h-8 rounded-xl" style={{ width: 264 }} />
            <div className="skel h-8 w-40 rounded-xl" />
          </div>

          {/* Thead */}
          <div
            className="grid px-3 py-3"
            style={{
              background: "rgba(6,11,23,0.97)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              gridTemplateColumns: "70px 1fr 120px 80px 80px 80px 80px 80px 80px 80px 80px 100px",
              gap: 8,
            }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skel h-3 rounded" />
            ))}
          </div>

          {/* Satırlar */}
          <div>
            {Array.from({ length: 14 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-2.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.048)" }}
              >
                <div className="skel h-3.5 w-12" />
                <div className="skel h-3.5" style={{ width: `${100 + ((i * 43) % 100)}px` }} />
                <div className="skel h-3.5 w-28" />
                <div className="skel h-3.5 w-16" />
                <div className="skel ml-auto h-3.5 w-14" />
                <div className="skel h-3.5 w-14" />
                <div className="skel h-3.5 w-16" />
                <div className="skel h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
