-- Arif Digital - 02: fungsi akun produk, uji coba, data awan, dan bucket penyimpanan
-- Jalankan di Supabase SQL Editor (atau lewat apply_migration). Aman dijalankan ulang.

create extension if not exists pgcrypto with schema extensions;

-- ---------- pembantu ----------
create or replace function public.trial_limit() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(value,'')::int from public.settings where key = 'trial_limit'), 3)
$$;

create or replace function public.session_user_id(p_token uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select s.user_id from public.user_sessions s join public.users u on u.id = s.user_id
  where s.token = p_token and s.kedaluwarsa > now() and u.aktif and (u.masa_aktif is null or u.masa_aktif >= current_date)
$$;

-- ---------- login ----------
create or replace function public.login_user(p_username text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare u public.users; gagal int; tok uuid; uname text := lower(trim(p_username));
begin
  select count(*) into gagal from public.login_log where username = uname and not sukses and waktu > now() - interval '15 minutes';
  if gagal >= 8 then return jsonb_build_object('ok', false, 'error', 'terlalu_banyak_percobaan'); end if;
  select * into u from public.users where lower(username) = uname;
  if not found or not u.aktif or (u.masa_aktif is not null and u.masa_aktif < current_date) or u.password_hash <> crypt(p_password, u.password_hash) then
    insert into public.login_log(username, sukses) values (uname, false);
    return jsonb_build_object('ok', false, 'error', 'login_gagal');
  end if;
  insert into public.login_log(username, sukses) values (uname, true);
  delete from public.user_sessions where kedaluwarsa < now();
  insert into public.user_sessions(user_id) values (u.id) returning token into tok;
  return jsonb_build_object('ok', true, 'token', tok, 'user', jsonb_build_object('id', u.id, 'username', u.username, 'nama', u.nama, 'role', u.role, 'sekolah', u.sekolah, 'produk', to_jsonb(u.produk), 'masa_aktif', u.masa_aktif));
end $$;

create or replace function public.check_session(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', u.id, 'username', u.username, 'nama', u.nama, 'role', u.role, 'sekolah', u.sekolah, 'produk', to_jsonb(u.produk), 'masa_aktif', u.masa_aktif)
  from public.users u where u.id = public.session_user_id(p_token)
$$;

create or replace function public.logout_user(p_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin delete from public.user_sessions where token = p_token; return true; end $$;

-- ---------- data awan per pengguna ----------
create or replace function public.get_user_data(p_token uuid, p_app text, p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.user_data where user_id = public.session_user_id(p_token) and app = p_app and key = p_key
$$;

create or replace function public.list_user_data(p_token uuid, p_app text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'value', value, 'diperbarui_pada', diperbarui_pada) order by diperbarui_pada desc), '[]'::jsonb)
  from public.user_data where user_id = public.session_user_id(p_token) and app = p_app
$$;

create or replace function public.set_user_data(p_token uuid, p_app text, p_key text, p_value jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.session_user_id(p_token);
begin
  if uid is null then return false; end if;
  if pg_column_size(p_value) > 4000000 then return false; end if;
  insert into public.user_data(user_id, app, key, value, diperbarui_pada) values (uid, p_app, p_key, p_value, now())
  on conflict (user_id, app, key) do update set value = excluded.value, diperbarui_pada = now();
  return true;
end $$;

create or replace function public.delete_user_data(p_token uuid, p_app text, p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := public.session_user_id(p_token);
begin
  if uid is null then return false; end if;
  delete from public.user_data where user_id = uid and app = p_app and key = p_key; return true;
end $$;

-- ---------- uji coba gratis ----------
create or replace function public.trial_status(p_device text, p_produk text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('used', coalesce(t.dipakai,0), 'limit', public.trial_limit(), 'remaining', greatest(public.trial_limit() - coalesce(t.dipakai,0), 0))
  from (select 1) x left join public.trial_usage t on t.device_id = left(p_device, 80) and t.produk = left(p_produk, 60)
$$;

create or replace function public.consume_trial(p_device text, p_produk text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare lim int := public.trial_limit(); n int; dev text := left(p_device, 80); prod text := left(p_produk, 60);
begin
  if dev is null or length(dev) < 8 then return jsonb_build_object('ok', false, 'error', 'device_tidak_valid'); end if;
  insert into public.trial_usage(device_id, produk, dipakai) values (dev, prod, 0) on conflict do nothing;
  update public.trial_usage set dipakai = dipakai + 1, diperbarui_pada = now()
  where device_id = dev and produk = prod and dipakai < lim returning dipakai into n;
  if n is null then return jsonb_build_object('ok', false, 'error', 'trial_habis', 'remaining', 0, 'limit', lim); end if;
  return jsonb_build_object('ok', true, 'remaining', lim - n, 'limit', lim);
end $$;

-- ---------- khusus admin ----------
create or replace function public.admin_create_user(p_username text, p_password text, p_nama text, p_role text, p_sekolah text, p_masa_aktif date, p_produk text[]) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare nid uuid;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'Kata sandi minimal 6 karakter'; end if;
  insert into public.users(username, password_hash, nama, role, sekolah, masa_aktif, produk)
  values (lower(trim(p_username)), crypt(p_password, gen_salt('bf')), p_nama, coalesce(nullif(p_role,''),'guru'), p_sekolah, p_masa_aktif, coalesce(p_produk, array['generator-perangkat-ajar','e-rapor']))
  returning id into nid;
  return nid;
end $$;

create or replace function public.admin_set_password(p_user_id uuid, p_password text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if length(coalesce(p_password,'')) < 6 then raise exception 'Kata sandi minimal 6 karakter'; end if;
  update public.users set password_hash = crypt(p_password, gen_salt('bf')) where id = p_user_id;
  delete from public.user_sessions where user_id = p_user_id;
  return true;
end $$;

-- ---------- hak akses ----------
revoke all on function public.trial_limit(), public.session_user_id(uuid), public.login_user(text,text), public.check_session(uuid), public.logout_user(uuid),
  public.get_user_data(uuid,text,text), public.list_user_data(uuid,text), public.set_user_data(uuid,text,text,jsonb), public.delete_user_data(uuid,text,text),
  public.trial_status(text,text), public.consume_trial(text,text), public.admin_create_user(text,text,text,text,text,date,text[]), public.admin_set_password(uuid,text) from public, anon, authenticated;
grant execute on function public.login_user(text,text), public.check_session(uuid), public.logout_user(uuid),
  public.get_user_data(uuid,text,text), public.list_user_data(uuid,text), public.set_user_data(uuid,text,text,jsonb), public.delete_user_data(uuid,text,text),
  public.trial_status(text,text), public.consume_trial(text,text) to anon, authenticated;
grant execute on function public.admin_create_user(text,text,text,text,text,date,text[]), public.admin_set_password(uuid,text) to authenticated;
grant execute on function public.trial_limit(), public.session_user_id(uuid) to service_role;

-- ---------- bucket foto/gambar portofolio ----------
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do nothing;
drop policy if exists "portfolio admin insert" on storage.objects;
drop policy if exists "portfolio admin update" on storage.objects;
drop policy if exists "portfolio admin delete" on storage.objects;
create policy "portfolio admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio' and public.is_admin());
create policy "portfolio admin update" on storage.objects for update to authenticated using (bucket_id = 'portfolio' and public.is_admin());
create policy "portfolio admin delete" on storage.objects for delete to authenticated using (bucket_id = 'portfolio' and public.is_admin());
