# Spec 004 · Historial, favoritos y recientes — Diseño

**Estado:** Borrador
**Requisitos:** [requirements.md](requirements.md) (aprobado)
**Se apoya en:** [diseño de la Spec 001](../001-diario-manual/design.md) (`food_logs`, `FoodRef`, `LogForm`, Buscar, Hoy)

---

## 1. Arquitectura

```
Buscar (consulta vacía)                 Hoy                         Progreso (pestaña nueva)
├─ Favoritos  ◀── favorite_foods        └─ comida vacía              ├─ período 7 / 30 días + ◀ ▶
└─ Recientes  ◀── food_logs (30 días)      "Repetir de ayer"         ├─ métrica: kcal · P · C · G
        │                                   ◀── food_logs (ayer)     ├─ gráfico de barras (SVG) + meta
        ▼                                   └─▶ insert múltiple       └─ resumen del período
Registrar (Spec 001) con gramos iniciales                                 ◀── food_logs (rango)
  └─ ★ favorito (también en Editar registro)
```

**Principios**
- **Sin cambios a `food_logs`.** Recientes, Repetir y Progreso leen los registros que ya existen. La única tabla nueva es `favorite_foods`.
- Recientes y Progreso se calculan **en la app con funciones puras** sobre pocas filas (≤ 30 días). Así quedan testeadas con Jest y los totales usan la misma suma que Hoy (`sumMacros`), lo que garantiza R5.3.
- Se reutilizan `FoodRef`, `LogForm`, `FoodRow`, `ChipGroup`, `MealSection` y la navegación existente; Registrar solo aprende a recibir **gramos iniciales**.

### Dependencia nueva
| Paquete | Versión SDK 57 | Uso |
|---|---|---|
| `react-native-svg` | 15.15.4 (de `bundledNativeModules.json`) | Gráfico de barras de Progreso. Viene en Expo Go (R6.1); se instala con `npx expo install`. |

No se usa una librería de gráficos: un gráfico de barras con línea de meta son ~100 líneas de SVG, sin dependencias nativas extra (Victory Native requiere Skia y más peso).

---

## 2. Identidad de un alimento (`foodKey`)
Función pura en `features/foods/key.ts`, usada por recientes (R1.4), favoritos (R2.5) y la estrella.

| Fuente | Clave |
|---|---|
| `catalog`, `custom` con `id` | `catalog:<id>` / `custom:<id>` |
| `off` | `off:<código de barras>` |
| Sin id (alimento propio borrado, `food_id` = null) | `<fuente>:name:<nombre normalizado>` |

`entryFromRow` ya produce un `FoodRef` desde cada registro, así que la clave se calcula igual para registros, resultados de búsqueda y favoritos.

---

## 3. Modelo de datos

### 3.1 Tabla nueva `favorite_foods` (migración `20261009000000_favorite_foods.sql`)
```sql
create table public.favorite_foods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_key     text not null check (length(food_key) between 3 and 300),
  food_source  text not null check (food_source in ('catalog', 'custom', 'off')),
  food_id      uuid references public.foods (id) on delete cascade,  -- alimento propio borrado ⇒ deja de ser favorito
  external_id  text,
  -- Copia para funcionar con alimentos de Open Food Facts (R2.4).
  food_name    text not null check (length(trim(food_name)) between 1 and 200),
  food_brand   text,
  kcal_100g    numeric(6, 1) not null check (kcal_100g between 0 and 900),
  protein_100g numeric(5, 1) not null check (protein_100g >= 0),
  carbs_100g   numeric(5, 1) not null check (carbs_100g >= 0),
  fat_100g     numeric(5, 1) not null check (fat_100g >= 0),
  created_at   timestamptz not null default now(),
  unique (user_id, food_key)
);
alter table public.favorite_foods enable row level security;
-- select / insert / delete solo propios por (select auth.uid()); sin update (se borra y se vuelve a marcar).
```
- La restricción `unique (user_id, food_key)` hace idempotente marcar dos veces (la app trata el error `23505` como éxito).
- Los mismos límites que `food_logs` aseguran que un favorito siempre se pueda registrar.

