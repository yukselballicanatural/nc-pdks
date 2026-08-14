-- Önceden hesaplanmış (materyalize) PDKS sonuçları.
--
-- NEDEN: her sayfa açılışında turnike_gecisler'den 60binden fazla ham satır çekip
-- baştan hesaplamak yavaştı (~3.5 sn). Ham veri toplu senkronizasyonla geliyor ve
-- source_id monoton artıyor; bu yüzden bir kez hesaplayıp sonucu saklıyor, sonra
-- yalnızca yeni source_id'lerin etkilediği günleri yeniden hesaplıyoruz.
-- Sayfalar artık bu küçük tablolardan okuyor (dönem başına ~2-3 bin satır).

-- Senkronizasyon durumu (tek satır).
create table pdks_sync_state (
  id                   int primary key default 1 check (id = 1),
  last_source_id       bigint not null default 0,
  -- Kapı Ayarları / gece_tl değişirse tüm sonuçlar geçersizdir; bu imza değişince
  -- tam yeniden hesaplama tetiklenir.
  config_version       text not null default '',
  -- Tam yeniden hesaplama sırasında işlenecek sonraki gün (bittiğinde null).
  rebuild_cursor       date,
  last_sync_at         timestamptz,
  last_full_rebuild_at timestamptz,
  status               text not null default 'idle',
  message              text not null default ''
);
insert into pdks_sync_state (id) values (1) on conflict (id) do nothing;

-- Personel özeti (turnike_gecisler'den türetilir; sayfaların kişi listesi).
create table pdks_personnel_cache (
  sicil        text primary key,
  ad           text not null default '',
  soyad        text not null default '',
  takim_lideri text not null default 'Bilinmiyor',
  bolum        text not null default '',
  firma        text not null default '',
  unvan        text not null default '',
  last_seen    timestamptz,
  updated_at   timestamptz not null default now()
);

-- Gün + kişi bazında hesaplanmış vardiya sonucu (calc_shifts çıktısı).
-- Zaman alanları gerçek UTC saklanır; okurken İstanbul duvar saatine çevrilir.
create table pdks_shifts (
  sicil         text not null,
  mesai_gunu    date not null,
  gece          boolean not null default false,
  net_min       numeric not null default 0,
  brut_min      numeric not null default 0,
  mola_min      numeric not null default 0,
  other_min     numeric not null default 0,
  turnike_kayit int not null default 0, -- çalışma alanı (turnike) kayıt sayısı
  kayit_sayisi  int not null default 0, -- o günün tüm kayıt sayısı
  ilk_giris     timestamptz,
  son_cikis     timestamptz,
  pairs         jsonb not null default '[]'::jsonb, -- [[girisISO, cikisISO], ...]
  outside       jsonb not null default '[]'::jsonb, -- turnike dışında kalınan aralıklar
  other_readers jsonb not null default '[]'::jsonb, -- turnike dışı okutulan okuyucu adları
  primary key (sicil, mesai_gunu)
);
create index idx_pdks_shifts_gun on pdks_shifts (mesai_gunu);

-- detect_alarms çıktısı.
create table pdks_alarms (
  id         bigint generated always as identity primary key,
  tip        text not null,
  sicil      text not null,
  mesai_gunu date not null,
  ts         timestamptz not null,
  okuyucu    text not null,
  detay      text not null default ''
);
create index idx_pdks_alarms_gun on pdks_alarms (mesai_gunu);
create index idx_pdks_alarms_sicil on pdks_alarms (sicil, mesai_gunu);

-- detect_buddy çıktısı (şüpheli tekrar okutmalar).
create table pdks_buddy (
  id         bigint generated always as identity primary key,
  sicil      text not null,
  mesai_gunu date not null,
  ts         timestamptz not null,
  okuyucu    text not null
);
create index idx_pdks_buddy_gun on pdks_buddy (mesai_gunu);

alter table pdks_sync_state enable row level security;
alter table pdks_personnel_cache enable row level security;
alter table pdks_shifts enable row level security;
alter table pdks_alarms enable row level security;
alter table pdks_buddy enable row level security;
