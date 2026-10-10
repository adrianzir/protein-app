# Spec 004 · Historial, favoritos y recientes — Tareas

**Estado:** Aprobado (2026-10-10)
**Requisitos:** [requirements.md](requirements.md) · **Diseño:** [design.md](design.md)

**Convenciones** (iguales a las Specs 001 y 002)
- `[ ]` pendiente · `[x]` hecha. Se implementa **en orden**, una tarea por commit (o pocas relacionadas).
- Cada tarea indica los requisitos que cubre (`R#.#`) y su **verificación** (✔).
- Antes de marcar una tarea: `npm run lint && npm run typecheck && npm test` (y `npm run test:db` si toca SQL) en verde.

---

## Bloque A · Base de datos

- [x] **T1 · Migración `favorite_foods`**: tabla con copia del alimento, `unique (user_id, food_key)`, `food_id` con borrado en cascada, RLS de select/insert/delete propios. _(R2.4, R2.6)_
  ✔ Se aplica sobre las migraciones existentes en Postgres 16 local.
- [x] **T2 · Test SQL `tests/db/favorites_test.sql`**: B no ve ni borra favoritos de A; el mismo alimento dos veces para un usuario se rechaza; dos usuarios pueden tener el mismo favorito; borrar un alimento propio borra su favorito; valores fuera de rango se rechazan. _(R2.6, R6.3)_
  ✔ `npm run test:db` en verde localmente y en CI.

## Bloque B · Dominio (funciones puras + tests)

- [x] **T3 · `features/foods/key.ts`**: `foodKey(ref)` para catálogo, propio, Open Food Facts y alimento sin id. _(R1.4, R2.5)_
  ✔ Tests de cada fuente; el mismo alimento desde un registro y desde la búsqueda da la misma clave.
- [x] **T4 · `features/foods/recents.ts`**: `pickRecents` y `lastGramsFor`. _(R1.1–R1.5, R2.3)_
  ✔ Tests: deduplica por clave quedándose con el más reciente, respeta el límite de 20, conserva gramos y valores del último registro, lista vacía.
- [x] **T5 · `parseGramsParam`** en `features/diary/params.ts`. _(R1.3, R2.3)_
  ✔ Tests: válido, vacío, texto, 0, > 5000 → 100 g.
- [x] **T6 · `features/progress/stats.ts`**: `periodDays`, `shiftPeriod`, `dailyTotals`, `periodSummary`, `chartScale`. _(R4.2, R4.5, R4.6, R5.1, R5.3)_
  ✔ Tests: cambio de mes y de año, no pasar de hoy, días vacíos = `null`, totales iguales a `sumMacros`, ±10 % en el borde, sin meta, sin registros, escala que incluye la meta.

## Bloque C · Datos y dependencias

- [ ] **T7 · API y hooks de favoritos y recientes**: `useFavorites`, `useToggleFavorite` (23505 = éxito), `useRecentFoods`. _(R1.1, R2.1, R2.6)_
  ✔ Tests de mapeo de filas ↔ `FoodRef` y del manejo de 23505.
- [ ] **T8 · Totales por rango y copia de registros**: `useRangeTotals(from, to)` (una consulta) y `useCopyEntries` (un solo `insert`). _(R3.3, R5.2)_
  ✔ Tests de la construcción de filas copiadas (mismo alimento, gramos y valores; nuevo día y comida).
- [ ] **T9 · Invalidación por prefijo `['logs']`** en todas las mutaciones del diario. _(R5.4)_
  ✔ Test de hook: tras agregar un registro se invalidan el día, recientes y rangos.
- [ ] **T10 · Dependencia `react-native-svg`** con `npx expo install`. _(R6.1)_
  ✔ `npx expo-doctor` sin problemas y `expo export` para Android e iOS compila.

## Bloque D · Componentes

- [ ] **T11 · `FoodRow`** con `subtitle` y estrella de favorito. _(R1.2, R2.5)_
  ✔ Test de componente: muestra subtítulo y estrella solo cuando corresponde.
- [ ] **T12 · `MealSection`** con "Repetir de ayer (N)" cuando está vacía. _(R3.1)_
  ✔ Test de componente: aparece solo con comida vacía y `repeatCount > 0`; llama a `onRepeat`.