### 3.2 Consultas sobre `food_logs` (sin cambios de esquema)
| Uso | Consulta | Índice |
|---|---|---|
| Recientes (R1) | columnas del alimento + `grams`, `created_at` de los últimos 30 días, `order by created_at desc`, `limit 300` | `food_logs_user_day` (filtra por `eaten_on`) |
| Progreso (R4, R5.2) | `eaten_on, kcal, protein_g, carbs_g, fat_g` con `eaten_on between from and to` (≤ 30 días) | `food_logs_user_day` |
| Repetir de ayer (R3) | la consulta del día de la Spec 001 (`useDayEntries(ayer)`) | `food_logs_user_day` |

Con ~10 registros diarios, 30 días son ~300 filas pequeñas: una sola consulta, sin RPC ni vistas.

---

## 4. Funciones puras

### 4.1 Recientes — `features/foods/recents.ts`
- `pickRecents(entries, { limit: 20 })` → recorre los registros ya ordenados del más nuevo al más antiguo y conserva el **primero de cada `foodKey`**: `{ food: FoodRef, lastGrams }` (R1.1–R1.5).
- `lastGramsFor(key, recents)` → gramos de la última vez o `undefined` (para favoritos, R2.3).

### 4.2 Progreso — `features/progress/stats.ts`
| Función | Resultado |
|---|---|
| `periodDays(end, length)` | Fechas `[end − length + 1 … end]` en el día local (R5.1) |
| `shiftPeriod(end, length, dir, today)` | Nuevo fin, sin pasar de hoy (R4.2) |
| `dailyTotals(rows, days)` | Por día: `Macros` (con `sumMacros`) o `null` si no hay registros (R4.6, R5.3) |
| `periodSummary(daily, goals)` | Promedios de los días con registros, `daysLogged`, `daysWithinGoal` (kcal en ±10 % de la meta; `null` sin meta) (R4.5, Q3) |
| `chartScale(values, goal)` | Máximo del eje con 10 % de margen, que incluye la meta, y 3 marcas redondeadas |

### 4.3 Gramos iniciales — `features/diary/params.ts`
- `parseGramsParam(value)` → número válido según `validateGrams` o `GRAMS_LIMITS.default` (100).

---

## 5. Capa de datos (hooks)

| Hook | Clave de caché | Notas |
|---|---|---|
| `useRecentFoods()` | `['logs', 'recent']` | `pickRecents` sobre la consulta 3.2 |
| `useFavorites()` | `['favorites']` | Lista + `Set` de claves para la estrella |
| `useToggleFavorite()` | invalida `['favorites']` | Inserta (23505 = ya existía) o borra por `food_key` |
| `useRangeTotals(from, to)` | `['logs', 'range', from, to]` | `dailyTotals` sobre la consulta 3.2 |
| `useCopyEntries()` | invalida `['logs']` | Un solo `insert` con todas las filas: atómico, todos o ninguno (R3.3) |

**Invalidación (R5.4):** las mutaciones del diario (agregar, editar, eliminar, copiar) pasan a invalidar el prefijo `['logs']` en vez de solo el día. TanStack Query recarga únicamente las consultas activas, así que Hoy, Recientes y Progreso se actualizan sin costo extra.

---

## 6. Pantallas y navegación

### 6.1 Buscar (R1, R2)
- Con la consulta vacía (menos de 2 letras), en lugar del aviso actual se muestran **Favoritos** (orden alfabético) y **Recientes** (más reciente primero), con el aviso "Escribe al menos 2 letras para buscar" arriba.
- `FoodRow` recibe `subtitle` (p. ej. "Última vez: 150 g") y `favorite` (estrella pequeña, también en los resultados de búsqueda, R2.5).
- Elegir uno abre Registrar con `grams` = últimos gramos (o 100).
- Si no hay favoritos ni recientes, solo se ve el aviso (primer uso).

### 6.2 Registrar y Editar registro (R2.1)
- Botón **★ / ☆** en la barra superior (`headerRight` con `Stack.Screen options`), `accessibilityLabel` "Agregar a favoritos" / "Quitar de favoritos", `accessibilityState.selected`.
- Registrar acepta el parámetro `grams` (4.3) como cantidad inicial.

### 6.3 Hoy: Repetir de ayer (R3)
- `MealSection` recibe `onRepeat?` y `repeatCount?`. Si la comida está vacía y ayer tuvo registros en ese tipo de comida, muestra el enlace **"Repetir de ayer (N)"** en lugar de "Sin registros".
- Al tocarlo: confirmación con la lista de alimentos y el total de kcal (`Alert` con botones; en web, `window.confirm`, como `confirmDestructive`).
- La consulta de ayer reutiliza `useDayEntries(addDays(date, −1))`, que suele estar en caché porque el usuario navega entre días.

