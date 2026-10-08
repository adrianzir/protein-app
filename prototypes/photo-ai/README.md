# Prototipo · Foto con IA

**Objetivo:** medir con platos reales cuánto se equivoca un modelo de IA al estimar alimentos, porciones y macros desde una foto, y cuánto cuesta, **antes** de escribir la spec de la Fase 3 (ver [PLAN.md](../../PLAN.md) §3 y §9). Se comparan proveedores **gratuitos** (preferidos para el piloto) con uno de pago como referencia.

No es código de la app: es un script de Node aislado (su propio `package.json`), que la app no importa. Las fotos y los resultados no se suben al repositorio.

## Qué hace
1. Reduce cada foto a ≤ 1024 px en JPEG, igual que hará la app.
2. La envía al proveedor elegido con el mismo prompt ([src/prompt.ts](src/prompt.ts)) y pide **JSON estructurado** ([src/schema.ts](src/schema.ts)): por alimento, nombre, gramos (con rango), confianza y valores por 100 g. La respuesta se valida igual para todos.
3. Compara los totales del plato con lo pesado en la balanza (`dataset/truth.csv`) y genera un informe con error, sesgo, costo, tokens y tiempo.

> En el prototipo, los valores por 100 g los estima el mismo modelo. En la Fase 3 se cruzarán con el catálogo, USDA y Open Food Facts; el informe permite ver qué parte del error viene de los **gramos** y qué parte de los **macros**.

## Proveedores
| `--provider` | Costo | Clave (variable de entorno) | Modelo por defecto |
|---|---|---|---|
| `gemini` (por defecto) | Plan gratuito con límite diario | `GEMINI_API_KEY` · [Google AI Studio](https://aistudio.google.com/apikey) | `gemini-2.5-flash` |
| `groq` | Plan gratuito con límite por minuto y por día | `GROQ_API_KEY` · [console.groq.com](https://console.groq.com/keys) | `meta-llama/llama-4-scout-17b-16e-instruct` |
| `openrouter` | Modelos con sufijo `:free`, con límite diario | `OPENROUTER_API_KEY` · [openrouter.ai](https://openrouter.ai/settings/keys) | `google/gemma-3-27b-it:free` |
| `ollama` | Gratis, en tu computador | — (requiere [Ollama](https://ollama.com) y `ollama pull qwen2.5vl:7b`) | `qwen2.5vl:7b` |
| `claude` | De pago (referencia) | `ANTHROPIC_API_KEY` | `claude-opus-5-5` |

- **Los modelos y límites gratuitos cambian seguido.** Si el modelo por defecto ya no existe, lista los disponibles con `--list-models` y elige uno que acepte imágenes con `--model`.
- **Privacidad:** en los planes gratuitos, el proveedor puede usar las fotos enviadas para mejorar sus modelos. Para el prototipo usa fotos sin personas; para el piloto habrá que informarlo en el consentimiento.
- Si un modelo responde error al pedir el esquema JSON, prueba con `--json object` (pide JSON libre y valida igual).

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
export GEMINI_API_KEY=...                         # o GROQ_API_KEY, OPENROUTER_API_KEY
npm run analyze -- --limit 3                      # prueba rápida con Gemini
npm run analyze                                   # todas las fotos con Gemini
npm run analyze -- --provider groq --delay 3000   # Groq, con pausa de 3 s entre fotos
npm run analyze -- --provider openrouter --model qwen/qwen2.5-vl-72b-instruct:free
npm run analyze -- --provider gemini --list-models
npm run report -- results/run-XXXX.json           # rehacer el informe tras corregir truth.csv
```
- Cada corrida guarda `results/run-<fecha>-<proveedor>.json` (respuestas completas) y `.md` (informe), para comparar proveedores lado a lado.
- Ante un límite de uso (HTTP 429) o una falla temporal, el script reintenta hasta 3 veces con espera creciente. Si los límites por minuto siguen cortando la corrida, sube `--delay`.
- Con `claude` se puede ajustar `--effort` (`low` a `max`); cada foto cuesta entre US$ 0,01 y 0,05.

## 3. Criterios para decidir (propuesta)
| Métrica | Meta para seguir con la Fase 3 |
|---|---|
| Calorías por plato: error mediano | ≤ 25 % |
| Proteína por plato: error mediano | ≤ 30 % |
| Platos con calorías dentro de ±30 % | ≥ 70 % |
| Identificación (revisión manual) | Sin omitir el componente principal en ≥ 90 % de los platos |
| Fotos que no son comida | Todas rechazadas |
| Respuestas válidas (sin error) | ≥ 95 % |
| Tiempo por foto (p90) | ≤ 15 s |
| Costo para el piloto | US$ 0 dentro de los límites del plan gratuito |

Si un proveedor gratuito cumple, se usa en el piloto; Claude queda como referencia de precisión. Si ninguno cumple, se prueba otro modelo o cambios al prompt (subiendo `PROMPT_VERSION`) antes de descartar el enfoque.

## Comandos de desarrollo
```bash
npm run typecheck
npm test          # métricas, lectura de respuestas, informe e imagen (no llama a ninguna API)
```
