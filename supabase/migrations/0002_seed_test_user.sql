-- Test kullanıcısı: yüksel / 12345 (admin rolü). bcrypt hash aşağıda gömülü.
insert into app_users (username, password_hash, role)
values ('yüksel', '$2b$10$PvdMaKc3FlddQa2nDc4K7Olhp8ywD6uV84i9qD796SR.LOD4Ix9se', 'admin')
on conflict (username) do update set password_hash = excluded.password_hash;
