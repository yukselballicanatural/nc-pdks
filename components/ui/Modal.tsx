"use client";

// Ortak modal — projedeki tüm açılır pencereler bunu kullanır.
//
// Neden ayrı bir bileşen: aynı kalıp (arka plan + panel + kapat düğmesi +
// Escape + gövde kaydırma kilidi) her sayfada elle tekrarlanıyordu; her
// kopyada ham rgba renkler vardı ve açık temada okunmaz hâle geliyorlardı.
//
// Takvimdeki dersin aynısı: panel createPortal ile <body>'ye taşınıyor.
// Aksi hâlde backdrop-filter taşıyan bir ata (kart, başlık şeridi) yeni bir
// yığın bağlamı açtığında modal sayfanın altında kalabilir.

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  baslik,
  altBaslik,
  children,
  onClose,
  genislik = 480,
  footer,
}: {
  baslik: string;
  altBaslik?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  genislik?: number;
  footer?: React.ReactNode;
}) {
  const kapat = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") kapat();
    };
    document.addEventListener("keydown", onKey);

    // Modal açıkken arkadaki sayfa kaymasın — açılır pencere kayarken
    // altındaki tablonun da kayması kafa karıştırıcı oluyordu.
    const oncekiOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = oncekiOverflow;
    };
  }, [kapat]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="modal-backdrop z-modal fixed inset-0 flex items-center justify-center p-4"
      onClick={kapat}
      role="presentation"
    >
      <div
        className="modal-panel glass-modal glass-hairline relative flex max-h-[85vh] w-full flex-col"
        style={{ maxWidth: genislik }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
      >
        {/* Başlık */}
        <div
          className="flex items-start gap-3 px-5 pb-3 pt-4"
          style={{ borderBottom: "1px solid var(--edge-soft)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-tight" style={{ color: "var(--tx-primary)" }}>
              {baslik}
            </div>
            {altBaslik && (
              <div className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
                {altBaslik}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="btn-icon shrink-0"
            style={{ width: 28, height: 28 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Gövde — uzun içerik kendi içinde kayar, panel taşmaz */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div
            className="flex justify-end gap-2 px-5 py-3"
            style={{ borderTop: "1px solid var(--edge-soft)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
