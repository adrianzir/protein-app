-- Spec 002 · T1: código de barras en alimentos propios (R4.2, R4.3).
-- Se guarda el GTIN canónico (EAN-8 o EAN-13); UPC-A/UPC-E se normalizan en la app.

alter table public.foods
  add column barcode text
  constraint foods_barcode_format check (barcode ~ '^([0-9]{8}|[0-9]{13})$');

alter table public.foods
  add constraint foods_barcode_only_custom check (barcode is null or source = 'custom');

-- Un mismo código no se repite para un usuario; usuarios distintos sí pueden tenerlo.
create unique index foods_owner_barcode
  on public.foods (owner_id, barcode)
  where barcode is not null;
