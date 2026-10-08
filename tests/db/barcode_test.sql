-- Spec 002 · T2: código de barras en alimentos propios (R4.2, R4.3, R7).
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

-- El catálogo no admite códigos (como postgres, sin RLS: prueba la restricción)
select test.expect_error(
  $$update public.foods set barcode = '7802800716500' where slug = 'palta'$$,
  '23514', 'código en alimento de catálogo');

-- ── Usuario A ──────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
set local role authenticated;

insert into public.foods (owner_id, source, name, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('00000000-0000-0000-0000-00000000000a', 'custom', 'Yogur casero', '7802800716500', 95, 3.2, 15, 2.5);

select test.expect_eq(
  (select name from public.foods where barcode = '7802800716500'), 'Yogur casero', 'A encuentra su código');

-- EAN-8 válido en formato
insert into public.foods (owner_id, source, name, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('00000000-0000-0000-0000-00000000000a', 'custom', 'Chicle', '96385074', 250, 0, 60, 0);

-- Formatos inválidos (R4.2)
select test.expect_error(
  $$insert into public.foods (owner_id, source, name, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000a', 'custom', 'X', '036000291452', 1, 0, 0, 0)$$,
  '23514', 'UPC-A de 12 dígitos sin normalizar');
select test.expect_error(
  $$insert into public.foods (owner_id, source, name, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000a', 'custom', 'X', '78028007165AB', 1, 0, 0, 0)$$,
  '23514', 'código con letras');

-- Duplicado del mismo usuario (R4.3)
select test.expect_error(
  $$insert into public.foods (owner_id, source, name, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g) values ('00000000-0000-0000-0000-00000000000a', 'custom', 'Otro', '7802800716500', 1, 0, 0, 0)$$,
  '23505', 'código duplicado del mismo usuario');

-- ── Usuario B ──────────────────────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
set local role authenticated;

select test.expect_eq(
  (select count(*) from public.foods where barcode = '7802800716500')::int, 0, 'B no encuentra el código de A');

-- Otro usuario puede usar el mismo código
insert into public.foods (owner_id, source, name, barcode, kcal_100g, protein_100g, carbs_100g, fat_100g)
values ('00000000-0000-0000-0000-00000000000b', 'custom', 'Yogur de B', '7802800716500', 90, 3, 14, 2);

select test.expect_eq(
  (select name from public.foods where barcode = '7802800716500'), 'Yogur de B', 'B ve solo su propio alimento');

reset role;

\echo '  ✓ barcode_test: todas las aserciones pasaron'
rollback;
