-- Spec 004 · T2: alimentos favoritos (R2.6, R6.3).
begin;

create schema test;
grant usage on schema test to authenticated;

create function test.expect_error(stmt text, expected_state text, label text)
returns void
language plpgsql
as $$
begin
  execute stmt;
  raise exception 'FALLO [%]: se esperaba error % y no hubo error', label, expected_state;
exception
  when others then
    if sqlstate <> expected_state then
      raise exception 'FALLO [%]: se esperaba % y se obtuvo % (%)', label, expected_state, sqlstate, sqlerrm;
    end if;
end;
$$;

create function test.expect_eq(actual anyelement, expected anyelement, label text)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception 'FALLO [%]: esperado %, obtenido %', label, expected, actual;
  end if;
end;
$$;

grant execute on all functions in schema test to authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

-- ── Usuario A ──────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
set local role authenticated;

-- Favorito de catálogo
insert into public.favorite_foods (food_key, food_source, food_id, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g)
select 'catalog:' || id, 'catalog', id, name, kcal_100g, protein_100g, carbs_100g, fat_100g
from public.foods where slug = 'palta';

-- Favorito de Open Food Facts (sin food_id)
insert into public.favorite_foods (food_key, food_source, external_id, food_name, food_brand, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('off:7802800716500', 'off', '7802800716500', 'Yogur batido frutilla', 'Soprole', 95, 3.2, 15, 2.5);

-- Favorito de un alimento propio
insert into public.foods (id, owner_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', 'custom', 'Queque de la abuela', 380, 6, 52, 16);
insert into public.favorite_foods (food_key, food_source, food_id, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('custom:00000000-0000-0000-0000-0000000000f1', 'custom', '00000000-0000-0000-0000-0000000000f1', 'Queque de la abuela', 380, 6, 52, 16);

select test.expect_eq((select count(*) from public.favorite_foods)::int, 3, 'A ve sus 3 favoritos');

-- El mismo alimento dos veces se rechaza
select test.expect_error(
  $$insert into public.favorite_foods (food_key, food_source, external_id, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('off:7802800716500', 'off', '7802800716500', 'Yogur', 95, 3.2, 15, 2.5)$$,
  '23505', 'favorito duplicado del mismo usuario');

-- Valores fuera de rango
select test.expect_error(
  $$insert into public.favorite_foods (food_key, food_source, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('off:1', 'off', 'X', 901, 0, 0, 0)$$,
  '23514', 'kcal fuera de rango');
select test.expect_error(
  $$insert into public.favorite_foods (food_key, food_source, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('ai:1', 'ai', 'X', 100, 0, 0, 0)$$,
  '23514', 'fuente desconocida');
select test.expect_error(
  $$insert into public.favorite_foods (food_key, food_source, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('off:2', 'off', '  ', 100, 0, 0, 0)$$,
  '23514', 'nombre vacío');

-- No puede crear favoritos a nombre de otro usuario
select test.expect_error(
  $$insert into public.favorite_foods (user_id, food_key, food_source, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000b', 'off:3', 'off', 'X', 100, 0, 0, 0)$$,
  '42501', 'favorito a nombre de B');

-- ── Usuario B ──────────────────────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
set local role authenticated;

select test.expect_eq((select count(*) from public.favorite_foods)::int, 0, 'B no ve los favoritos de A');

delete from public.favorite_foods;  -- RLS: no afecta filas de A

-- B puede tener el mismo favorito que A
insert into public.favorite_foods (food_key, food_source, external_id, food_name, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('off:7802800716500', 'off', '7802800716500', 'Yogur batido frutilla', 95, 3.2, 15, 2.5);
select test.expect_eq((select count(*) from public.favorite_foods)::int, 1, 'B tiene su propio favorito');

-- ── Usuario A otra vez ─────────────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
set local role authenticated;

select test.expect_eq((select count(*) from public.favorite_foods)::int, 3, 'el borrado de B no tocó a A');

-- Borrar el alimento propio borra su favorito
delete from public.foods where id = '00000000-0000-0000-0000-0000000000f1';
select test.expect_eq(
  (select count(*) from public.favorite_foods where food_source = 'custom')::int, 0, 'favorito borrado en cascada');

-- Quitar un favorito
delete from public.favorite_foods where food_key = 'off:7802800716500';
select test.expect_eq((select count(*) from public.favorite_foods)::int, 1, 'A quitó un favorito');

reset role;

-- El favorito de B sigue intacto
select test.expect_eq(
  (select count(*) from public.favorite_foods where user_id = '00000000-0000-0000-0000-00000000000b')::int, 1,
  'el favorito de B sigue');

\echo '  ✓ favorites_test: todas las aserciones pasaron'
rollback;
