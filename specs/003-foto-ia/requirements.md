# Spec 003 · Foto con IA — Requisitos

**Estado:** Borrador
**Fase del plan:** 3 (ver [PLAN.md](../../PLAN.md) §3)
**Depende de:** [Spec 001 · Diario manual](../001-diario-manual/requirements.md) (búsqueda, registro, tipos de comida) y del [prototipo de foto](../../prototypes/photo-ai/) (elección del proveedor de IA)
**Plataformas:** Android e iOS (web: solo elegir una imagen guardada, para pruebas)

## Contexto
Registrar una comida con varios componentes (arroz, pollo, ensalada) obliga hoy a buscar y pesar cada uno. Con una foto, un modelo de IA con visión propone los alimentos, sus gramos y sus macros, y el usuario **solo corrige** antes de guardar. La precisión esperada en porciones es de ±20–30 %, por eso la confirmación es obligatoria.

El proveedor de IA se elige con el prototipo (preferencia: **Gemini en su plan gratuito** u otro servicio gratuito para el piloto). Estos requisitos no dependen del proveedor.

## Alcance
**Incluye:** tomar o elegir una foto; analizarla en el servidor; pantalla de confirmación para corregir alimentos y gramos; guardar todo como registros del diario; límite diario de análisis; consentimiento y privacidad; registro de las correcciones para medir la precisión del piloto.

**No incluye:** guardar las fotos o mostrarlas en el historial; analizar varias fotos de una misma comida; estimar porciones con sensores de profundidad o con un objeto de referencia; reconocer texto o etiquetas nutricionales; funcionamiento sin conexión; planes de pago.

## Glosario
- **Análisis:** una foto enviada al modelo de IA y su respuesta.
- **Propuesta:** lista de alimentos que devuelve el análisis, cada uno con nombre, gramos estimados (con un rango), confianza y valores por 100 g.
- **Confirmación:** pantalla donde el usuario revisa y corrige la propuesta antes de guardarla.
- **Proveedor de IA:** servicio externo que analiza la foto (por ejemplo Gemini). Su clave solo existe en el servidor.

---

## R1 · Tomar o elegir la foto
**Historia:** Como usuario, quiero fotografiar mi plato para registrarlo sin buscar cada alimento.

1. EL SISTEMA DEBERÁ ofrecer un botón **"Foto"** en la pantalla Buscar, junto a "Escanear código", que conserve el día y el tipo de comida elegidos.
2. CUANDO el usuario toque "Foto", EL SISTEMA DEBERÁ permitir **tomar una foto** con la cámara o **elegir una de la galería**.
3. CUANDO haya una foto, EL SISTEMA DEBERÁ mostrarla con las opciones **Analizar** y **Repetir**.
4. ANTES de enviarla, EL SISTEMA DEBERÁ reducir la foto a un máximo de 1024 px por lado y comprimirla en JPEG.
5. En web, EL SISTEMA DEBERÁ ofrecer solo elegir una imagen guardada.

## R2 · Consentimiento, permisos y privacidad
1. LA PRIMERA VEZ que el usuario use "Foto", EL SISTEMA DEBERÁ explicar que la foto se envía a un servicio de IA externo para analizarla, que **no se guarda** en la app y que la estimación puede tener errores; y DEBERÁ pedir que el usuario lo acepte antes de continuar.
2. SI el proveedor elegido puede usar las imágenes para mejorar sus modelos (planes gratuitos), ENTONCES la explicación de R2.1 DEBERÁ decirlo y recomendar no fotografiar personas ni documentos.
3. SI el usuario no acepta, ENTONCES EL SISTEMA DEBERÁ volver a Buscar sin enviar nada, y ofrecer la búsqueda y el código de barras.
4. El permiso de cámara DEBERÁ seguir las reglas de la Spec 002 (R2.1–R2.2): explicar antes de pedirlo y, si se niega, permitir elegir de la galería.
5. La foto NO DEBERÁ guardarse en el servidor ni en el proveedor más allá de lo que el proveedor necesite para responder; tras el análisis solo se conservan los datos de R7.
6. La clave del proveedor de IA DEBERÁ estar solo en el servidor (Edge Function), nunca en la app.

## R3 · Analizar la foto
1. CUANDO el usuario toque **Analizar**, EL SISTEMA DEBERÁ enviar la foto a una Edge Function autenticada, que la analiza con el proveedor y devuelve una propuesta validada.
2. MIENTRAS se analiza, EL SISTEMA DEBERÁ mostrar un indicador de progreso y permitir **cancelar**.
3. EL SISTEMA DEBERÁ limitar la espera de cada análisis a **30 segundos**.
4. CUANDO el análisis termine con al menos un alimento, EL SISTEMA DEBERÁ abrir la **confirmación** (R4).
5. SI el análisis indica que la foto no muestra comida, ENTONCES EL SISTEMA DEBERÁ informarlo y ofrecer **Repetir**, **Buscar por nombre** y **Escanear código**.

## R4 · Confirmar y corregir
**Historia:** Como usuario, quiero corregir lo que la IA propuso antes de guardarlo, porque las porciones son aproximadas.

