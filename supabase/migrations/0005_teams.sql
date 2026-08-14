-- Takımlar + Kolay İK personel önbelleği.
--
-- TASARIM: "türetilmiş + override". Takım ÜYELİĞİ tabloya yazılmaz; her okumada
-- kaynaklardan canlı türetilir. Böylece Kolay/Zoho güncellendikçe (kişi takım
-- değiştirdi, yeni kişi geldi) sistem kendiliğinden güncel kalır. Admin bir
-- kişiyi elle taşırsa bu bir OVERRIDE olarak kaydedilir ve türetilene öncelik
-- kazanır; override silinince kişi otomatik akışa geri döner.
--
-- Üyelik listesini komple tabloya yazsaydık ya kaynaktaki değişiklikler
-- kaybolurdu ya da her eşitlemede admin düzenlemelerini silmek gerekirdi.
-- Sadece SAPMALAR saklanıyor.
--
-- NEDEN İKİ KAYNAK: Kolay İK ve Zoho farklı popülasyonları kapsıyor. Kolay,
-- İstanbul'daki kadrolu çalışanları (Departman alanı + gerçek yönetici bağı ile)
-- tutuyor; Zoho ise Fas takımlarını da içeriyor. PDKS'teki 184 satış
-- personelinden Kolay 136'sını, Zoho 135'ini kapsıyor, ikisi birlikte 159'unu.
-- Bu yüzden bir takımın iki kaynak anahtarı olabilir ve ikisi de saklanır.

-- Takım tanımı. Kaynak anahtarlarından biri dolu ise üyeleri otomatik gelir;
-- ikisi de null ise admin'in elle açtığı takımdır.
create table teams (
  id              uuid primary key default gen_random_uuid(),
  ad              text not null unique,
  kolay_departman text unique,             -- Kolay İK "Departman" birim adı
  source_role     text unique,             -- zoho_users.role değeri
  lider_zoho_id   text,                    -- takım liderinin zoho_users.id'si
  lider_role      text,                    -- liderin zoho rolü
  lider_kolay_id  text,                    -- Kolay İK yönetici kişi id'si
  aktif           boolean not null default true,
  sira            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_teams_source_role on teams (source_role);
create index idx_teams_kolay_dep on teams (kolay_departman);

-- Admin sapmaları. Kişi hem Kolay hem Zoho kimliğiyle gelebildiği için anahtar
-- olarak PDKS sicili kullanılır — iki sistemde de aynı kişiye işaret eder.
-- team_id null ise "bu kişi hiçbir takımda değil" demektir.
create table team_member_overrides (
  sicil      text primary key,
  team_id    uuid references teams (id) on delete cascade,
  not_text   text,
  created_by text,
  created_at timestamptz not null default now()
);

create index idx_tmo_team on team_member_overrides (team_id);

-- Kolay İK personel önbelleği.
-- Kolay'ın person/bulk-view uç noktası 50'lik gruplar hâlinde çalışıyor; 370
-- çalışan için 8 istek gerekiyor ve bu her sayfa açılışında yapılamayacak kadar
-- yavaş. Bu yüzden sonuç burada saklanıp "Kolay ile Eşitle" ile tazeleniyor
-- (turnike verisindeki materyalize yaklaşımın aynısı).
--
-- TCKN / IBAN / adres gibi kişisel veriler BİLİNÇLİ OLARAK alınmıyor — PDKS'in
-- bu alanlara ihtiyacı yok, eşleştirme isim üzerinden yapılıyor.
create table kolay_persons (
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

create index idx_kolay_persons_dep on kolay_persons (departman);
create index idx_kolay_persons_bolum on kolay_persons (bolum);

alter table teams enable row level security;
alter table team_member_overrides enable row level security;
alter table kolay_persons enable row level security;