### 6.4 Progreso (R4) — `src/app/(app)/(tabs)/progress.tsx`
- Pestaña **Progreso** (ícono `stats-chart-outline`) entre Hoy y Perfil (Q1).
- Arriba: `ChipGroup` **7 días / 30 días**, navegador de período (◀ "1–7 oct" ▶; ▶ desactivado si el período termina hoy) y `ChipGroup` de métrica.
- Gráfico (`components/BarChart.tsx`, SVG): una barra por día; días sin registros sin barra y con un punto gris en la base; línea punteada de meta con etiqueta; 3 marcas en el eje. En 30 días las etiquetas del eje X se muestran cada 5 días.
- Cada barra es un `Pressable` accesible ("Lunes 6 de octubre: 1850 kcal") que navega a Hoy con `router.navigate({ pathname: '/', params: { date } })` (R4.7).
- El contenedor del gráfico tiene `accessibilityLabel` con el resumen en texto del período (R6.4).
- Debajo, el resumen: promedio diario de kcal y macros, "Días con registros: 5 de 7", "Días dentro de la meta: 3".
- Sin meta: gráfico sin línea y `Banner` "Completa tu perfil para ver tu meta" (R4.8). Sin registros: mensaje y botón "Ir a Hoy" (R4.9).

---

## 7. Manejo de errores
| Situación | Comportamiento |
|---|---|
| Falla la carga de favoritos o recientes | Buscar sigue funcionando; las secciones no se muestran y la búsqueda normal está disponible |
| Falla marcar/desmarcar favorito | La estrella vuelve a su estado y se muestra "No se pudo actualizar favoritos" |
| Marcar un favorito que ya existe (23505) | Se trata como éxito |
| Falla "Repetir de ayer" | Mensaje con el error; como el `insert` es atómico, no queda nada a medias (R3.3) |
| Falla la carga de Progreso | Mensaje con **Reintentar** |
| Parámetro `grams` inválido en Registrar | Se usa 100 g |

---

## 8. Estrategia de pruebas
| Nivel | Qué se prueba | Requisitos |
|---|---|---|
| Unitarias (Jest) | `foodKey`, `pickRecents`, `lastGramsFor`, `parseGramsParam` | R1.1–R1.5, R2.3 |
| Unitarias (Jest) | `periodDays`, `shiftPeriod` (límite hoy, cambio de mes), `dailyTotals` (días vacíos, igual a `sumMacros`), `periodSummary` (±10 %, sin meta, sin registros), `chartScale` | R4.2, R4.5, R4.6, R5.1, R5.3 |
| Componentes (RNTL) | `BarChart` (barras, días vacíos, etiqueta accesible, toque), `MealSection` con "Repetir de ayer", `FoodRow` con estrella y subtítulo | R3.1, R4.3, R4.7, R6.4 |
| Hooks | invalidación del prefijo `['logs']`; `useToggleFavorite` con 23505 | R2.1, R5.4 |
| SQL (`npm run test:db`) | `favorite_foods`: RLS (B no ve ni borra favoritos de A), clave única por usuario, borrado en cascada al eliminar un alimento propio | R2.6, R6.3 |
| Web E2E (Playwright, Supabase simulado) | Favorito → aparece en Buscar → Registrar con gramos; Recientes; Repetir de ayer; Progreso 7/30 días y toque en un día | R1–R4 |
| Manual (Android e iOS) | Checklist en `tasks.md`: gráfico legible, estrella, repetir, VoiceOver/TalkBack en Progreso | R6.1, R6.4 |

---

## 9. Riesgos y decisiones
| Riesgo / decisión | Mitigación |
|---|---|
| Calcular en la app en vez de en la base | Volumen acotado (≤ 300 filas); si crece (historial de meses), se pasa a una RPC con `group by` sin cambiar las pantallas |
| La meta histórica no se guarda (Q2) | Progreso compara con la meta **actual**; se indica bajo el gráfico "Comparado con tu meta actual" |
| Favoritos con valores desactualizados (copia) | Es intencional (igual que los registros, Spec 001 R5.4); quitar y volver a marcar actualiza la copia |
| Gramos de favoritos usados hace más de 30 días | Se usa 100 g (los recientes solo miran 30 días); aceptable para F4 |
| Gráfico propio con SVG | Componente pequeño y testeado; evita dependencias nativas que no están en Expo Go |
