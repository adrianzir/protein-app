# CLAUDE.md

@AGENTS.md

## Instrucciones específicas para Claude Code
- Responde en **español**, breve y concreto. Explica con más detalle (tablas, viñetas, código) solo si el usuario termina su mensaje con `.desarrolla`; si termina con `yn`, responde solo sí o no.
- Sigue el flujo **SDD** de AGENTS.md: detente y pide aprobación al terminar cada documento de la spec (requisitos, diseño, tareas) antes de implementar.
- Durante la implementación, marca las tareas en `specs/*/tasks.md` y ejecuta lint, typecheck y tests antes de cada commit.
- Trabaja en la rama indicada por la sesión; no hagas push a otras ramas ni abras PRs sin que el usuario lo pida.
