-- Emula lo mínimo de Supabase en un Postgres 16 vacío para probar migraciones y RLS
-- sin Docker. NO se aplica en Supabase real (allí ya existen estos objetos).

-- Los roles son globales al cluster: se crean solo si no existen.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id    uuid primary key,
  email text
);

-- Igual que en Supabase: el usuario viene del claim "sub" del JWT de la petición.
create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ),
    ''
  )::uuid
$$;

-- Supabase otorga privilegios de tabla a estos roles por defecto; RLS decide qué filas ven.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
