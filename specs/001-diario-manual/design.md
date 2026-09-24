# Spec 001 · Diario manual — Diseño

**Estado:** Aprobado v2 (2026-09-24)
**Requisitos:** [requirements.md](requirements.md) (aprobado)

---

## 1. Arquitectura

```
┌──────────────── Pantallas (src/app) ────────────────┐
│ Hoy · Perfil · Buscar alimento · Nuevo alimento ·   │
│ Registrar · Editar registro                         │
└───────────────┬─────────────────────────────────────┘
                │ usan hooks
┌───────────────▼─────────────────────────────────────┐
│ Hooks de datos (src/features/*/hooks.ts)            │
│ TanStack Query: caché, reintentos, invalidación     │
└───────┬──────────────────────────────┬──────────────┘
        │                              │
┌───────▼─────────┐            ┌───────▼──────────────┐
│ api.ts          │            │ openFoodFacts.ts     │
│ Supabase (RLS)  │            │ fetch HTTPS sin clave│
└───────┬─────────┘            └──────────────────────┘
        │
┌───────▼─────────────────────────────────────────────┐
│ Funciones puras + tests (goals, macros, validación, │
│ fechas, normalización de texto)                     │
└─────────────────────────────────────────────────────┘
```

**Principios**
- La lógica de negocio vive en **funciones puras** y testeables; las pantallas solo componen.
- Todo acceso a datos pasa por **TanStack Query**, que se encarga de la caché, del estado de carga y de actualizar la pantalla al guardar (R6.5).
- Supabase aplica la seguridad con **RLS** (R7). La app no contiene secretos.

### Dependencias nuevas
Todas son compatibles con **Expo Go** en Android e iOS (R8.1).

| Paquete | Uso | Tipo |
|---|---|---|
| `@tanstack/react-query` | Caché y sincronización de datos | JS puro |
| `@expo/vector-icons` | Íconos de tabs y botones | Incluido en Expo Go |
| `@react-native-community/datetimepicker` | Fecha de nacimiento | Incluido en Expo Go |

Se instalan con `npx expo install`. Si no hay acceso a la API de Expo, se usa la versión de `bundledNativeModules.json`.

---

## 2. Modelo de datos (Supabase)

### 2.1 Migración `…_diary.sql`

```sql
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- Alimentos: catálogo base (owner_id null) + personalizados (owner_id = usuario)
create table public.foods (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users (id) on delete cascade,
  source        text not null check (source in ('catalog', 'custom')),
  name          text not null check (length(trim(name)) between 1 and 120),
  brand         text check (length(brand) <= 80),
  aliases       text[] not null default '{}',   -- sinónimos regionales (R3.7)
  slug          text unique,                  -- id estable del catálogo (permite actualizarlo con upsert)
  search_name   text not null,              -- minúsculas y sin tildes (trigger)
  kcal_100g     numeric(6,1) not null check (kcal_100g    >= 0 and kcal_100g <= 900),
  protein_100g  numeric(5,1) not null check (protein_100g >= 0),
  carbs_100g    numeric(5,1) not null check (carbs_100g   >= 0),
  fat_100g      numeric(5,1) not null check (fat_100g     >= 0),
  created_at    timestamptz not null default now(),
  check (protein_100g + carbs_100g + fat_100g <= 100),
  check ((source = 'catalog') = (owner_id is null)),
  check ((source = 'catalog') = (slug is not null))
);
create index foods_search_trgm on public.foods using gin (search_name extensions.gin_trgm_ops);

-- Registros de consumo, con una copia de los datos del alimento (R5.4)
create table public.food_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  eaten_on        date not null,
  meal_type       text not null check (meal_type in ('breakfast','lunch','afternoon','dinner','snack')),
  food_id         uuid references public.foods (id) on delete set null,
  food_source     text not null check (food_source in ('catalog','custom','off')),
  external_id     text,                      -- código Open Food Facts
  food_name       text not null,
  food_brand      text,
  grams           numeric(6,1) not null check (grams > 0 and grams <= 5000),
  kcal_100g       numeric(6,1) not null,
  protein_100g    numeric(5,1) not null,
  carbs_100g      numeric(5,1) not null,
  fat_100g        numeric(5,1) not null,
  kcal            numeric generated always as (kcal_100g    * grams / 100) stored,
  protein_g       numeric generated always as (protein_100g * grams / 100) stored,
  carbs_g         numeric generated always as (carbs_100g   * grams / 100) stored,
  fat_g           numeric generated always as (fat_100g     * grams / 100) stored,
  created_at      timestamptz not null default now()
);
create index food_logs_user_day on public.food_logs (user_id, eaten_on);
```

