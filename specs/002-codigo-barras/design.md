# Spec 002 · Código de barras — Diseño

**Estado:** Borrador
**Requisitos:** [requirements.md](requirements.md) (aprobado)
**Se apoya en:** [diseño de la Spec 001](../001-diario-manual/design.md) (capa de datos, `FoodRef`, pantallas Registrar y Nuevo alimento)

---

## 1. Arquitectura

```
Buscar ──[Escanear código]──▶ Escáner (modal)
                                 │  cámara (Android/iOS) · ingreso manual (siempre; único en web)
                                 ▼
                     código leído/escrito
                                 │  validar dígito verificador + normalizar (GTIN)
                                 ▼
                     useBarcodeLookup(gtin)
                     ├─ 1. alimentos propios (Supabase, foods.barcode)
                     └─ 2. Open Food Facts /api/v2/product/{gtin}
                                 │
         ┌───────────────────────┼─────────────────────────┐
     encontrado              incompleto / no existe       error de red
         │                         │                          │
   Registrar (Spec 001)     Nuevo alimento precargado    Reintentar · Manual ·
   + porción del envase     (con código) → Registrar     Buscar por nombre
```

**Principios**
- Se reutiliza todo el flujo de la Spec 001: `FoodRef`, `LogForm`, Registrar y Nuevo alimento. El escáner solo resuelve **código → alimento**.
- La lógica de códigos (validación, normalización, lectura de OFF) son **funciones puras con tests**. La pantalla del escáner es una máquina de estados simple (`scanReducer`), también testeada.

### Dependencias nuevas
Ambas vienen incluidas en Expo Go (R7.1) y se instalan con las versiones de `bundledNativeModules.json`.

| Paquete | Versión SDK 57 | Uso |
|---|---|---|
| `expo-camera` | ~57.0.5 | `CameraView` con `barcodeScannerSettings`, `useCameraPermissions`, `enableTorch` |
| `expo-haptics` | ~57.0.3 | Vibración breve al leer un código (R1.3) |

`app.json`: plugin `expo-camera` con `cameraPermission: "Usamos la cámara solo para leer códigos de barras de los envases."`. Expo Go usa su propio texto; esto aplica a los builds de la Fase 5.

---

## 2. Códigos de barras (funciones puras)

Archivo `src/features/barcode/gtin.ts`:

| Función | Qué hace | Requisitos |
|---|---|---|
| `isValidGtin(code)` | Solo dígitos, largo 8/12/13 y dígito verificador GS1 (módulo 10, pesos 3-1 desde la derecha) | R1.5, R5.2 |
| `expandUpcE(code)` | UPC-E (8 dígitos) → UPC-A (12), según las reglas de expansión GS1 | R1.2 |
| `normalizeGtin(code, type?)` | Devuelve el **GTIN canónico**: UPC-A → EAN-13 (con `0` delante); UPC-E → expandido → EAN-13; EAN-8 y EAN-13 sin cambios. `null` si no es válido | R1.2, R4.3 |

**Por qué normalizar:** el mismo producto puede leerse como UPC-A (12 dígitos) o como EAN-13 con un `0` delante, según el teléfono. Guardando y buscando siempre el GTIN canónico, un alimento propio se encuentra igual (R3.1, R4.3).

**Tipos aceptados por la cámara:** `['ean13', 'ean8', 'upc_a', 'upc_e']` (sin QR, R1.2).

---

## 3. Open Food Facts por código

Archivo `src/features/foods/openFoodFacts.ts` (se amplía el existente):

- **Endpoint:** `GET https://world.openfoodfacts.org/api/v2/product/{gtin}.json?fields=code,product_name,product_name_es,brands,nutriments,serving_quantity,serving_quantity_unit,serving_size`
- Mismo `User-Agent`, tiempo máximo de 8 s y cancelación que la búsqueda (R6.2). La lógica común se extrae a `fetchOff()`.
- **Respuestas:**
  - HTTP 404 o `status: 0` → **no encontrado** (no es un error de red).
  - 429 o 5xx, tiempo agotado o sin red → `OffError` (R6.1).
- **`parseOffProduct(json, gtin)`** devuelve uno de estos resultados:

