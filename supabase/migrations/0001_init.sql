-- PDKS Pro web şeması — bkz. plan: elegant-launching-sphinx.md
-- Not: Python tarafındaki atomic_json_dump/.bak deseni burada gereksiz;
-- Postgres transaction'ları ve Supabase backup'ı bu işlevi üstlenir.

create extension if not exists pgcrypto;

-- Auth: basit custom oturum (Supabase Auth DEĞİL). Şifreler bcrypt hash.
create table app_users (
  id            uuid primary key default gen_random_uuid(),
  username      text unique not null,
  password_hash text not null,
  role          text not null check (role in ('admin', 'tl')),
  tl_name       text,
  created_at    timestamptz not null default now()
);

-- Personel (Database.users portu, pdks_app_stabil_v8_4.py satır ~330-390)
create table personnel (
  sicil         text primary key,
  ad            text not null default '',
  soyad         text not null default '',
  sistem_adi    text not null default '',
  takim_lideri  text not null default 'Bilinmiyor',
  vardiya       text check (vardiya in ('gece', 'gunduz')),
  start_date    date,
  end_date      date,
  pozisyon      text not null default '',
  aktif         boolean not null default true,
  manual_match  boolean not null default false,
  full_name     text not null default '',
  role_name     text not null default '',
  original_agent_name text not null default '',
  updated_at    timestamptz not null default now()
);

-- PDKS ad-soyad -> Active Personnel sicil eşlemesi (Database.name_aliases portu)
create table name_aliases (
  pdks_ad_soyad text primary key, -- normalize edilmiş "ad soyad" anahtarı
  sicil         text not null references personnel(sicil) on delete cascade,
  created_at    timestamptz not null default now()
);

-- DEF_GECE_TL'nin düzenlenebilir hali (Database.gece_tl portu)
create table gece_tl (
  tl_name text primary key
);
insert into gece_tl (tl_name) values ('Ahmed Anwar'), ('Joel Awudu'), ('Ahmed Ismaeel');

-- Takım liderleri listesi (Database.team_leaders portu — dropdown/filtre için)
create table team_leaders (
  tl_name text primary key
);

-- Düzeltmeler (CorDB portu) — anahtar (sicil, tarih), upsert = "üzerine yazma"
create table corrections (
  sicil     text not null,
  tarih     text not null, -- gs formatı: dd.MM.yyyy (calcShifts anahtarıyla birebir uyumlu)
  ad_soyad  text not null default '',
  neden     text not null default '',
  orig_min  numeric not null default 0,
  yeni_min  numeric not null default 0,
  acik      text not null default '',
  ts        timestamptz not null default now(),
  primary key (sicil, tarih)
);

-- Okuyucu/kapı sınıflandırması (ReaderConfig portu)
create table reader_rules (
  reader_name text primary key,
  category    text not null check (category in ('work', 'break', 'ignore')),
  updated_at  timestamptz not null default now()
);

-- NOT: Ham turnike olayları için ayrı bir tablo YOK — bu proje için Excel yükleme
-- akışı gereksiz hale geldi, çünkü kaynak veri zaten Supabase'de canlı tutuluyor:
--   - `turnike_gecisler` (mevcut, bizim şemamıza dahil değil): sicil_no, ad, soyad,
--     event_time, giris_kapisi, kapi_no, pozisyon (=takım lideri adı), elendi
--     (elendi=true ⇔ giris_kapisi "Turnike..." içerir — work/break ayrımı zaten
--     ReaderConfig.readerIsTurnike() ile bizim tarafımızda da bağımsız hesaplanıyor,
--     elendi sadece çapraz kontrol amaçlı).
--   - `zoho_users` (mevcut): personel profil bilgileri (Employment_No, full_name,
--     start_date vb.) — vardiya bilgisi şu an yok, tüm personel gündüz kabul ediliyor.
-- lib/db/queries/pdksEvents.ts bu iki tabloyu okuyup PdksRawEvent[]'e map eder.

-- RLS: yazma her zaman server-side (service role) üzerinden yapılır.
alter table app_users enable row level security;
alter table personnel enable row level security;
alter table name_aliases enable row level security;
alter table gece_tl enable row level security;
alter table team_leaders enable row level security;
alter table corrections enable row level security;
alter table reader_rules enable row level security;
-- Not: bilinçli olarak hiçbir "anon" policy eklenmedi — client tarafı Supabase key'i
-- bu tablolara doğrudan erişemez, tüm okuma/yazma Next.js server (service role) üzerinden.
