# Spec 001 · Diario manual — Tareas

**Estado:** Aprobado v2 (2026-09-24)
**Requisitos:** [requirements.md](requirements.md) · **Diseño:** [design.md](design.md)

**Convenciones**
- `[ ]` pendiente · `[x]` hecha. Se implementa **en orden**, una tarea por commit (o pocas tareas relacionadas).
- Cada tarea indica los requisitos que cubre (`R#.#`) y su **verificación** (✔).
- Antes de marcar una tarea: `npm run lint && npm run typecheck && npm test` en verde.

---

## Bloque A · Base de datos

- [x] **T1 · Migración `diary`**: extensiones `unaccent` y `pg_trgm`; tablas `foods` y `food_logs` con sus `check`; trigger `search_name`; índices. _(R3.2, R4.2, R5.3, R5.4, R5.6)_
  ✔ `supabase db reset` local aplica sin errores; insertar un registro con 150 g calcula `kcal = kcal_100g × 1.5`.
- [x] **T2 · Políticas RLS** para `foods` y `food_logs` según la tabla §2.2 del diseño. _(R4.3, R7.1, R7.2)_
  ✔ Incluido en la migración de T1; se verifica en T3.
- [x] **T3 · Tests SQL** en `tests/db/` + `scripts/test-db.sh` (`npm run test:db`) + job de CI con Postgres 16: A no ve los registros ni los alimentos de B; nadie inserta en el catálogo; columnas generadas; constraints. _(R7.1, R7.2)_
  ✔ `npm run test:db` en verde localmente y en CI.
- [x] **T4 · Catálogo base global**: migración `seed_catalog` con 80 o más alimentos genéricos (LatAm, España, EE. UU.) por 100 g, con `aliases` regionales y en inglés. _(R3.1, R3.7)_
  ✔ `count(*)` ≥ 80; suma de macros ≤ 100 en todos; buscar "aguacate", "palta" y "avocado" devuelve el mismo alimento.

## Bloque B · Dominio (funciones puras + tests)

- [x] **T5 · `lib/text.ts`**: `normalizeSearch`. _(R3.2)_
  ✔ Tests: "Plátano" → "platano", espacios, mayúsculas.
- [x] **T6 · `lib/date.ts`**: `toLocalISODate`, `addDays`, `isFuture`, `formatDayLabel`. _(R5.5, R6.4, D4)_
  ✔ Tests: cambio de mes y año, "Hoy" y "Ayer", 23:30 local no cambia de día.
- [x] **T7 · `features/profile/goals.ts`**: `ageOn`, `bmr`, `tdee`, `calculateTargets`, `isProfileComplete`. _(R1.4, R2.1, R2.2, R2.5)_
  ✔ Tests: ejemplo §3.1 (2759 / 128 / 77 / 389), mujer, 5 niveles de actividad, 3 objetivos, carbohidratos ≥ 0, cumpleaños el mismo día.
- [x] **T8 · `features/profile/validation.ts`**: `validateProfile`. _(R1.2)_
  ✔ Tests en los bordes: 12/13/100/101 años, 99/100/250/251 cm, 29/30/300/301 kg.
- [x] **T9 · `features/diary/macros.ts`**: `macrosFor`, `sumMacros`, `groupByMeal`, `validateGrams`, lista `MEAL_TYPES` con etiquetas en español. _(R5.2, R5.3, R6.1, R6.3)_
  ✔ Tests: 0 / 0.1 / 5000 / 5000.1 g; suma vacía = 0; orden de las comidas.
- [x] **T10 · `features/foods/validation.ts`**: `validateCustomFood` y `parseFoodParam`. _(R4.2, R5.1)_
  ✔ Tests: negativos, suma > 100, nombre vacío, JSON inválido.
- [x] **T11 · `features/foods/openFoodFacts.ts`**: `parseOffProducts` y `searchOff` (User-Agent, `AbortSignal`, tiempo máximo de 8 s). _(R3.3, R3.4, R3.5)_
  ✔ Tests con un JSON de ejemplo: completos, incompletos, duplicados, `product_name_es` preferido.

## Bloque C · Infraestructura de app

- [ ] **T12 · Dependencias**: `@tanstack/react-query`, `@expo/vector-icons`, `@react-native-community/datetimepicker`, `@testing-library/react-native` (dev), con versiones del SDK 57. _(R8.1)_
  ✔ `npx expo-doctor` sin errores de versión (o comparación con `bundledNativeModules.json`).
- [ ] **T13 · `QueryProvider`** en el layout raíz; `queryClient.clear()` al cerrar sesión. _(R6.5, R7.1)_
  ✔ Al cerrar sesión y entrar con otro usuario no se ven datos del anterior.
- [ ] **T14 · Tipos de fila** (`features/*/types.ts`) y **api + hooks**: profile, foods (local + OFF + create), diary (CRUD), `useDebouncedValue`. _(R1.3, R3.2, R3.6, R4.1, R5.4, R5.6, R6.5)_
  ✔ Typecheck en verde; `useDebouncedValue` con test de 400 ms (temporizadores falsos).

