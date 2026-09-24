# Plan: App móvil de macronutrientes con reconocimiento por foto

## 1. Objetivo (MVP)
Registrar comidas por **foto**, **búsqueda** o **código de barras**, y calcular calorías, proteína, carbohidratos y grasas del día frente a una meta personal.

## 2. Stack recomendado
| Capa | Opción | Motivo |
|---|---|---|
| App | **React Native + Expo** (TypeScript) | iOS + Android con un solo código |
| Backend | **Supabase** (Auth, Postgres, Storage, Edge Functions) | Rápido, barato, sin servidores propios |
| Reconocimiento de foto | **API de modelo con visión** (p. ej. Claude) vía Edge Function | Identifica platos y estima porciones sin entrenar modelos |
| Base nutricional | **USDA FoodData Central** + **Open Food Facts** (códigos de barras) | Gratuitas y amplias |
| Estado / datos | Zustand + TanStack Query | Simple |
| Gráficos | Victory Native | Anillos/barras de macros |

> La API key del modelo **nunca** va en la app: siempre pasa por el backend.

## 3. Flujo de reconocimiento por foto
1. Usuario toma foto → se comprime (≤1024px) y se sube a Storage.
2. Edge Function envía la imagen al modelo pidiendo **JSON estructurado**: `[{alimento, gramos_estimados, confianza}]`.
3. Cada alimento se cruza con USDA/Open Food Facts → macros por 100 g × gramos.
4. **Pantalla de confirmación**: el usuario corrige alimentos y porciones (clave para la precisión).
5. Se guarda en el diario.

Precisión esperada: identificación buena; **porciones ±20–30 %**. Por eso la edición manual es obligatoria.

## 4. Modelo de datos (mínimo)
- `profiles`: peso, altura, edad, sexo, actividad, objetivo, metas de macros.
- `foods`: nombre, fuente, kcal/prot/carb/grasa por 100 g.
- `meals`: user_id, fecha, tipo (desayuno/almuerzo/…), foto_url.
- `meal_items`: meal_id, food_id, gramos, macros calculados.

## 5. Cálculo de metas
- TMB: **Mifflin-St Jeor**. Gasto = TMB × factor de actividad. ± déficit/superávit según objetivo.
- Proteína: 1.6–2.2 g/kg · Grasa: 25–30 % kcal · Carbohidratos: el resto.

## 6. Fases
| Fase | Duración aprox. | Entregable |
|---|---|---|
| 0. Setup ✅ | 1 sem | Repo Expo, Supabase, auth, CI |
| 1. Diario manual ([spec](specs/001-diario-manual/)) | 2 sem | Perfil, metas, búsqueda de alimentos, registro, resumen diario |
| 2. Código de barras | 1 sem | Escaneo con Open Food Facts |
| 3. Foto con IA | 2–3 sem | Captura, análisis, pantalla de confirmación |
| 4. Historial y gráficos | 1–2 sem | Tendencias semanales, favoritos, comidas recientes |
| 5. Beta y publicación | 2 sem | TestFlight / Play interno, ajustes, stores |

## 7. Costos y riesgos
- **Costo por foto** de IA (centavos de USD): limitar análisis diarios en plan gratuito.
- **Privacidad**: fotos y datos de salud → política de privacidad, consentimiento, borrado de cuenta.
- **Alcance global** (inicio: LatAm, España y EE. UU.): catálogo con sinónimos regionales; inglés y unidades imperiales en fases siguientes.
- **Aviso legal**: no es consejo médico.

## 8. Metodología
Se trabaja con **Spec-Driven Development**: cada fase tiene su spec en `specs/` (requisitos → diseño → tareas) antes de implementar. Ver AGENTS.md.

## 9. Próximos pasos
1. Validar alcance del MVP.
2. Crear proyecto Expo + Supabase (Fase 0).
3. Prototipo rápido del análisis de foto para medir precisión con platos reales.