| Resultado | Cuándo | Contenido |
|---|---|---|
| `{ kind: 'found', food, servingGrams? }` | Tiene nombre y los 4 valores por 100 g válidos | `FoodRef` de origen `off` con `externalId = gtin` |
| `{ kind: 'incomplete', partial }` | Existe, pero falta algún valor o es inválido | Nombre, marca y los valores disponibles, para precargar el formulario (R4.1) |
| `{ kind: 'not_found' }` | No existe | — |

- **Porción (R3.3):** se usa `serving_quantity` si `serving_quantity_unit` es `g` (o falta y `serving_size` termina en "g"). Debe estar entre 1 y 1000 g; si no, se ignora. No se convierten mililitros.
- La lectura de `nutriments` se comparte con `parseOffProducts` mediante una función `readNutriments()`, para no duplicar reglas.

---

## 4. Modelo de datos

Migración `…_food_barcode.sql`:

```sql
alter table public.foods add column barcode text
  check (barcode ~ '^[0-9]{8}$|^[0-9]{13}$');          -- GTIN canónico (EAN-8 o EAN-13)

alter table public.foods add constraint foods_barcode_only_custom
  check (barcode is null or source = 'custom');

create unique index foods_owner_barcode
  on public.foods (owner_id, barcode) where barcode is not null;   -- R4.3
```

- Las políticas RLS no cambian: cada usuario solo ve y crea sus propios alimentos, así que **los códigos de un usuario no son visibles para otros**.
- `createCustomFood` recibe un `barcode` opcional. Si el insert falla por duplicado (`23505`), se busca y se usa el alimento existente (R4.3).
- `findOwnFoodByBarcode(gtin)` busca con `select … where barcode = gtin limit 1`. RLS limita la búsqueda al usuario.

---

## 5. Capa de datos (hooks)

| Hook | Query key | Comportamiento |
|---|---|---|
| `useBarcodeLookup(gtin)` | `['barcode', gtin]` | 1) alimento propio; 2) si no hay, OFF. `staleTime: Infinity` y `gcTime` de 30 min: un código ya resuelto no se vuelve a consultar en la sesión (R3.5). `retry: false`. `enabled` solo con un GTIN válido |
| `useCreateFood()` | — | Se amplía con `barcode` opcional. Al guardar, además de invalidar la búsqueda local, invalida `['barcode', gtin]` |

La función de orquestación `lookupBarcode(gtin, deps)` es pura respecto de sus dependencias (`findOwn`, `fetchOff`). Se testea con dependencias simuladas.

---

## 6. Pantallas y navegación

```
src/app/(app)/
  food-search.tsx     + botón "Escanear código" (ícono barcode-outline) → /scan?date&meal   (R1.1, Q1)
  scan.tsx            NUEVA · modal · ?date&meal
  food-new.tsx        + params opcionales: barcode, name, brand, kcal, protein, carbs, fat (precarga, R4.1)
  log/new.tsx         + el FoodRef puede traer servingGrams → botón "1 porción · N g" (R3.3)
```

### 6.1 Escáner: máquina de estados (`scanReducer`)

```
permission ──(concedido)──▶ scanning ──(código válido)──▶ looking_up ──▶ found ──▶ (navega a Registrar)
    │                          │  ▲                          │
    │ (negado)                 │  └──── (volver a escanear) ─┤──▶ missing (no existe / incompleto)
    ▼                          ▼                             └──▶ error (red)
 denied ─────────────────▶ manual ◀──────(Ingresar a mano)──────────────┘
```

| Estado | UI | Requisitos |
|---|---|---|
| `permission` | Explicación de por qué se usa la cámara + botón "Permitir cámara" | R2.1 |
| `denied` | Mensaje + "Abrir ajustes" (`Linking.openSettings()`) + "Ingresar código a mano" | R2.2 |
| `scanning` | `CameraView` a pantalla completa, marco guía, botón linterna (`enableTorch`), "Ingresar a mano" | R1.2, R1.4 |
| `looking_up` | Indicador "Buscando 7802…" + "Cancelar" (vuelve a `scanning`) | R3.4 |
| `missing` | "No encontramos este producto" o "Faltan datos nutricionales" + **Crear alimento** (→ `food-new` precargado) + **Volver a escanear** | R4.1 |
| `error` | Mensaje + **Reintentar** · **Ingresar a mano** · **Buscar por nombre** (vuelve a Buscar). El código se conserva | R6.1 |
| `manual` | `NumberField` de código con validación en línea + "Buscar" | R5 |