- Un **trigger** `foods_set_search_name` calcula `search_name = lower(extensions.unaccent(name || ' ' || coalesce(brand,'') || ' ' || array_to_string(aliases, ' ')))` en cada insert y update. La búsqueda ignora mayúsculas y tildes (R3.2).
- Los totales se calculan en columnas `generated`. Al editar los gramos se recalculan solos (R5.6) y la app no puede guardar valores inconsistentes.
- Se guarda una copia de los valores por 100 g, no una referencia viva, así que editar o borrar el alimento no cambia el historial (R5.4).

### 2.2 Políticas RLS (R7)

| Tabla | select | insert | update | delete |
|---|---|---|---|---|
| `foods` | `owner_id is null or owner_id = auth.uid()` | `owner_id = auth.uid() and source = 'custom'` | propio | propio |
| `food_logs` | `user_id = auth.uid()` | `user_id = auth.uid()` | propio | propio |
| `profiles` | ya existe (select/update propio) | — | — | — |

Nadie puede escribir en el catálogo base (R7.2): no hay política que permita `owner_id is null`.

### 2.3 Catálogo base (R3.1)
- Migración `…_seed_catalog.sql` con **80 o más alimentos genéricos** (proteínas, cereales, legumbres, lácteos, frutas, verduras, grasas, preparados típicos como tortilla de maíz, arepa, pan de molde, tortilla española) con valores por 100 g de **USDA FoodData Central**.
- Nombre principal en español neutro + `aliases` con variantes regionales (LatAm, España) y el nombre en inglés, para que funcione también en EE. UU.
- Va en una migración, y no en `seed.sql`, para que llegue a producción con `supabase db push`.

### 2.4 Perfil
- Se usa la tabla `profiles` de la Fase 0 sin cambios de esquema. Los rangos más estrictos de R1.2 se validan en la app; los `check` de la base quedan como red de seguridad.
- "Perfil completo" significa que `sex`, `birth_date`, `height_cm`, `weight_kg`, `activity_level` y `goal` no son nulos (R1.4).

---

## 3. Lógica de dominio (funciones puras)

| Archivo | Funciones | Requisitos |
|---|---|---|
| `src/features/profile/goals.ts` | `ageOn(birthDate, today)`, `bmr(p)`, `tdee(p)`, `calculateTargets(p, today)`, `isProfileComplete(p)` | R2.1, R2.2, R2.5, R1.4 |
| `src/features/profile/validation.ts` | `validateProfile(input, today)` → errores por campo | R1.2 |
| `src/features/diary/macros.ts` | `macrosFor(per100, grams)`, `sumMacros(items)`, `groupByMeal(logs)`, `validateGrams(g)` | R5.2, R5.3, R6.1, R6.3 |
| `src/features/foods/validation.ts` | `validateCustomFood(input)` | R4.2 |
| `src/features/foods/openFoodFacts.ts` | `parseOffProducts(json)` (sin red) + `searchOff(q, signal)` | R3.3, R3.4 |
| `src/lib/text.ts` | `normalizeSearch(s)`: minúsculas, sin tildes, espacios recortados | R3.2 |
| `src/lib/date.ts` | `toLocalISODate(d)`, `addDays(iso, n)`, `isFuture(iso)`, `formatDayLabel(iso)` ("Hoy", "Ayer", "lun 22 sep") | R5.5, R6.4 |

### 3.1 Cálculo de metas (R2)
```
edad  = años cumplidos a la fecha de hoy
TMB   = 10·peso + 6.25·estatura − 5·edad + (hombre ? 5 : −161)
TDEE  = TMB × {sedentario 1.2, ligero 1.375, moderado 1.55, activo 1.725, muy activo 1.9}
kcal  = TDEE × {bajar 0.8, mantener 1.0, subir 1.1}
prot  = peso × {bajar 2.0, mantener 1.6, subir 1.8}          (g)
grasa = kcal × 0.25 / 9                                       (g)
carb  = max(0, (kcal − prot·4 − grasa·9) / 4)                 (g)
→ todo redondeado a entero al final (R2.5)
```

**Ejemplo para el test:** hombre, 30 años, 180 cm, 80 kg, moderado, mantener.
TMB 1780 → TDEE 2759 → **2759 kcal · 128 g proteína · 77 g grasa · 389 g carbohidratos**.

### 3.2 Open Food Facts (R3)
- **Endpoint:** `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms={q}&search_simple=1&json=1&page_size=20&fields=code,product_name,product_name_es,brands,nutriments`
- **Encabezado:** `User-Agent: ProteinApp/0.1 (Android/iOS)`, como pide la política de Open Food Facts.
- **Parser:** usa `product_name_es` si existe y, si no, `product_name`. Toma `nutriments['energy-kcal_100g']`, `proteins_100g`, `carbohydrates_100g` y `fat_100g`. **Descarta** el producto si falta alguno o no es un número finito ≥ 0 (R3.4). Quita duplicados por `code`.
- **Límites de uso:** Open Food Facts limita las búsquedas a unas 10 por minuto por IP. Mitigaciones:
  - espera de 400 ms tras la última tecla (R3.6);
  - caché de 10 min por término (`staleTime`);
  - cancelación con `AbortSignal` cuando cambia el texto;
  - tiempo máximo de 8 s por búsqueda.
