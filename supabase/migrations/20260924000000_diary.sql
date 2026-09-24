-- Spec 001 · Diario manual: alimentos (catálogo + personalizados) y registros de consumo.
-- Ver specs/001-diario-manual/design.md §2.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- foods
-- ---------------------------------------------------------------------------
create table public.foods (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users (id) on delete cascade,
  source        text not null check (source in ('catalog', 'custom')),
  slug          text unique,
  name          text not null check (length(trim(name)) between 1 and 120),
  brand         text check (length(brand) <= 80),
  aliases       text[] not null default '{}',
  search_name   text not null,
  kcal_100g     numeric(6, 1) not null check (kcal_100g between 0 and 900),
  protein_100g  numeric(5, 1) not null check (protein_100g >= 0),
  carbs_100g    numeric(5, 1) not null check (carbs_100g >= 0),
  fat_100g      numeric(5, 1) not null check (fat_100g >= 0),
  created_at    timestamptz not null default now(),
  constraint foods_macros_max_100 check (protein_100g + carbs_100g + fat_100g <= 100),
  constraint foods_catalog_has_no_owner check ((source = 'catalog') = (owner_id is null)),
  constraint foods_catalog_has_slug check ((source = 'catalog') = (slug is not null))
);

create index foods_search_trgm on public.foods using gin (search_name extensions.gin_trgm_ops);
create index foods_owner on public.foods (owner_id);

-- Texto de búsqueda en minúsculas y sin tildes: nombre + marca + sinónimos (R3.2, R3.7).
-- Se usa la forma de dos argumentos de unaccent porque search_path está vacío.
create function public.foods_set_search_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_name := lower(extensions.unaccent(
    'extensions.unaccent'::regdictionary,
    concat_ws(' ', new.name, new.brand, array_to_string(new.aliases, ' '))
  ));
  return new;
end;
$$;

create trigger foods_set_search_name
  before insert or update of name, brand, aliases on public.foods
  for each row execute function public.foods_set_search_name();

alter table public.foods enable row level security;

create policy "foods_select_catalog_or_own" on public.foods
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "foods_insert_own_custom" on public.foods
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and source = 'custom');

create policy "foods_update_own" on public.foods
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and source = 'custom');

create policy "foods_delete_own" on public.foods
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- food_logs
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  eaten_on      date not null,
  meal_type     text not null check (meal_type in ('breakfast', 'lunch', 'afternoon', 'dinner', 'snack')),
  food_id       uuid references public.foods (id) on delete set null,
  food_source   text not null check (food_source in ('catalog', 'custom', 'off')),
  external_id   text,
  food_name     text not null check (length(trim(food_name)) between 1 and 200),
  food_brand    text,
  grams         numeric(6, 1) not null check (grams > 0 and grams <= 5000),
  -- Copia de los valores por 100 g al momento de registrar (R5.4).
  kcal_100g     numeric(6, 1) not null check (kcal_100g between 0 and 900),
  protein_100g  numeric(5, 1) not null check (protein_100g >= 0),
  carbs_100g    numeric(5, 1) not null check (carbs_100g >= 0),
  fat_100g      numeric(5, 1) not null check (fat_100g >= 0),
  kcal          numeric generated always as (kcal_100g * grams / 100) stored,
  protein_g     numeric generated always as (protein_100g * grams / 100) stored,
  carbs_g       numeric generated always as (carbs_100g * grams / 100) stored,
  fat_g         numeric generated always as (fat_100g * grams / 100) stored,
  created_at    timestamptz not null default now()
);

create index food_logs_user_day on public.food_logs (user_id, eaten_on);
create index food_logs_food on public.food_logs (food_id);

alter table public.food_logs enable row level security;

create policy "food_logs_select_own" on public.food_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "food_logs_insert_own" on public.food_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "food_logs_update_own" on public.food_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "food_logs_delete_own" on public.food_logs
  for delete to authenticated
  using (user_id = (select auth.uid()));