- **Una sola lectura (R1.3):** `onBarcodeScanned` se pasa como `undefined` fuera del estado `scanning`, y además un `ref` ignora eventos repetidos del mismo frame. Al leer un código válido: `Haptics.notificationAsync(Success)`.
- **Códigos inválidos (R1.5):** se ignoran sin cambiar de estado.
- **Web (R7.2):** el estado inicial es `manual` y no se monta `CameraView`.
- **Found:** `router.replace('/log/new', { date, meal, food })`. El escáner se reemplaza para que "volver" lleve a Buscar.

### 6.2 Registrar con porción (R3.3)
- `FoodRef` suma un campo opcional `servingGrams?: number`, validado en `parseFoodParam` (1–1000).
- `LogForm` muestra un `ChipGroup` de una opción, "1 porción · 30 g", que al tocarlo pone 30 en el campo de gramos. El valor inicial sigue siendo 100.

---

## 7. Manejo de errores

| Situación | Comportamiento |
|---|---|
| Lectura con dígito verificador inválido | Se ignora; sigue escaneando (R1.5) |
| Código manual inválido | Error bajo el campo; botón Buscar desactivado (R5.2) |
| OFF 404 / `status: 0` | Estado `missing` (no existe) |
| Producto sin los 4 valores | Estado `missing` (incompleto), con precarga de lo disponible |
| OFF 429 / 5xx / sin red / tiempo agotado | Estado `error` con 3 acciones (R6.1) |
| Error de Supabase al buscar alimento propio | Se sigue con OFF (no bloquea); se registra en consola |
| Crear alimento con código ya usado por el usuario | Se usa el existente (R4.3) |
| Permiso de cámara negado para siempre | `denied` con "Abrir ajustes" (R2.2) |

---

## 8. Estrategia de pruebas

| Nivel | Qué | Requisitos |
|---|---|---|
| Unitario | `isValidGtin` (EAN-13, EAN-8 y UPC-A válidos e inválidos, letras, largos), `expandUpcE` (casos de las 4 reglas), `normalizeGtin` (UPC-A ↔ EAN-13 dan el mismo resultado) | R1.2, R1.5, R5.2, R7.3 |
| Unitario | `parseOffProduct`: found, incompleto, `status: 0`, porción en g, porción en ml (ignorada), porción fuera de rango | R3.2, R3.3, R4.1, R7.3 |
| Unitario | `lookupBarcode`: propio primero, OFF solo si no hay propio, 404 → not_found, error de Supabase → sigue con OFF | R3.1, R6.1 |
| Unitario | `scanReducer`: transiciones de la §6.1, incluido ignorar un segundo código en `looking_up` | R1.3, R3.4 |
| Unitario | `parseFoodParam` con `servingGrams` válido e inválido | R3.3 |
| Base de datos | `tests/db/barcode_test.sql`: formato del código, solo `custom`, único por usuario, dos usuarios pueden tener el mismo código, B no encuentra el código de A | R4.2, R4.3 |
| Componente | `LogForm` muestra el botón de porción y lo aplica | R3.3 |
| Manual | Checklist en **Android e iOS** con Expo Go: escanear productos reales (EAN-13 y UPC-A), linterna, permiso negado → ajustes, producto inexistente → crear → volver a escanear lo encuentra, modo avión | R1, R2, R4, R6, R7.1 |

---

## 9. Riesgos y decisiones

| # | Tema | Decisión |
|---|---|---|
| D1 | ¿Códigos en el catálogo base? | **No**: el catálogo es genérico (sin marca); solo los alimentos propios tienen código |
| D2 | Formato guardado | **GTIN canónico** (EAN-13 o EAN-8), para que UPC-A y EAN-13 coincidan |
| D3 | Productos de OFF en la base | No se guardan (Q3); solo caché de sesión |
| D4 | OFF responde 404 para "no existe" | Se trata como `missing`, no como error de red |
| D5 | Lecturas falsas en mala luz | Se filtran con el dígito verificador y con un solo procesamiento por lectura |
| D6 | Límite de uso de OFF | Una consulta por código y por sesión (caché); las lecturas inválidas no consultan |
