# AGENTS.md

Guía para agentes de IA (Claude Code, Copilot, Cursor, etc.) que trabajen en este repositorio.

## Proyecto
**Protein App**: app móvil (Android + iOS) para registrar comidas y calcular calorías, proteína, carbohidratos y grasas, con reconocimiento por foto (Fase 3). Plan general en [PLAN.md](PLAN.md).

- **App:** Expo SDK 57 + React Native + TypeScript (strict) + Expo Router.
- **Backend:** Supabase (Auth, Postgres con RLS, Storage, Edge Functions).
- **Plataformas objetivo:** Android e iOS. Web solo se usa para pruebas rápidas.
- **Idioma:** la interfaz, las specs y la documentación van en español; el código (identificadores) en inglés.

## Flujo de trabajo: Spec-Driven Development (SDD)
Todo cambio funcional parte de una spec en `specs/NNN-nombre/`, en este orden:

| Paso | Archivo | Contenido | Puerta |
|---|---|---|---|
| 1 | `requirements.md` | Historias de usuario y criterios de aceptación en formato **EARS** (`CUANDO… EL SISTEMA DEBERÁ…`) | Aprobación del usuario |
| 2 | `design.md` | Arquitectura, modelo de datos, rutas, componentes, errores y estrategia de pruebas | Aprobación del usuario |
| 3 | `tasks.md` | Checklist de tareas pequeñas, cada una ligada a requisitos (`R1.2`) | Aprobación del usuario |
| 4 | Implementación | Una tarea a la vez, marcándola `[x]` en `tasks.md` al terminar | Revisión de código, chequeo de tipos y tests en verde |

Reglas:
- **No escribir código de producción sin spec aprobada.** Correcciones menores (typos, lint) no requieren spec.
- Si durante la implementación cambia algo del diseño, **actualiza primero la spec** y luego el código.
- Cada requisito debe quedar cubierto por al menos un test o una verificación manual descrita en `tasks.md`.
- Estado de una spec: encabezado `Estado: Borrador | Aprobado | Implementado`.

## Estructura
```
src/
  app/          # SOLO pantallas y layouts (Expo Router)
  features/     # lógica por dominio: api (Supabase), hooks, funciones puras + tests
  components/   # componentes UI reutilizables
  lib/          # infraestructura: cliente Supabase, env, utilidades
  providers/    # contextos React (auth, query client)
supabase/
  migrations/   # SQL versionado; nunca editar una migración ya aplicada, crear otra
specs/          # especificaciones SDD
```

## Convenciones
- Funciones de cálculo (macros, metas, fechas) **puras** y con tests unitarios junto al archivo (`*.test.ts`).
- Toda tabla nueva en Supabase lleva **RLS** activado y políticas por `auth.uid()`.
- Secretos (API keys de IA, USDA) **solo** en Edge Functions; en la app solo variables `EXPO_PUBLIC_*` públicas.
- Commits pequeños en inglés, en modo imperativo (`Add food search screen`).

## Expo cambió: no confíes en tu entrenamiento
Expo introduce cambios incompatibles en cada SDK. Antes de usar una API de Expo, EAS o React Native:
1. Revisa la versión mayor de `expo` en `package.json`.
2. Consulta la documentación de esa versión: `https://docs.expo.dev/versions/v<major>.0.0/`
3. Para lo demás, usa https://docs.expo.dev/llms.txt como índice.

Si no hay acceso a la red, revisa los tipos en `node_modules/<paquete>` y el mapa de versiones `node_modules/expo/bundledNativeModules.json`.

## Comandos
```bash
npx expo install <paquete>  # SIEMPRE en vez de npm install: elige versiones compatibles con el SDK
npm start                   # servidor de desarrollo (Expo Go)
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm test                    # Jest
npx expo-doctor             # diagnostica dependencias y config
```
**Antes de dar una tarea por terminada:** `npm run lint && npm run typecheck && npm test`.

## Navegación
- Solo **Expo Router**. Cada archivo en `src/app/` es una pantalla; `_layout.tsx` define navegadores.
- `(auth)` = pantallas sin sesión; `(app)` = pantallas con sesión (protegidas con `Stack.Protected`).
- Importa `Link`, `router` y `useLocalSearchParams` desde `expo-router`.

## Nativo y builds
- No existen `ios/` ni `android/` (se generan con Continuous Native Generation). Nunca crearlos ni editarlos a mano: configura en `app.json` y config plugins.
- Expo Go solo incluye sus módulos nativos. Si agregas una librería con código nativo, se necesita un development build (`npx eas-cli@latest build --profile development`).
- Build y publicación con EAS: `npx eas-cli@latest build|submit|update`.
