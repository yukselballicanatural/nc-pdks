-- Anlık senkronizasyon: GitHub/harici zamanlayıcı yerine Supabase'in kendisi
-- veri geldiği anda haber verir.
--
-- KULLANICI KARARI (2026-08-19): "veri zaten Supabase'de, çekip işleyeceksin,
-- neden GitHub'ı araya alıyoruz" — haklı. Önceki çözüm (GitHub Actions'ın
-- birkaç dakikada bir /api/cron'u YOKLAMASI) hâlâ bir bekleme süresi
-- içeriyordu ve gereksiz bir dış sisteme bağımlıydı. Bu migration onun yerine
-- geçer: turnike_gecisler veya time_tracker_events'e yeni bir satır INSERT
-- edildiği anda Postgres'in kendisi /api/cron'u çağırır. Bekleme yok, dış
-- sistem yok.
--
-- pg_net: Postgres içinden ASENKRON HTTP isteği atan Supabase uzantısı
-- (Supabase'in "Database Webhooks" özelliğinin de altında kullandığı mekanizma).
-- "Asenkron" önemli: INSERT işlemi isteğin YANITINI beklemez (fire-and-forget),
-- yani turnike donanımından veya mola uygulamasından gelen yazma işlemi bundan
-- hiç yavaşlamaz/etkilenmez.
create extension if not exists pg_net;

create or replace function pdks_notify_sync()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://nc-pdks.vercel.app/api/cron',
    headers := jsonb_build_object('x-sync-secret', '__SYNC_SECRET__'),
    timeout_milliseconds := 5000
  );
  return null; -- STATEMENT tetikleyicisi; dönüş değeri kullanılmıyor.
end;
$$;

-- STATEMENT bazlı (ROW değil) — toplu bir import binlerce satırı tek
-- transaction'da yazarsa /api/cron da tek sefer tetiklenir, binlerce kez değil.
-- /api/cron'un kendisi de idempotent ve veritabanı kilitli (bkz.
-- lib/sync/autoSync.ts), yani üst üste/eşzamanlı tetiklenmesi zaten güvenli;
-- burada sadece gereksiz yükü önlüyoruz.
drop trigger if exists pdks_notify_sync_turnike on turnike_gecisler;
create trigger pdks_notify_sync_turnike
  after insert on turnike_gecisler
  for each statement
  execute function pdks_notify_sync();

drop trigger if exists pdks_notify_sync_tracker on time_tracker_events;
create trigger pdks_notify_sync_tracker
  after insert on time_tracker_events
  for each statement
  execute function pdks_notify_sync();