- [ ] **T13 · `BarChart`** (SVG): barras, días vacíos, línea de meta, marcas del eje, barras accesibles y resumen en texto. _(R4.3, R4.6, R4.7, R6.4)_
  ✔ Test de componente: cantidad de barras, sin línea cuando no hay meta, `accessibilityLabel` del gráfico y de cada barra, toque en una barra.

## Bloque E · Pantallas

- [ ] **T14 · Buscar**: secciones Favoritos y Recientes con la consulta vacía; estrella en resultados; Registrar con gramos iniciales. _(R1, R2.2, R2.3, R2.5)_
  ✔ Prueba web: elegir un reciente abre Registrar con los gramos de la última vez.
- [ ] **T15 · Estrella en Registrar y Editar registro**. _(R2.1)_
  ✔ Prueba web: marcar → aparece en Favoritos de Buscar; desmarcar → desaparece.
- [ ] **T16 · Hoy: Repetir de ayer** con confirmación (lista y total de kcal). _(R3)_
  ✔ Prueba web: copia los registros de ayer a la comida vacía; cancelar no copia nada.
- [ ] **T17 · Pestaña Progreso**: período 7/30 días con navegación, métrica, gráfico, resumen, sin meta y sin registros; toque en un día abre Hoy. _(R4, R5.3)_
  ✔ Prueba web: los totales de un día en Progreso coinciden con Hoy; ▶ desactivado en el período actual; tocar un día abre Hoy en esa fecha.

## Bloque F · Cierre

- [ ] **T18 · Prueba web de extremo a extremo** (Playwright, Supabase simulado) del recorrido completo de las tareas T14–T17. _(R1–R5)_
  ✔ Script en verde y capturas de pantalla.
- [ ] **T19 · Verificación en dispositivos**: checklist manual en **Android e iOS** con Expo Go. _(R6.1, R6.4)_
  ✔ Checklist marcado (sección siguiente). **Lo hace el usuario.**
- [ ] **T20 · Documentación**: README (favoritos, recientes, Progreso y migración nueva), spec → Implementado, PLAN.

---

## Checklist manual (T19)
| # | Paso | Android | iOS |
|---|---|---|---|
| H1 | Registrar un alimento, volver a Buscar: aparece en Recientes con sus gramos | ☐ | ☐ |
| H2 | Marcar un favorito en Registrar, verlo en Buscar y quitarlo desde Editar registro | ☐ | ☐ |
| H3 | Repetir de ayer en una comida vacía: confirmar y cancelar | ☐ | ☐ |
| H4 | Progreso: cambiar 7/30 días, retroceder un período, cambiar de métrica | ☐ | ☐ |
| H5 | Tocar un día en Progreso abre Hoy en esa fecha con los mismos totales | ☐ | ☐ |
| H6 | Progreso con perfil incompleto y en un período sin registros | ☐ | ☐ |
| H7 | Lector de pantalla (TalkBack / VoiceOver) en Progreso: lee el resumen y cada día | ☐ | ☐ |
| H8 | Cerrar sesión y entrar en otro teléfono: los favoritos se conservan | ☐ | ☐ |

## Trazabilidad requisitos → tareas
| Req. | Tareas |
|---|---|
| R1 · Recientes | T3, T4, T5, T7, T11, T14, T18 |
| R2 · Favoritos | T1, T2, T3, T7, T11, T14, T15, T18, T19 |
| R3 · Repetir comida | T8, T12, T16, T18 |
| R4 · Progreso | T6, T13, T17, T18, T19 |
| R5 · Datos y rendimiento | T6, T8, T9, T17 |
| R6 · Calidad | T2, T10, T13, T19 |

## Riesgos de implementación
- **Sin teléfonos en el entorno de Claude:** la legibilidad del gráfico y los lectores de pantalla se prueban solo en T19. Claude prueba la lógica con tests y la interfaz en la versión web.
- **`react-native-svg` en web:** funciona con `react-native-web`; si algún detalle difiere, se ajusta para que la prueba web sea representativa.
