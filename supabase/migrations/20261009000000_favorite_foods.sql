-- Spec 004 · T1: alimentos favoritos (R2.4, R2.6).
-- Cada favorito guarda una copia del alimento, para funcionar también con productos de Open Food Facts.

create table public.favorite_foods (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Identidad del alimento calculada en la app (`foodKey`): "catalog:<id>", "off:<código>", etc.
  food_key      text not null check (length(food_key) between 3 and 300),
  food_source   text not null check (food_source in ('catalog', 'custom', 'off')),
  -- Si se borra un alimento propio, deja de ser favorito.
  food_id       uuid references public.foods (id) on delete cascade,
  external_id   text,
  food_name     text not null check (length(trim(food_name)) between 1 and 200),
  food_brand    text,
  -- Mismos límites que food_logs: un favorito siempre se puede registrar.
  kcal_100g     numeric(6, 1) not null check (kcal_100g between 0 and 900),
  protein_100g  numeric(5, 1) not null check (protein_100g >= 0),
  carbs_100g    numeric(5, 1) not null check (carbs_100g >= 0),
  fat_100g      numeric(5, 1) not null check (fat_100g >= 0),
  created_at    timestamptz not null default now(),
  constraint favorite_foods_user_key unique (user_id, food_key)
);

create index favorite_foods_food on public.favorite_foods (food_id);

alter table public.favorite_foods enable row level security;

create policy "favorite_foods_select_own" on public.favorite_foods
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorite_foods_insert_own" on public.favorite_foods
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Sin update: para actualizar la copia se quita y se vuelve a marcar.
create policy "favorite_foods_delete_own" on public.favorite_foods
  for delete to authenticated
  using (user_id = (select auth.uid()));
