-- Takımlar.
--
-- TASARIM: "türetilmiş + override". Takım üyeliği zoho_users.role alanından
-- OTOMATİK türetilir; bu sayede Zoho güncellendikçe (kişi takım değiştirdi,
-- yeni kişi geldi) sistem kendiliğinden güncel kalır. Admin bir kişiyi elle
-- başka takıma taşımak isterse bu bir OVERRIDE olarak kaydedilir ve türetilene
-- göre öncelik kazanır; override silinince kişi otomatik akışa geri döner.
--
-- Üyelik listesini komple tabloya yazmıyoruz — yazsaydık Zoho'daki değişiklikler
-- ya kaybolurdu ya da her senkronizasyonda admin düzenlemelerini silmek zorunda
-- kalırdık. Sadece SAPMALAR saklanıyor.

-- Takım tanımı. source_role dolu ise takım Zoho'daki bir rolden türemiştir ve
-- üyeleri otomatik gelir; null ise admin'in elle açtığı takımdır.
create table teams (
  id           uuid primary key default gen_random_uuid(),
  ad           text not null unique,
  source_role  text unique,               -- zoho_users.role değeri
  lider_zoho_id text,                     -- takım liderinin zoho_users.id'si
  lider_role   text,                      -- liderin zoho rolü (ör. "Team Leader - Joel")
  aktif        boolean not null default true,
  sira         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_teams_source_role on teams (source_role);

-- Admin sapmaları. team_id null ise "bu kişi hiçbir takımda değil" demektir
-- (türetilmiş takımından çıkarılmış).
create table team_member_overrides (
  zoho_user_id text primary key,
  team_id      uuid references teams (id) on delete cascade,
  not_text     text,
  created_by   text,
  created_at   timestamptz not null default now()
);

create index idx_tmo_team on team_member_overrides (team_id);

alter table teams enable row level security;
alter table team_member_overrides enable row level security;
