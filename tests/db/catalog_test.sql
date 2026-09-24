-- Spec 001 · T4: catálogo base global (R3.1, R3.2, R3.7).
begin;

do $$
declare
  n int;
  bad text;
begin
  select count(*) into n from public.foods where source = 'catalog';
  if n < 80 then
    raise exception 'FALLO [catálogo ≥ 80]: hay %', n;
  end if;

  -- Coherencia energética (Atwater 4/4/9): ±20 % o ±25 kcal. Se excluyen bebidas con alcohol.
  select string_agg(slug, ', ') into bad
  from public.foods
  where source = 'catalog'
    and slug not in ('cerveza', 'vino-tinto')
    and abs(kcal_100g - (4 * protein_100g + 4 * carbs_100g + 9 * fat_100g))
        > greatest(25, 0.20 * kcal_100g);
  if bad is not null then
    raise exception 'FALLO [kcal coherentes con macros]: %', bad;
  end if;

  -- Sinónimos regionales: aguacate / palta / avocado → mismo alimento (R3.7)
  select count(distinct id) into n
  from public.foods
  where search_name like '%aguacate%' and search_name like '%palta%' and search_name like '%avocado%';
  if n <> 1 then
    raise exception 'FALLO [sinónimos palta]: % filas', n;
  end if;

  -- Búsqueda sin tildes (R3.2): "platano" encuentra "Plátano"
  if not exists (select 1 from public.foods where slug = 'platano' and search_name like '%platano%') then
    raise exception 'FALLO [búsqueda sin tildes]';
  end if;
end
$$;

\echo '  ✓ catalog_test: todas las aserciones pasaron'
rollback;
