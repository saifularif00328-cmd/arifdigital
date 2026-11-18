-- Arif Digital - 03: pencatatan dan pembatasan pemakaian AI (dipakai Edge Function ai-generate)
create table if not exists public.ai_jobs (
  id bigint generated always as identity primary key,
  device_id text,
  user_id uuid references public.users(id) on delete set null,
  produk text,
  job_id text,
  model text,
  dibuat_pada timestamptz not null default now()
);
create index if not exists ai_jobs_device_idx on public.ai_jobs (device_id, dibuat_pada desc);
create index if not exists ai_jobs_user_idx on public.ai_jobs (user_id, dibuat_pada desc);
alter table public.ai_jobs enable row level security;  -- tanpa policy: hanya service_role (Edge Function) yang bisa mengakses

-- Dipanggil Edge Function. Mengizinkan bila: sesi akun valid, atau perangkat sudah memakai jatah uji coba.
-- Batas: 150 panggilan/jam untuk akun, 60 panggilan/jam untuk uji coba.
create or replace function public.ai_authorize(p_token uuid, p_device text, p_produk text, p_job text, p_model text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid; n int; trial_ok boolean := false; dev text := left(coalesce(p_device,''), 80);
begin
  if p_token is not null then uid := public.session_user_id(p_token); end if;
  if uid is null then
    select exists(select 1 from public.trial_usage where device_id = dev and produk = left(coalesce(p_produk,''),60) and dipakai > 0) into trial_ok;
    if not trial_ok then return jsonb_build_object('ok', false, 'code', 401, 'message', 'Masuk atau gunakan jatah uji coba terlebih dahulu.'); end if;
    select count(*) into n from public.ai_jobs where device_id = dev and user_id is null and dibuat_pada > now() - interval '1 hour';
    if n >= 60 then return jsonb_build_object('ok', false, 'code', 429, 'message', 'Batas pemakaian uji coba per jam tercapai. Coba lagi nanti atau masuk dengan akun.'); end if;
  else
    select count(*) into n from public.ai_jobs where user_id = uid and dibuat_pada > now() - interval '1 hour';
    if n >= 150 then return jsonb_build_object('ok', false, 'code', 429, 'message', 'Batas pemakaian AI per jam tercapai. Coba lagi sebentar lagi.'); end if;
  end if;
  insert into public.ai_jobs(device_id, user_id, produk, job_id, model) values (nullif(dev,''), uid, left(p_produk,60), left(p_job,80), left(p_model,60));
  delete from public.ai_jobs where dibuat_pada < now() - interval '30 days';
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.ai_authorize(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.ai_authorize(uuid,text,text,text,text) to service_role;

update public.settings set value = 'gemini-3.8-flash' where key = 'gemini_model';
update public.products set status = 'aktif' where slug in ('generator-perangkat-ajar','e-rapor');
