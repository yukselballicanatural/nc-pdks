// Tüm (app) route'ları için ortak iskelet.
//
// İki işi var:
//  1) Sayfa geçişinde ekran anında boyanır — sunucu render'ı beklenmez.
//  2) Next dinamik route'ları loading.tsx OLMADAN hiç prefetch etmiyor
//     (node_modules/next/dist/docs/01-app/02-guides/runtime-prefetching.md);
//     bu dosya sayesinde route kabuğu link göründüğü anda önceden çekiliyor.
//
// İskeletin ölçüleri gerçek sayfayla EŞLEŞMELİ; aksi hâlde içerik gelince
// düzen sıçrar (layout shift) ve "patlama" hissi verir.
export default function Loading() {
  return (
    <div className="anim-fade-in">
      {/* Başlık şeridi — PageHeader ile aynı yükseklik */}
      <div
        className="px-6 py-4"
        style={{
          borderBottom: "1px solid var(--edge-soft)",
          background: "var(--sf-1)",
        }}
      >
        <div className="skel h-6 w-52" />
        <div className="skel mt-2 h-3.5 w-80" />
      </div>

      {/* Dönem şeridi — DateRangeBar ile aynı yükseklik */}
      <div
        className="flex items-center gap-2 px-6 py-2.5"
        style={{
          borderBottom: "1px solid var(--edge-soft)",
          background: "var(--sf-2)",
        }}
      >
        <div className="skel h-3 w-12" />
        <div className="skel h-[34px] w-64" style={{ borderRadius: "var(--r-btn)" }} />
        <div className="skel h-[34px] w-72" style={{ borderRadius: "var(--r-btn)" }} />
        <div className="skel ml-auto h-3 w-28" />
      </div>

      <div className="space-y-4 p-6">
        {/* Gösterge kartları */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4"
              style={{
                background: "var(--sf-1)",
                border: "1px solid var(--edge-soft)",
                borderRadius: "var(--r-sm)",
              }}
            >
              <div className="flex items-start gap-2.5">
                <div className="skel h-[30px] w-[30px]" style={{ borderRadius: "var(--r-xs)" }} />
                <div className="flex-1">
                  <div className="skel h-2.5 w-20" />
                  <div className="skel mt-2 h-6 w-24" />
                </div>
              </div>
              <div className="skel mt-2.5 h-3 w-28" />
            </div>
          ))}
        </div>

        {/* Araç çubuğu */}
        <div className="flex items-center gap-2">
          <div className="skel h-[34px] w-[260px]" style={{ borderRadius: "var(--r-input)" }} />
          <div className="skel h-[34px] w-40" style={{ borderRadius: "var(--r-input)" }} />
          <div className="skel ml-auto h-3 w-20" />
        </div>

        {/* Tablo */}
        <div
          className="overflow-hidden"
          style={{
            background: "var(--sf-sunken)",
            border: "1px solid var(--edge-soft)",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div
            className="flex gap-4 px-3 py-3"
            style={{
              background: "var(--tb-head)",
              borderBottom: "1px solid var(--edge-soft)",
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skel h-2.5 flex-1" />
            ))}
          </div>

          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-3 py-2.5"
              style={{ borderBottom: "1px solid var(--tb-line)" }}
            >
              {Array.from({ length: 8 }, (_, j) => (
                <div key={j} className="skel h-3 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
