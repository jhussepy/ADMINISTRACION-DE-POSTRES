-- Migración de autenticación: Supabase Auth -> Clerk + Google.
-- Ejecutar una sola vez DESPUÉS de configurar Clerk como Third-Party Auth.
begin;

drop policy if exists "Read own admin membership" on public.admins;
drop policy if exists "Own profile only" on public.profiles;

alter table public.admins
  drop constraint if exists admins_user_id_fkey;
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.admins
  alter column user_id type text using user_id::text;
alter table public.profiles
  alter column id type text using id::text;

drop function if exists public.is_admin();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.admins
    where user_id=(select auth.jwt()->>'sub')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Read own admin membership"
on public.admins
for select
to authenticated
using(user_id=(select auth.jwt()->>'sub'));

create policy "Own profile only"
on public.profiles
for all
to authenticated
using(id=(select auth.jwt()->>'sub'))
with check(id=(select auth.jwt()->>'sub'));

commit;

-- Después de iniciar sesión por primera vez con Google, copia el Clerk User ID
-- (formato user_...) desde Clerk Dashboard > Users y concédele administración:
-- insert into public.admins(user_id) values ('user_REEMPLAZAR') on conflict do nothing;
