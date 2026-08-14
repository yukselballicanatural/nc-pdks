-- Kolay İK'yı ikinci takım kaynağı olarak ekler.
--
-- NEDEN: Kolay İK'nın person/bulk-view uç noktası açıldığında kişinin
-- "Departman" birimi (= takım) ve gerçek yöneticisi görünür oldu. Ölçüm
-- (2026-08-14): PDKS'teki 184 satış personelinden Kolay 136'sını, Zoho
-- 135'ini, ikisi birlikte 159'unu kapsıyor — Kolay İstanbul kadrosunu,
-- Zoho Fas ekiplerini içeriyor. Bu yüzden iki kaynak birlikte kullanılıyor
-- ve bir takım her iki kaynak anahtarını da taşıyabiliyor.
--
-- 0005 zaten uygulanmış olduğu için burada tablolar yeniden oluşturulmuyor,
-- yalnızca eksikler ekleniyor. Mevcut takım satırları ve verdiğiniz isimler
-- korunur.

-- 1) teams: Kolay kaynak anahtarı + Kolay yönetici kimliği
alter table teams add column if not exists kolay_departman text;
alter table teams add column if not exists lider_kolay_id  text;

-- Aynı Kolay departmanı iki takıma bağlanmasın.
create unique index if not exists teams_kolay_departman_key on teams (kolay_departman);
create index if not exists idx_teams_kolay_dep on teams (kolay_departman);

-- 2) team_member_overrides: anahtar zoho_user_id -> sicil
--
-- Kişi Kolay ve Zoho'da iki ayrı kimlikle duruyor; ikisini de kapsayan tek
-- ortak kimlik PDKS sicili. Tablo boş olduğu için yeniden oluşturuluyor
-- (veri kaybı yok — elle atama henüz yapılmamıştı).
drop table if exists team_member_overrides;

create table team_member_overrides (
  sicil      text primary key,
  team_id    uuid references teams (id) on delete cascade,
  not_text   text,
  created_by text,
  created_at timestamptz not null default now()
);

create index idx_tmo_team on team_member_overrides (team_id);
alter table team_member_overrides enable row level security;

-- 3) Kolay İK personel önbelleği
--
-- bulk-view 50'lik gruplar hâlinde çalışıyor; 370 çalışan için 8 ardışık istek
-- gerekiyor (~5-10 sn). Bu her sayfa açılışında yapılamaz, bu yüzden sonuç
-- burada saklanıp "Kolay İK ile Eşitle" ile tazeleniyor.
--
-- TCKN / IBAN / adres gibi kişisel veriler BİLİNÇLİ OLARAK alınmıyor —
-- PDKS'in bu alanlara ihtiyacı yok, eşleştirme isim üzerinden yapılıyor.
create table if not exists kolay_persons (
  kolay_id         text primary key,
  ad               text,
  soyad            text,
  tam_ad           text,
  is_eposta        text,
  bolum            text,                   -- "Bölüm" (PDKS pozisyon alanının aynısı)
  departman        text,                   -- "Departman" = takım
  unvan            text,                   -- "Unvan"
  firma            text,
  sube             text,
  manager_kolay_id text,
  ise_giris        date,
  durum            text,
  synced_at        timestamptz not null default now()
);

create index if not exists idx_kolay_persons_dep on kolay_persons (departman);
create index if not exists idx_kolay_persons_bolum on kolay_persons (bolum);

alter table kolay_persons enable row level security;
