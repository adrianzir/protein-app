# Prototipo · Foto con IA

**Objetivo:** medir con platos reales cuánto se equivoca Claude al estimar alimentos, porciones y macros desde una foto, y cuánto cuesta, **antes** de escribir la spec de la Fase 3 (ver [PLAN.md](../../PLAN.md) §3 y §9).

No es código de la app: es un script de Node aislado (su propio `package.json`), que la app no importa. Las fotos y los resultados no se suben al repositorio.

## Qué hace
1. Reduce cada foto a ≤ 1024 px en JPEG, igual que hará la app.
2. La envía a la API de Claude con un prompt fijo ([src/prompt.ts](src/prompt.ts)) y pide **JSON estructurado** ([src/schema.ts](src/schema.ts)): por alimento, nombre, gramos (con rango), confianza y valores por 100 g.
3. Compara los totales del plato con lo pesado en la balanza (`dataset/truth.csv`) y genera un informe con error, sesgo, costo y tiempo.

> En el prototipo, los valores por 100 g los estima el mismo modelo. En la Fase 3 se cruzarán con el catálogo, USDA y Open Food Facts; el informe permite ver qué parte del error viene de los **gramos** y qué parte de los **macros**.

## 1. Armar el dataset (20–30 platos)
- Comidas reales y variadas: platos de la región, comida rápida, ensaladas, guisos, desayunos y algún envase.
- **Pesa cada componente** con una balanza de cocina antes de servir (o el plato completo, si es un guiso).
- Una foto por plato, desde arriba o en 45°, con buena luz y el plato completo. Agrega 2–3 fotos que no sean comida para verificar que las rechaza.
- Copia las fotos a `dataset/` y completa `dataset/truth.csv` (ver [truth.example.csv](dataset/truth.example.csv)):

| Columna | Obligatoria | Ejemplo |
|---|---|---|
| `photo` | Sí | `plato01.jpg` |
| `item` | Sí | `Arroz blanco cocido` |
| `grams` | Sí | `180` |
| `kcal`, `protein_g`, `carbs_g`, `fat_g` | No (si faltan, solo se mide el peso) | `234`, `4.9`, `50.4`, `0.5` |

Los macros reales se calculan con la etiqueta del envase o con el catálogo de la app.

## 2. Ejecutar
```bash
cd prototypes/photo-ai
npm install
export ANTHROPIC_API_KEY=sk-ant-...      # clave de https://platform.claude.com
npm run analyze                          # todas las fotos de dataset/
npm run analyze -- --limit 3             # prueba rápida
npm run analyze -- --effort low          # comparar esfuerzo (low | medium | high | xhigh | max)
npm run analyze -- --model claude-sonnet-5-5   # comparar modelos
npm run report -- results/run-XXXX.json  # rehacer el informe tras corregir truth.csv
```
Cada corrida guarda `results/run-<fecha>.json` (respuestas completas) y `.md` (informe).

**Costo esperado:** entre US$ 0,01 y 0,05 por foto con `claude-opus-5-5` y esfuerzo `medium` (el razonamiento del modelo cuenta como salida); 30 fotos cuestan alrededor de US$ 1. El informe muestra el costo real.

## 3. Criterios para decidir (propuesta)
| Métrica | Meta para seguir con la Fase 3 |
|---|---|
| Calorías por plato: error mediano | ≤ 25 % |
| Proteína por plato: error mediano | ≤ 30 % |
| Platos con calorías dentro de ±30 % | ≥ 70 % |
| Identificación (revisión manual) | Sin omitir el componente principal en ≥ 90 % de los platos |
| Fotos que no son comida | Todas rechazadas |
| Costo por foto | ≤ US$ 0,03 |
| Tiempo por foto (p90) | ≤ 15 s |

Si no se cumplen, se prueba primero otro esfuerzo o modelo y luego cambios al prompt (subiendo `PROMPT_VERSION`), antes de descartar el enfoque.

## Comandos de desarrollo
```bash
npm run typecheck
npm test          # métricas y preparación de imagen (no llama a la API)
```
