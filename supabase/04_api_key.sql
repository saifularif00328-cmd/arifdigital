-- 04: penyimpanan kunci API milik admin (dibaca hanya oleh Edge Function lewat service role)
create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  diubah timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

create or replace function public.admin_set_secret(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  if p_key not in ('gemini_api_key') then raise exception 'Nama kunci tidak dikenal'; end if;
  if coalesce(trim(p_value), '') = '' then
    delete from public.app_secrets where key = p_key;
  else
    insert into public.app_secrets(key, value, diubah) values (p_key, trim(p_value), now())
    on conflict (key) do update set value = excluded.value, diubah = now();
  end if;
end $$;

create or replace function public.admin_secret_info(p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v text; t timestamptz;
begin
  if not public.is_admin() then raise exception 'Hanya admin'; end if;
  select value, diubah into v, t from public.app_secrets where key = p_key;
  if v is null then return jsonb_build_object('ada', false); end if;
  return jsonb_build_object('ada', true, 'awal', left(v, 4), 'akhir', right(v, 4), 'diubah', t);
end $$;

revoke all on function public.admin_set_secret(text, text) from public, anon;
revoke all on function public.admin_secret_info(text) from public, anon;
grant execute on function public.admin_set_secret(text, text) to authenticated;
grant execute on function public.admin_secret_info(text) to authenticated;
