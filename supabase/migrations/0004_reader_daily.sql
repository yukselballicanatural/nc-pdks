-- Okuyucu bazlı günlük kayıt sayısı.
-- Kapı Ayarları ekranı okuyucu listesi + kullanım sayısı için ham tabloyu
-- tarıyordu (~7 sn). Senkronizasyon bunu gün bazında materyalize eder;
-- pencere yeniden işlendiğinde o gün aralığı silinip yeniden yazılır (idempotent).
create table pdks_reader_daily (
  okuyucu      text not null,
  mesai_gunu   date not null,
  kayit_sayisi int not null default 0,
  primary key (okuyucu, mesai_gunu)
);
create index idx_pdks_reader_daily_gun on pdks_reader_daily (mesai_gunu);

alter table pdks_reader_daily enable row level security;