- **Si falla** (sin red, 429, 5xx o tiempo agotado): la búsqueda local se muestra igual, con el aviso "No se pudo buscar en Open Food Facts" (R3.5).

---

## 4. Capa de datos (hooks)

| Hook | Query key | Fuente | Invalida |
|---|---|---|---|
| `useProfile()` | `['profile']` | `profiles` (select propio) | — |
| `useSaveProfile()` | — | `update profiles` (datos + metas calculadas) | `['profile']` |
| `useLocalFoodSearch(q)` | `['foods', 'local', q]` | `foods` `ilike search_name %q%`, límite 20 | — |
| `useOffSearch(q)` | `['foods', 'off', q]` | Open Food Facts | — |
| `useCreateFood()` | — | `insert foods` | `['foods','local']` |
| `useDayLogs(date)` | `['logs', date]` | `food_logs` por `eaten_on`, orden `created_at` | — |
| `useAddLog()` / `useUpdateLog()` / `useDeleteLog()` | — | `food_logs` | `['logs', date]` (R6.5) |
| `useDebouncedValue(v, 400)` | — | utilidad | — |

- Un `QueryProvider` en `src/providers/` envuelve la app. Al cerrar sesión se ejecuta `queryClient.clear()` para que no quede información de otro usuario.
- Los tipos de fila se escriben a mano en `src/features/*/types.ts`. Cuando exista un proyecto Supabase vinculado se generarán con `supabase gen types`.

---

## 5. Navegación y pantallas

```
src/app/
  _layout.tsx                 (existe) AuthProvider + QueryProvider + Stack protegido
  (auth)/sign-in.tsx          (existe)
  (app)/
    _layout.tsx               Stack: (tabs) + pantallas modales
    (tabs)/
      _layout.tsx             Tabs (expo-router/tabs): "Hoy", "Perfil"
      index.tsx               Hoy        ?date=YYYY-MM-DD
      profile.tsx             Perfil     (+ cerrar sesión, movido desde Hoy)
    food-search.tsx           modal      ?date&meal
    food-new.tsx              modal      ?date&meal
    log/new.tsx               modal      ?date&meal&food=<JSON codificado>
    log/[id].tsx              modal      editar / eliminar
```

### Flujo principal
```
Hoy ──[+ en una comida]──▶ Buscar ──[elige resultado]──▶ Registrar (gramos) ──[Guardar]──▶ Hoy (actualizado)
                              └──[No lo encuentro]──▶ Nuevo alimento ──[Guardar]──▶ Registrar
Hoy ──[toca un registro]──▶ Editar registro ──[Guardar | Eliminar ✓]──▶ Hoy
```

### Pantallas
| Pantalla | Contenido | Requisitos |
|---|---|---|
| **Hoy** | Navegador de días (◀ fecha ▶, "Ir a hoy"; ▶ desactivado en hoy). Aviso de perfil incompleto. 4 barras (kcal, P, C, G) con "consumido / meta". Secciones por tipo de comida con subtotal de kcal y botón "+" | R1.4, R6.1–R6.4 |
| **Perfil** | Botones de selección para sexo, actividad y objetivo. Selector de fecha de nacimiento. Campos numéricos de estatura y peso. Tarjeta con la **vista previa de metas** en vivo. Guardar. Cerrar sesión | R1.1–R1.3, R2.3, R2.4 |
| **Buscar** | Campo con foco automático. Sección "Mis alimentos y catálogo" y luego "Open Food Facts", con indicador de carga propio. Fila: nombre, marca y kcal/100 g. Enlace "¿No lo encuentras? Créalo" | R3.2–R3.6 |
| **Nuevo alimento** | Nombre, marca y 4 valores por 100 g, con validación en línea | R4.1, R4.2 |
| **Registrar / Editar** | Alimento elegido. Gramos (teclado numérico, 100 por defecto). Botones de tipo de comida. Vista previa de macros en vivo. Guardar. En edición, además, Eliminar con confirmación | R5.1–R5.6 |

### Paso de datos entre pantallas
Los alimentos de Open Food Facts no existen en la base de datos, así que el alimento elegido viaja como **parámetro `food` (JSON codificado)** con nombre, marca, origen, id y valores por 100 g. Todos los parámetros de ruta se validan con una función `parseFoodParam()` que tiene test.

---

## 6. Componentes UI (`src/components/`)

