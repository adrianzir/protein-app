# Spec 004 · Historial, favoritos y recientes — Requisitos

**Estado:** Borrador
**Fase del plan:** 4 (ver [PLAN.md](../../PLAN.md))
**Depende de:** [Spec 001 · Diario manual](../001-diario-manual/requirements.md) (registros, metas, búsqueda)
**Plataformas:** Android e iOS

## Contexto
Hoy cada registro parte de cero: hay que buscar el alimento aunque se coma lo mismo todos los días, y solo se ve un día a la vez. Esta fase acelera el registro de lo habitual (**recientes**, **favoritos** y **repetir una comida**) y muestra el **progreso** de la semana o del mes frente a la meta.

## Alcance
**Incluye:** alimentos recientes y favoritos en Buscar; repetir una comida de otro día; pantalla Progreso con tendencias de 7 y 30 días; promedios y cumplimiento de la meta.

**No incluye:** registro de peso corporal; historial de metas (se usa la meta actual); exportar datos; recetas o comidas guardadas con nombre; notificaciones o rachas; comparaciones entre usuarios.

## Glosario
- **Reciente:** alimento que el usuario registró en los últimos 30 días.
- **Favorito:** alimento que el usuario marcó con una estrella para encontrarlo rápido.
- **Día con registros:** día con al menos un registro en el diario.
- **Día dentro de la meta:** día con registros cuyas calorías están dentro de ±10 % de la meta de calorías.

---

## R1 · Alimentos recientes
**Historia:** Como usuario, quiero ver lo que como seguido para registrarlo sin escribir.

1. MIENTRAS el campo de búsqueda esté vacío, la pantalla Buscar DEBERÁ mostrar la sección **Recientes** con hasta 20 alimentos distintos registrados en los últimos 30 días, del más reciente al más antiguo.
2. Cada reciente DEBERÁ mostrar el nombre, la marca (si tiene) y la cantidad usada la última vez.
3. CUANDO el usuario elija un reciente, EL SISTEMA DEBERÁ abrir **Registrar** con ese alimento y, como cantidad inicial, los **gramos usados la última vez**.
4. Dos registros DEBERÁN considerarse el mismo alimento si vienen de la misma fuente y el mismo identificador (catálogo, alimento propio u Open Food Facts).
5. Los recientes DEBERÁN usar los valores por 100 g del registro más reciente de ese alimento.

## R2 · Favoritos
**Historia:** Como usuario, quiero marcar mis alimentos habituales para tenerlos siempre a mano.

1. EL SISTEMA DEBERÁ permitir marcar y desmarcar un alimento como **favorito** con un botón de estrella en **Registrar** y en **Editar registro**.
2. MIENTRAS el campo de búsqueda esté vacío, la pantalla Buscar DEBERÁ mostrar la sección **Favoritos** antes de Recientes, en orden alfabético.
3. CUANDO el usuario elija un favorito, EL SISTEMA DEBERÁ abrir **Registrar** con ese alimento y, como cantidad inicial, los gramos usados la última vez (o 100 g si nunca lo registró).
4. Un favorito DEBERÁ guardar una copia del nombre, la marca y los valores por 100 g, para funcionar aunque el alimento venga de Open Food Facts.
5. En los resultados de búsqueda, los alimentos favoritos DEBERÁN mostrarse con una estrella.
6. Los favoritos DEBERÁN guardarse en la cuenta del usuario (RLS por `auth.uid()`), de modo que se conserven al cambiar de dispositivo.

## R3 · Repetir una comida
**Historia:** Como usuario, quiero copiar lo que comí otro día para no registrarlo de nuevo.

1. CUANDO un tipo de comida esté vacío en el día que se ve, EL SISTEMA DEBERÁ ofrecer **"Repetir de ayer"** si ese tipo de comida tuvo registros el día anterior.
2. CUANDO el usuario toque "Repetir de ayer", EL SISTEMA DEBERÁ mostrar los alimentos y su total de kcal, y pedir confirmación antes de copiar.
3. CUANDO se confirme, EL SISTEMA DEBERÁ crear una copia de cada registro (mismo alimento, gramos y valores) en el día y tipo de comida actuales; se guardan todos o ninguno.
4. Los registros copiados DEBERÁN poder editarse y eliminarse como cualquier otro.

## R4 · Progreso
**Historia:** Como usuario, quiero ver cómo me ha ido en la semana o el mes frente a mi meta.

1. EL SISTEMA DEBERÁ ofrecer una pestaña **Progreso** entre Hoy y Perfil.
2. EL SISTEMA DEBERÁ permitir elegir el período: **7 días** (por defecto) o **30 días**, terminando hoy, y retroceder o avanzar por períodos completos sin pasar de hoy.
3. EL SISTEMA DEBERÁ mostrar un gráfico de barras con las **calorías de cada día** y una línea con la **meta de calorías**.
4. EL SISTEMA DEBERÁ permitir cambiar el gráfico a **proteína**, **carbohidratos** o **grasas**, con su meta respectiva.
5. EL SISTEMA DEBERÁ mostrar, para el período: promedio diario de calorías y de cada macro (solo días con registros), **días con registros** y **días dentro de la meta**.
6. Los días sin registros DEBERÁN verse vacíos en el gráfico y NO DEBERÁN contar en los promedios.
7. CUANDO el usuario toque un día del gráfico, EL SISTEMA DEBERÁ abrir **Hoy** en esa fecha.
8. SI el perfil está incompleto (sin meta), ENTONCES EL SISTEMA DEBERÁ mostrar los datos sin línea de meta y un aviso para completar el perfil.
9. SI el período no tiene registros, ENTONCES EL SISTEMA DEBERÁ mostrar un mensaje con acceso para registrar en Hoy.

## R5 · Datos y rendimiento
1. Las fechas DEBERÁN agruparse por el día local del usuario, igual que en el diario (Spec 001 R5.5).
2. EL SISTEMA DEBERÁ obtener los totales de un período de hasta 30 días en una sola consulta.
3. Los totales mostrados en Progreso DEBERÁN coincidir con los de Hoy para el mismo día.
4. CUANDO se agregue, edite o elimine un registro, EL SISTEMA DEBERÁ actualizar Recientes y Progreso.

## R6 · Calidad y plataformas
1. La función DEBERÁ funcionar en **Android e iOS con Expo Go**, sin build nativo propio.
2. Los cálculos de recientes, promedios y días dentro de la meta DEBERÁN ser funciones puras con tests automáticos.
3. Las políticas de acceso a favoritos DEBERÁN tener tests SQL (un usuario no ve ni modifica los favoritos de otro).
4. El gráfico DEBERÁ tener una alternativa accesible: un resumen en texto del período para lectores de pantalla.
5. Todo el texto de la interfaz DEBERÁ estar en español.

---

## Decisiones pendientes (propuestas)
| # | Pregunta | Propuesta |
|---|---|---|
| Q1 | Ubicación de Progreso | Nueva pestaña entre Hoy y Perfil |
| Q2 | Meta de referencia en el historial | La **meta actual** (no se guarda un historial de metas en F4) |
| Q3 | "Día dentro de la meta" | Calorías dentro de ±10 % de la meta |
| Q4 | Cantidad de recientes | Hasta 20, de los últimos 30 días |
| Q5 | Cantidad inicial desde recientes y favoritos | Los gramos usados la última vez (o 100 g) |
| Q6 | Repetir comida | Solo "de ayer" en F4; elegir cualquier día queda para después |
