# Spec 002 · Código de barras — Tareas

**Estado:** Aprobado (2026-10-07)
**Requisitos:** [requirements.md](requirements.md) · **Diseño:** [design.md](design.md)

**Convenciones** (iguales a la Spec 001)
- `[ ]` pendiente · `[x]` hecha. Se implementa **en orden**, una tarea por commit (o pocas relacionadas).
- Cada tarea indica los requisitos que cubre (`R#.#`) y su **verificación** (✔).
- Antes de marcar una tarea: `npm run lint && npm run typecheck && npm test` (y `npm run test:db` si toca SQL) en verde.

---

## Bloque A · Base de datos

- [x] **T1 · Migración `food_barcode`**: columna `barcode` (formato GTIN-8/13), restricción "solo `custom`", índice único `(owner_id, barcode)`. _(R4.2, R4.3)_
  ✔ Se aplica sobre las migraciones existentes en Postgres 16 local.
- [x] **T2 · Test SQL `tests/db/barcode_test.sql`**: formato inválido rechazado; código en catálogo rechazado; duplicado del mismo usuario rechazado; dos usuarios con el mismo código permitido; B no encuentra el código de A. _(R4.2, R4.3, R7)_
  ✔ `npm run test:db` en verde localmente y en CI.

## Bloque B · Dominio (funciones puras + tests)

- [ ] **T3 · `features/barcode/gtin.ts`**: `isValidGtin`, `expandUpcE`, `normalizeGtin`. _(R1.2, R1.5, R5.2, R7.3)_
  ✔ Tests: EAN-13/EAN-8/UPC-A válidos e inválidos, las 4 reglas de UPC-E, UPC-A y EAN-13 equivalentes dan el mismo GTIN, letras y largos inválidos.
- [ ] **T4 · OFF por código**: extraer `fetchOff()` y `readNutriments()` de `openFoodFacts.ts`; agregar `fetchOffProduct(gtin)` y `parseOffProduct(json, gtin)` con porción. _(R3.2, R3.3, R4.1, R6.2, R7.3)_
  ✔ Tests con JSON de ejemplo: found, incompleto, `status: 0`, HTTP 404 → not_found, 429/5xx/tiempo agotado → `OffError`, porción en g / ml / fuera de rango. Los tests existentes de búsqueda siguen en verde.
- [ ] **T5 · `FoodRef.servingGrams`** opcional + validación en `parseFoodParam` (1–1000). _(R3.3)_
  ✔ Tests de ida y vuelta e inválidos.
- [ ] **T6 · `features/barcode/lookup.ts`**: `lookupBarcode(gtin, deps)` (propio → OFF). _(R3.1, R6.1)_
  ✔ Tests con dependencias simuladas: propio encontrado no llama a OFF; error de Supabase sigue con OFF; 404 → not_found; error de red se propaga.
- [ ] **T7 · `features/barcode/scanReducer.ts`**: estados y transiciones de la §6.1 del diseño. _(R1.3, R2, R3.4, R5, R6.1, R7.2)_
  ✔ Tests de cada transición, incluidos "ignora segundo código en `looking_up`" y "web inicia en `manual`".

## Bloque C · Datos y dependencias

- [ ] **T8 · Dependencias**: `expo-camera` ~57.0.5, `expo-haptics` ~57.0.3; plugin `expo-camera` en `app.json` con el texto del permiso. _(R2.1, R7.1)_
  ✔ `expo export` para iOS y Android compila.
- [ ] **T9 · API y hooks**: `findOwnFoodByBarcode`, `createCustomFood` con `barcode` (si hay duplicado, usa el existente), `useBarcodeLookup` (caché de sesión) e invalidación al crear. _(R3.1, R3.5, R4.2, R4.3)_
  ✔ Tests de mapeo y del manejo del duplicado (`23505`).

## Bloque D · Pantallas

- [ ] **T10 · Botón "Escanear código"** en Buscar → `/scan?date&meal`. _(R1.1)_
  ✔ Prueba web: el botón navega al escáner conservando el día y la comida.
- [ ] **T11 · Pantalla Escáner** (`scan.tsx`): permiso, cámara con marco y linterna, vibración, búsqueda, estados `missing` y `error` con sus acciones, ingreso manual; solo manual en web. _(R1–R7)_
  ✔ Prueba web de extremo a extremo con OFF simulado: código manual válido → Registrar; inválido → error en línea; 404 → "Crear alimento"; 503 → Reintentar.
- [ ] **T12 · Nuevo alimento precargado** desde el escáner (código, nombre, marca, valores disponibles) y guardado con `barcode`. _(R4.1, R4.2)_
  ✔ Prueba web: crear desde `missing` → Registrar; volver a buscar el mismo código encuentra el alimento propio.
- [ ] **T13 · Porción en Registrar**: botón "1 porción · N g" en `LogForm`. _(R3.3)_
  ✔ Test de componente: el botón aparece solo con `servingGrams` y pone ese valor en gramos.

## Bloque E · Cierre

- [ ] **T14 · Verificación en dispositivos**: checklist manual en **Android e iOS** con Expo Go. _(R1, R2, R4, R6, R7.1)_
  ✔ Checklist marcado (sección siguiente). **Lo hace el usuario.**
- [ ] **T15 · Documentación**: README (escaneo y migración nueva), spec → Implementado, PLAN.

---

## Checklist manual (T14)
| # | Paso | Android | iOS |
|---|---|---|---|
| B1 | Primer uso: explicación → permitir cámara | ☐ | ☐ |
| B2 | Escanear un producto real (EAN-13) → Registrar con datos correctos | ☐ | ☐ |
| B3 | Escanear un producto de EE. UU. (UPC-A) | ☐ | ☐ |
| B4 | Linterna en un lugar oscuro | ☐ | ☐ |
| B5 | Producto con porción → botón "1 porción" | ☐ | ☐ |
| B6 | Producto inexistente → Crear alimento → volver a escanear lo encuentra | ☐ | ☐ |
| B7 | Negar permiso → Abrir ajustes / Ingresar a mano | ☐ | ☐ |
| B8 | Modo avión al escanear → error con Reintentar | ☐ | ☐ |
| B9 | Mismo código dos veces seguidas: un solo registro de lectura | ☐ | ☐ |

## Trazabilidad requisitos → tareas
| Req. | Tareas |
|---|---|
| R1 · Escanear | T3, T7, T8, T10, T11, T14 |
| R2 · Permiso | T7, T8, T11, T14 |
| R3 · Buscar | T4, T5, T6, T9, T11, T13 |
| R4 · No encontrado | T1, T2, T4, T9, T12 |
| R5 · Manual | T3, T7, T11 |
| R6 · Errores | T4, T6, T7, T11 |
| R7 · Calidad | T2–T8, T11, T14 |

## Riesgos de implementación
- **Sin cámara ni teléfonos en el entorno de Claude:** la lectura real se prueba solo en T14. Claude prueba el resto de la lógica (validación, búsqueda, estados) con tests y con la versión web vía ingreso manual.
- **Open Food Facts no accesible desde el entorno de Claude:** se usan respuestas de ejemplo con la estructura documentada de la API v2.