| Componente | Descripción |
|---|---|
| `Screen` | `SafeAreaView` + `KeyboardAvoidingView` (iOS: `padding`) + `ScrollView` con `keyboardShouldPersistTaps="handled"` (R8.3) |
| `MacroProgress` | Etiqueta, `valor / meta` y barra. Si se excede la meta: color de alerta **y** texto "▲ +N" (R6.2) |
| `ChipGroup<T>` | Selección única accesible (`accessibilityRole="radio"`) |
| `NumberField` | `TextInput` con `keyboardType="decimal-pad"`, acepta coma o punto decimal y muestra el error bajo el campo |
| `DayNavigator` | ◀ etiqueta ▶ + "Ir a hoy" |
| `MealSection` | Título, subtotal de kcal, lista de `LogRow` y botón "+" |
| `FoodRow` / `LogRow` | Filas pulsables |
| `Banner` | Aviso informativo o de error, no bloqueante |

- **Estilo:** `StyleSheet` nativo y un archivo `src/components/theme.ts` con colores, espaciados y tipografía. No se agrega ninguna librería de UI.
- **Colores:** verde primario `#16a34a`; alerta `#dc2626` con ícono y texto, nunca solo color.

---

## 7. Manejo de errores

| Situación | Comportamiento |
|---|---|
| Error de Supabase al leer | Banner con "Reintentar" (`refetch`) |
| Error al guardar | `Alert` con el mensaje; el formulario conserva los datos |
| Open Food Facts falla o supera el límite | Aviso no bloqueante; los resultados locales siguen visibles (R3.5) |
| Validación de formulario | Error bajo cada campo; botón Guardar desactivado (R1.2, R4.2, R5.3) |
| Parámetro de ruta inválido | Mensaje "Alimento no válido" y botón volver |
| Sesión expirada | `AuthProvider` detecta `SIGNED_OUT` y `Stack.Protected` redirige al login |

---

## 8. Estrategia de pruebas

| Nivel | Qué | Herramienta | Requisitos |
|---|---|---|---|
| Unitario | `goals` (ejemplo §3.1, ambos sexos, 5 niveles de actividad, 3 objetivos, carbohidratos nunca negativos, cumpleaños el mismo día) | Jest | R2.1, R2.2, R2.5, R8.2 |
| Unitario | `validateProfile` (bordes 13/100 años, 100/250 cm, 30/300 kg) | Jest | R1.2 |
| Unitario | `macrosFor`, `sumMacros`, `groupByMeal`, `validateGrams` (0, 5000, 5000.1) | Jest | R5.2, R5.3, R6.1, R6.3 |
| Unitario | `validateCustomFood` (negativos, suma > 100) | Jest | R4.2 |
| Unitario | `parseOffProducts` con JSON de ejemplo (productos completos, incompletos y duplicados) | Jest | R3.3, R3.4 |
| Unitario | `normalizeSearch`, `date.ts`, `parseFoodParam` | Jest | R3.2, R5.5, R6.4 |
| Componente | `MacroProgress` muestra "▲ +N" al exceder la meta | Jest + `@testing-library/react-native` | R6.2 |
| Base de datos | `tests/db/*.sql` (SQL plano con aserciones): RLS entre usuarios A/B, catálogo de solo lectura, columnas generadas, sinónimos. Se ejecuta con `npm run test:db` contra Postgres 16 + un *stub* de Supabase (`tests/db/supabase_stub.sql`), también en CI | psql | R3.7, R5.4, R7.1, R7.2 |
| Manual | Checklist en **Android y iOS** (Expo Go): flujo completo, teclado, navegación por días, modo avión | Dispositivo real | R8.1, R8.3 |

Dependencia de pruebas adicional: `@testing-library/react-native` (solo de desarrollo).

---

## 9. Riesgos y decisiones

| # | Tema | Decisión |
|---|---|---|
| D1 | Tabla `meals` + `meal_items` del PLAN vs. una sola `food_logs` | **Una sola `food_logs`** con `meal_type`: más simple para la F1. En la F3 se agregará `photo_id` (nullable) para agrupar los ítems de una foto |
| D2 | USDA directo en F1 | **No**: requiere clave, que debe ir en una Edge Function. El catálogo base lo reemplaza en F1 y USDA se evaluará en F3 |
| D3 | Límite de uso de Open Food Facts | Espera tras teclear + caché + cancelación. Si no alcanza, se sube el mínimo a 3 caracteres (requiere cambio de spec) |
| D4 | Zona horaria | `eaten_on` es la **fecha local** del dispositivo (`toLocalISODate`), no UTC, para que un registro de las 23:30 no caiga al día siguiente |
| D5 | Tipos de Supabase | Escritos a mano en F1; se generarán cuando haya un proyecto vinculado |
