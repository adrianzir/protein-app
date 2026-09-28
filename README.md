# Protein App

App móvil (iOS/Android) para registrar comidas y calcular calorías, proteína, carbohidratos y grasas, con reconocimiento por foto (Fase 3). Plan completo en [PLAN.md](PLAN.md).

**Estado:** Fase 1 (diario manual) implementada; falta la verificación en dispositivos. Se trabaja con Spec-Driven Development: ver [AGENTS.md](AGENTS.md) y [`specs/`](specs/).

## Funcionalidades (Fase 1)
- Registro e inicio de sesión con correo.
- **Perfil** y **metas diarias** (Mifflin-St Jeor × actividad, ajustadas por objetivo) con vista previa en vivo.
- **Búsqueda de alimentos**: catálogo global de 99 alimentos con sinónimos regionales (palta/aguacate/avocado), alimentos propios y [Open Food Facts](https://world.openfoodfacts.org).
- **Registro por gramos** con cálculo de macros al instante; editar y eliminar.
- **Resumen "Hoy"**: calorías y macros vs. metas, por comida, navegando entre días.

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

## Scripts
| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos |
| `npm test` | Tests unitarios |
| `npm run test:db` | Migraciones + tests SQL (RLS, catálogo) sobre Postgres 16; requiere `DATABASE_URL` |

## Cómo probar
| Nivel | Cómo | Qué cubre |
|---|---|---|
| Unitario y componentes | `npm test` | Metas, macros, validaciones, fechas, Open Food Facts, mapeos de datos, componentes |
| Base de datos | `DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db` | Permisos entre usuarios, catálogo de solo lectura, restricciones, sinónimos |
| CI | Automático en cada PR y en `main` | Revisión de código, chequeo de tipos, tests de la app y de la base de datos |
| Dispositivos | Checklist M1–M11 en [`specs/001-diario-manual/tasks.md`](specs/001-diario-manual/tasks.md) | Flujo completo en Android e iOS con Expo Go y un proyecto Supabase real |

## Estructura
```
src/
  app/            # pantallas (Expo Router)
    (auth)/       # login / registro (sin sesión)
    (app)/        # pantallas privadas (con sesión)
      (tabs)/     # Hoy y Perfil
      log/        # registrar y editar consumo
  features/       # lógica por dominio: profile, foods, diary (api, hooks, cálculos + tests)
  components/     # componentes de UI reutilizables
  lib/            # cliente Supabase, env, fechas, formato, utilidades
  providers/      # AuthProvider (sesión) y QueryProvider (datos)
supabase/         # config y migraciones SQL
tests/db/         # tests SQL y stub de Supabase
specs/            # especificaciones SDD (requisitos, diseño, tareas)
```
