# Protein App

App móvil (iOS/Android) para registrar comidas y calcular calorías, proteína, carbohidratos y grasas, con reconocimiento por foto (Fase 3). Plan completo en [PLAN.md](PLAN.md).

**Estado:** Fases 1 (diario manual), 2 (código de barras) y 4 (historial, favoritos y recientes) implementadas; falta la verificación en dispositivos. Fase 3 (foto con IA): requisitos aprobados y [prototipo](prototypes/photo-ai/) para elegir el proveedor. Se trabaja con Spec-Driven Development: ver [AGENTS.md](AGENTS.md) y [`specs/`](specs/).

## Funcionalidades (Fase 1)
- Registro e inicio de sesión con correo.
- **Perfil** y **metas diarias** (Mifflin-St Jeor × actividad, ajustadas por objetivo) con vista previa en vivo.
- **Búsqueda de alimentos**: catálogo global de 99 alimentos con sinónimos regionales (palta/aguacate/avocado), alimentos propios y [Open Food Facts](https://world.openfoodfacts.org).
- **Registro por gramos** con cálculo de macros al instante; editar y eliminar.
- **Resumen "Hoy"**: calorías y macros vs. metas, por comida, navegando entre días.

## Funcionalidades (Fase 2)
- **Escanear el código de barras** de un envase (EAN-13, EAN-8, UPC-A, UPC-E) desde Buscar: busca primero en tus alimentos y luego en Open Food Facts.
- **Porción del envase** como acceso rápido al registrar ("1 porción · 30 g").
- **Producto no encontrado o incompleto**: se crea como alimento propio con el código, y el próximo escaneo lo encuentra.
- **Ingreso manual del código** (sin cámara, sin permiso o en web). Las imágenes de la cámara no se guardan ni se envían.

## Funcionalidades (Fase 4)
- **Recientes**: en Buscar, sin escribir, los alimentos de los últimos 30 días con los gramos de la última vez.
- **Favoritos**: estrella en Registrar y Editar registro; aparecen primero en Buscar y se guardan en la cuenta.
- **Repetir de ayer**: copia una comida del día anterior a una comida vacía, con confirmación.
- **Progreso**: pestaña con 7 o 30 días de calorías o macros frente a la meta actual, promedios y días dentro de la meta (±10 %); tocar un día abre ese día.

## Stack
- **Expo SDK 57** + React Native + TypeScript + Expo Router (`src/app/`)
- **Supabase**: Auth, Postgres (migraciones en `supabase/migrations/`)
- **Calidad**: ESLint, `tsc`, Jest; CI en GitHub Actions

## Puesta en marcha
1. Instala dependencias: `npm install`
2. Crea un proyecto en [supabase.com](https://supabase.com) y copia `.env.example` a `.env.local` con la URL y la anon key.
3. Aplica la base de datos (crea tablas, permisos RLS y el catálogo):
   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```
4. Inicia la app: `npm start` y escanea el QR con **Expo Go** (Android) o la cámara (iOS).

### Migraciones
| Archivo | Contenido |
|---|---|
| `20260923000000_profiles.sql` | Tabla `profiles` (datos y metas), creada automáticamente al registrarse |
| `20260924000000_diary.sql` | Tablas `foods` y `food_logs`, búsqueda sin tildes, totales calculados por la base y políticas RLS |
| `20260924000100_seed_catalog.sql` | Catálogo global de 99 alimentos (valores USDA por 100 g); se puede volver a aplicar para corregir valores |
| `20261007000000_food_barcode.sql` | Código de barras (GTIN) en alimentos propios, único por usuario (Spec 002) |
| `20261009000000_favorite_foods.sql` | Tabla `favorite_foods` (copia del alimento, única por usuario, RLS) (Spec 004) |

## Scripts
| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos |
| `npm test` | Tests unitarios |
| `npm run test:db` | Migraciones + tests SQL (RLS, catálogo, códigos, favoritos) sobre Postgres 16; requiere `DATABASE_URL` |

## Cómo probar
| Nivel | Cómo | Qué cubre |
|---|---|---|
| Unitario y componentes | `npm test` | Metas, macros, validaciones, fechas, Open Food Facts, recientes, estadísticas de Progreso, mapeos de datos, componentes (incluido el gráfico) |
| Base de datos | `DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db` | Permisos entre usuarios, catálogo de solo lectura, restricciones, sinónimos |
| CI | Automático en cada PR y en `main` | Revisión de código, chequeo de tipos, tests de la app y de la base de datos |
| Dispositivos | Checklists M1–M11 ([spec 001](specs/001-diario-manual/tasks.md)), B1–B9 ([spec 002](specs/002-codigo-barras/tasks.md)) y H1–H8 ([spec 004](specs/004-historial-favoritos/tasks.md)) | Flujo completo y escaneo real en Android e iOS con Expo Go y un proyecto Supabase real |

## Estructura
```
src/
  app/            # pantallas (Expo Router)
    (auth)/       # login / registro (sin sesión)
    (app)/        # pantallas privadas (con sesión)
      (tabs)/     # Hoy, Progreso y Perfil
      log/        # registrar y editar consumo
      scan.tsx    # escáner de códigos de barras
  features/       # lógica por dominio: profile, foods, diary, barcode, favorites, progress (api, hooks, cálculos + tests)
  components/     # componentes de UI reutilizables
  lib/            # cliente Supabase, env, fechas, formato, utilidades
  providers/      # AuthProvider (sesión) y QueryProvider (datos)
supabase/         # config y migraciones SQL
tests/db/         # tests SQL y stub de Supabase
specs/            # especificaciones SDD (requisitos, diseño, tareas)
prototypes/       # experimentos aislados (prototipo de foto con IA)
```