1. La confirmación DEBERÁ mostrar la foto en miniatura, el día, el tipo de comida (editable) y cada alimento propuesto con su nombre, gramos y kcal y macros resultantes.
2. EL SISTEMA DEBERÁ permitir, por cada alimento: **cambiar los gramos** (mostrando el rango estimado como referencia), **reemplazar el alimento** por otro de la búsqueda de la Spec 001 manteniendo los gramos, y **quitarlo**.
3. EL SISTEMA DEBERÁ permitir **agregar** un alimento que la IA no detectó, mediante la búsqueda de la Spec 001.
4. CUANDO la confianza de un alimento sea baja (menor a 0,6), EL SISTEMA DEBERÁ marcarlo con un aviso **"Revisa"**.
5. MIENTRAS el usuario corrige, EL SISTEMA DEBERÁ mostrar al instante el total de kcal y macros de la comida.
6. EL SISTEMA DEBERÁ mostrar que los valores son una **estimación** y que la app no entrega consejo médico.
7. NADA DEBERÁ guardarse en el diario hasta que el usuario toque **Guardar**. Si sale sin guardar, EL SISTEMA DEBERÁ pedir confirmación para descartar.
8. Las cantidades DEBERÁN respetar los límites de la Spec 001 (mayor a 0 y hasta 5000 g); si una no los cumple, no se podrá guardar.

## R5 · Valores nutricionales
1. CUANDO un alimento propuesto coincida con un alimento propio o del catálogo, EL SISTEMA DEBERÁ preferir los valores por 100 g de ese alimento.
2. SI no hay coincidencia, ENTONCES EL SISTEMA DEBERÁ usar los valores por 100 g estimados por la IA y mostrarlos con la etiqueta **"Estimado por IA"**.
3. CUANDO el usuario reemplace un alimento (R4.2), EL SISTEMA DEBERÁ usar los valores del alimento elegido.

## R6 · Guardar en el diario
1. CUANDO el usuario toque **Guardar**, EL SISTEMA DEBERÁ crear **un registro por alimento** en el día y tipo de comida elegidos, con la copia del nombre y los macros de la Spec 001 (R5.4).
2. Los registros creados desde una foto DEBERÁN quedar identificados como de origen **IA**, y se podrán editar y eliminar como cualquier otro (Spec 001 R5.6).
3. CUANDO se guarde, EL SISTEMA DEBERÁ volver a "Hoy" con el resumen actualizado.
4. SI falla el guardado de algún registro, ENTONCES EL SISTEMA DEBERÁ no dejar la comida a medias (se guardan todos o ninguno) y permitir reintentar sin perder las correcciones.

## R7 · Medir la precisión en el piloto
1. CUANDO se guarde una comida desde una foto, EL SISTEMA DEBERÁ registrar, sin la foto: el proveedor y modelo usados, la versión del prompt, el tiempo de análisis, y por cada alimento lo propuesto (nombre, gramos, confianza) frente a lo guardado (alimento, gramos, si fue quitado o agregado).
2. Esos datos DEBERÁN pertenecer al usuario (RLS por `auth.uid()`) y borrarse con su cuenta.
3. EL SISTEMA DEBERÁ permitir obtener, para el equipo, el error entre los gramos propuestos y los guardados, sin datos que identifiquen al usuario.

## R8 · Límite de uso
1. EL SISTEMA DEBERÁ limitar los análisis a **N por usuario y por día** (valor configurable en el servidor; propuesta para el piloto: 10), contando solo los análisis que llegan al proveedor.
2. EL SISTEMA DEBERÁ mostrar cuántos análisis quedan en el día.
3. CUANDO se alcance el límite, EL SISTEMA DEBERÁ informarlo y ofrecer **Buscar por nombre** y **Escanear código**.
4. El límite DEBERÁ aplicarse en el servidor, no solo en la app.

## R9 · Errores
1. SI no hay conexión, el análisis supera el tiempo máximo o el proveedor falla, ENTONCES EL SISTEMA DEBERÁ mostrar un mensaje claro con **Reintentar**, **Buscar por nombre** y **Escanear código**, sin perder la foto.
2. SI el proveedor alcanza su propio límite de uso (por ejemplo, la cuota del plan gratuito), ENTONCES EL SISTEMA DEBERÁ informar que el análisis por foto no está disponible por ahora y ofrecer las alternativas de R9.1.
3. SI la respuesta del proveedor no cumple el formato esperado, ENTONCES el servidor DEBERÁ tratarla como un error de R9.1 y no enviar datos incompletos a la app.
4. Un análisis fallido NO DEBERÁ descontarse del límite de R8.

## R10 · Calidad y plataformas
1. La función DEBERÁ funcionar en **Android e iOS con Expo Go**, sin build nativo propio.
2. La validación de la respuesta del proveedor, el cálculo de totales, la coincidencia con alimentos del catálogo y el límite diario DEBERÁN tener tests automáticos.
3. Antes de publicar en el piloto, el proveedor y modelo elegidos DEBERÁN cumplir los criterios del prototipo (error mediano en calorías ≤ 25 %, en proteína ≤ 30 %, ≥ 70 % de platos dentro de ±30 % en calorías, y rechazo de las fotos que no son comida).
4. Todo el texto de la interfaz DEBERÁ estar en español.

---

## Decisiones pendientes (propuestas)
| # | Pregunta | Propuesta |
|---|---|---|
| Q1 | Proveedor y modelo de IA | Se decide con el prototipo; preferencia Gemini (plan gratuito) o un servicio gratuito |
| Q2 | ¿Guardar las fotos? | No en F3: menos riesgo de privacidad y sin costo de almacenamiento |
| Q3 | Límite diario de análisis | 10 por usuario en el piloto, ajustable en el servidor |
| Q4 | Ubicación del botón "Foto" | En Buscar, junto a "Escanear código" (igual que en la Spec 002) |
| Q5 | Umbral de "Revisa" | Confianza menor a 0,6 |
| Q6 | Registrar las correcciones (R7) | Sí, para medir la precisión real durante el piloto |
