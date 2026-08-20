"use client";

import { useSyncExternalStore } from "react";

/**
 * <html> üzerindeki bir özniteliği React state'i gibi okur.
 *
 * NEDEN useSyncExternalStore: tema ve menü genişliği <html> özniteliğinde
 * tutuluyor (ilk boyamadan önce bloklayan script yazıyor — bkz. app/layout.tsx).
 * Bu React'in DIŞINDA bir kaynak; useEffect + setState ile okumak hem zincirleme
 * render tetikler hem de öznitelik başka bir yerden değişirse bileşen bunu
 * kaçırır. useSyncExternalStore ikisini de çözer: abonelik MutationObserver
 * üzerinden, sunucu anlık görüntüsü ise sabit bir varsayılan.
 *
 * @param attr    İzlenecek öznitelik adı (örn. "data-theme")
 * @param varsayilan Sunucu render'ında ve öznitelik yokken kullanılacak değer
 */
export function useHtmlAttr(attr: string, varsayilan: string): string {
  return useSyncExternalStore(
    (degisti) => {
      const gozlemci = new MutationObserver(degisti);
      gozlemci.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [attr],
      });
      return () => gozlemci.disconnect();
    },
    () => document.documentElement.getAttribute(attr) ?? varsayilan,
    // Sunucuda DOM yok; layout <html>'e varsayılanı zaten basıyor, bu yüzden
    // ilk istemci render'ı sunucununkiyle eşleşir ve hidrasyon uyarısı çıkmaz.
    () => varsayilan
  );
}