## Bloque D · Componentes UI

- [ ] **T15 · `theme.ts`, `Screen`, `Banner`, `NumberField`, `ChipGroup`.** _(R8.3, R8.4)_
  ✔ `NumberField` acepta "12,5" → 12.5 (test).
- [ ] **T16 · `MacroProgress`, `DayNavigator`, `MealSection`, `FoodRow`, `LogRow`.** _(R6.1–R6.4)_
  ✔ Test de componente: `MacroProgress` muestra "▲ +N" al superar la meta.

## Bloque E · Pantallas

- [ ] **T17 · Navegación**: `(app)/_layout` Stack + `(tabs)` con "Hoy" y "Perfil"; mover "Cerrar sesión" a Perfil; rutas modales vacías. _(R8.1)_
  ✔ Se compila para Android e iOS (`expo export`).
- [ ] **T18 · Pantalla Perfil**: formulario, vista previa de metas en vivo, guardar datos y metas. _(R1.1–R1.3, R2.3, R2.4)_
  ✔ Manual: guardar, cerrar sesión, volver a entrar → los datos persisten.
- [ ] **T19 · Pantalla Hoy**: navegador de días, aviso de perfil incompleto, 4 barras, secciones por comida con subtotales. _(R1.4, R6.1–R6.4)_
  ✔ Manual: ▶ desactivado en hoy; el aviso desaparece al completar el perfil.
- [ ] **T20 · Pantalla Buscar**: búsqueda local + OFF con espera de 400 ms, secciones, aviso si OFF falla, enlace a "Nuevo alimento". _(R3.2–R3.6)_
  ✔ Manual: en modo avión se ve el aviso y los resultados locales siguen apareciendo.
- [ ] **T21 · Pantalla Nuevo alimento.** _(R4.1–R4.3)_
  ✔ Manual: un alimento creado aparece en la búsqueda solo para su dueño.
- [ ] **T22 · Pantalla Registrar**: gramos (100 por defecto), tipo de comida, vista previa en vivo, guardar en el día seleccionado. _(R5.1–R5.5, R6.5)_
  ✔ Manual: al guardar, "Hoy" muestra el registro sin recargar.
- [ ] **T23 · Pantalla Editar registro**: cambiar gramos y comida; eliminar con confirmación. _(R5.6, R6.5)_
  ✔ Manual: editar recalcula los totales; eliminar pide confirmación.

## Bloque F · Cierre

- [ ] **T24 · Verificación en dispositivos**: checklist manual completo en **Android e iOS** con Expo Go (flujo completo, teclado, días, modo avión). _(R8.1, R8.3)_
  ✔ Checklist marcado en la sección siguiente.
- [ ] **T25 · Documentación**: README (nuevas migraciones, cómo probar), estado de la spec → Implementado, PLAN (Fase 1 ✅). _(—)_

---

## Checklist manual (T24)
| # | Paso | Android | iOS |
|---|---|---|---|
| M1 | Registro e ingreso con correo | ☐ | ☐ |
| M2 | Perfil incompleto → aviso en Hoy → completar → el aviso desaparece | ☐ | ☐ |
| M3 | Las metas de la vista previa coinciden con las guardadas | ☐ | ☐ |
| M4 | Buscar "pollo" → resultados del catálogo y de OFF | ☐ | ☐ |
| M5 | Crear alimento propio y registrarlo | ☐ | ☐ |
| M6 | Registrar 150 g → totales correctos | ☐ | ☐ |
| M7 | Editar gramos y eliminar un registro | ☐ | ☐ |
| M8 | Día anterior → registrar → volver a Hoy | ☐ | ☐ |
| M9 | Modo avión en Buscar → aviso y resultados locales | ☐ | ☐ |
| M10 | El teclado no tapa campos en Perfil ni en Registrar | ☐ | ☐ |
| M11 | Superar una meta → "▲ +N" visible | ☐ | ☐ |

## Trazabilidad requisitos → tareas
| Req. | Tareas | Req. | Tareas |
|---|---|---|---|
| R1 | T7, T8, T18, T19 | R5 | T1, T9, T10, T22, T23 |
| R2 | T7, T18 | R6 | T9, T13, T16, T19, T22, T23 |
| R3 | T1, T4, T5, T11, T14, T20 | R7 | T2, T3, T13 |
| R4 | T1, T2, T10, T21 | R8 | T12, T15, T17, T24 |

## Riesgos de implementación
- **Supabase local no disponible en el entorno de Claude** (Docker sin daemon): T1–T4 se validan en un **Postgres 16 local** con un esquema `auth` simulado (`auth.uid()`, roles `authenticated`/`anon`). La validación final la hace el usuario con `supabase db push` en su proyecto.
- **Open Food Facts no accesible desde el entorno de Claude:** T11 se probó con un JSON de ejemplo con la estructura documentada de la API; la búsqueda real se verifica en M4 y M9.
- **Sin dispositivos en el entorno de Claude:** T24 la ejecuta el usuario; Claude verifica que la app compile para Android e iOS y la prueba en web.
