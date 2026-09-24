# Protein App

App móvil (iOS/Android) para registrar comidas y calcular calorías, proteína, carbohidratos y grasas, con reconocimiento por foto. Plan completo en [PLAN.md](PLAN.md).

## Stack
- **Expo SDK 57** + React Native + TypeScript + Expo Router (`src/app/`)
- **Supabase**: Auth, Postgres (migraciones en `supabase/migrations/`)
- **Calidad**: ESLint, `tsc`, Jest; CI en GitHub Actions

## Puesta en marcha
1. Instala dependencias: `npm install`
2. Crea un proyecto en [supabase.com](https://supabase.com) y copia `.env.example` a `.env.local` con la URL y la anon key.
3. Aplica la base de datos:
   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```
4. Inicia la app: `npm start` y escanea el QR con **Expo Go**.

## Scripts
| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos |
| `npm test` | Tests unitarios |
| `npm run test:db` | Migraciones + tests SQL (RLS, catálogo) sobre Postgres 16; requiere `DATABASE_URL` |

## Estructura
```
src/
  app/            # pantallas (Expo Router)
    (auth)/       # login / registro (sin sesión)
    (app)/        # pantallas privadas (con sesión)
  lib/            # cliente Supabase, env, utilidades
  providers/      # AuthProvider (sesión)
supabase/         # config y migraciones SQL
```
