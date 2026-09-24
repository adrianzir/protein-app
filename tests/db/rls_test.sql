-- Spec 001 · T3: RLS, constraints y columnas generadas (R3.7, R4.2, R4.3, R5.3, R5.4, R7.1, R7.2).
-- Todo corre en una transacción que se revierte al final.
begin;

create schema test;
grant usage on schema test to authenticated, anon;

-- Ejecuta `stmt` y exige que falle con `expected_state` (SQLSTATE).
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

grant execute on all functions in schema test to authenticated, anon;

-- Usuarios A y B
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.dev');

-- Un alimento de catálogo para las pruebas (el rol postgres omite RLS)
insert into public.foods (source, slug, name, aliases, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('catalog', 'test-platano', 'Plátano', '{banana,banano}', 89, 1.1, 22.8, 0.3);

-- ── Usuario A ──────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
set local role authenticated;

select test.expect_eq((select count(*) from public.profiles)::int, 1, 'A ve solo su perfil (creado por trigger)');
select test.expect_eq((select count(*) from public.foods where slug = 'test-platano')::int, 1, 'A ve el catálogo');

insert into public.foods (owner_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('00000000-0000-0000-0000-00000000000a', 'custom', 'Queque de la abuela', 380, 6, 52, 16);

insert into public.food_logs (eaten_on, meal_type, food_source, food_name, grams, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('2026-09-24', 'breakfast', 'catalog', 'Plátano', 150, 89, 1.1, 22.8, 0.3);

-- Columnas generadas (R5.4 / R5.6)
select test.expect_eq((select kcal from public.food_logs limit 1), 133.5::numeric, 'kcal = 89 × 1.5');
select test.expect_eq((select protein_g from public.food_logs limit 1), 1.65::numeric, 'proteína = 1.1 × 1.5');
update public.food_logs set grams = 200;
select test.expect_eq((select kcal from public.food_logs limit 1), 178::numeric, 'kcal se recalcula al editar gramos');
select test.expect_eq((select user_id from public.food_logs limit 1), '00000000-0000-0000-0000-00000000000a'::uuid, 'user_id por defecto = auth.uid()');

-- El catálogo es de solo lectura (R7.2)
select test.expect_error(
  $$insert into public.foods (source, slug, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('catalog', 'x', 'X', 1, 0, 0, 0)$$,
  '42501', 'insertar en catálogo');
select test.expect_error(
  $$insert into public.foods (owner_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000b', 'custom', 'X', 1, 0, 0, 0)$$,
  '42501', 'crear alimento a nombre de otro');
update public.foods set name = 'Hack' where slug = 'test-platano';
delete from public.foods where slug = 'test-platano';
select test.expect_eq((select name from public.foods where slug = 'test-platano'), 'Plátano', 'catálogo no se edita ni se borra');

-- Constraints (R4.2, R5.3)
select test.expect_error(
  $$insert into public.foods (owner_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000a', 'custom', 'X', 500, 50, 40, 20)$$,
  '23514', 'macros suman más de 100 g');
select test.expect_error(
  $$insert into public.foods (owner_id, source, name, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000a', 'custom', 'X', 100, -1, 0, 0)$$,
  '23514', 'macro negativo');
select test.expect_error(
  $$insert into public.food_logs (eaten_on, meal_type, food_source, food_name, grams, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('2026-09-24', 'lunch', 'catalog', 'X', 0, 1, 0, 0, 0)$$,
  '23514', 'gramos = 0');
select test.expect_error(
  $$insert into public.food_logs (eaten_on, meal_type, food_source, food_name, grams, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('2026-09-24', 'lunch', 'catalog', 'X', 5000.1, 1, 0, 0, 0)$$,
  '23514', 'gramos > 5000');
select test.expect_error(
  $$insert into public.food_logs (eaten_on, meal_type, food_source, food_name, grams, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('2026-09-24', 'once', 'catalog', 'X', 10, 1, 0, 0, 0)$$,
  '23514', 'tipo de comida inválido');

-- ── Usuario B ──────────────────────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
set local role authenticated;

select test.expect_eq((select count(*) from public.food_logs)::int, 0, 'B no ve registros de A');
select test.expect_eq((select count(*) from public.foods where source = 'custom')::int, 0, 'B no ve alimentos personalizados de A');
select test.expect_eq((select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a')::int, 0, 'B no ve el perfil de A');
update public.food_logs set grams = 1;
delete from public.food_logs;
select test.expect_error(
  $$insert into public.food_logs (user_id, eaten_on, meal_type, food_source, food_name, grams, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000a', '2026-09-24', 'lunch', 'catalog', 'X', 10, 1, 0, 0, 0)$$,
  '42501', 'B inserta registro a nombre de A');

-- ── Anónimo ────────────────────────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;
select test.expect_eq((select count(*) from public.foods)::int, 0, 'anon no ve alimentos');
select test.expect_eq((select count(*) from public.food_logs)::int, 0, 'anon no ve registros');

reset role;

select test.expect_eq((select grams from public.food_logs limit 1), 200.0::numeric, 'B no edita ni borra registros de A');

-- ── Búsqueda sin tildes y por sinónimos (R3.2, R3.7) ──────────────────────
select test.expect_eq((select search_name from public.foods where slug = 'test-platano'), 'platano banana banano', 'search_name normalizado');

\echo '  ✓ rls_test: todas las aserciones pasaron'
rollback;
