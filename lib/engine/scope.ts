// PDKS kapsamı: yalnızca Satış Direktörlüğü.
//
// Kullanıcı kararı: eksik saat takibi sadece satış ekibi için yapılıyor. Diğer
// birimler (Alişan Dereci, Esra Mürtezaoğlu, Kurumsal Hizmetler, Pazarlama,
// Bilgi Teknolojileri ...) hesaba hiç girmiyor.
//
// Filtre HAM VERİ okumasında uygulanır (bkz. lib/db/queries/rawEvents.ts):
//   - kapsam dışı kişiler hiç hesaplanmaz, materyalize tablolara girmez
//   - senkronizasyon ~%37 daha az satır işler (199.842 → 124.848)
//   - buddy-punch eşleştirmesi de yalnızca satış ekibi içinde aranır
//
// Kaynak tabloda kapsamı belirleyen alan `pozisyon`. İsmine rağmen bu bir kişi
// değil, bağlı olunan direktörlük/müdürlük. Kişinin gerçek ünvanı `alt_firma`
// alanında (bkz. PersonInfo.unvan) — arayüzde gruplama bu alana göre yapılır.
export const SALES_POZISYON = "SATIŞ DİREKTÖRLÜĞÜ";

/** config_version imzasına girer; değişirse tam yeniden hesaplama tetiklenir. */
export const SCOPE_VERSION = `pozisyon=${SALES_POZISYON}`;
