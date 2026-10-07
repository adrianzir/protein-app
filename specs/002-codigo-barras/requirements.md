# Spec 002 · Código de barras — Requisitos

**Estado:** Aprobado (2026-10-07)
**Fase del plan:** 2 (ver [PLAN.md](../../PLAN.md))
**Depende de:** [Spec 001 · Diario manual](../001-diario-manual/requirements.md) (búsqueda, registro y alimentos personalizados)
**Plataformas:** Android e iOS (web: solo ingreso manual del código)

## Contexto
Buscar productos envasados por nombre es lento y ambiguo: hay muchas marcas y variantes. Escanear el código de barras del envase identifica el producto exacto en segundos y trae sus macros desde **Open Food Facts**, la misma fuente que ya se usa en la Fase 1.

## Alcance
**Incluye:** escanear con la cámara; buscar el producto por código (primero en los alimentos propios, luego en Open Food Facts); registrarlo con el flujo existente; crear un alimento propio cuando el producto no existe o viene incompleto; ingresar el código a mano.

**No incluye:** códigos QR; escanear varios productos a la vez; aportar datos o fotos a Open Food Facts; mostrar Nutri-Score o ingredientes; funcionamiento sin conexión.

## Glosario
- **Código de barras:** código GTIN impreso en el envase. Formatos soportados: EAN-13, EAN-8, UPC-A y UPC-E.
- **Dígito verificador:** último dígito del código, que permite detectar lecturas o tipeos erróneos.
- **Porción del envase:** cantidad sugerida por el fabricante (por ejemplo "30 g"), si Open Food Facts la informa.

---

## R1 · Escanear con la cámara
**Historia:** Como usuario, quiero apuntar la cámara al código de un envase para registrarlo sin escribir.

1. EL SISTEMA DEBERÁ ofrecer un botón **"Escanear código"** en la pantalla Buscar, que conserve el día y el tipo de comida elegidos.
2. CUANDO se abra el escáner, EL SISTEMA DEBERÁ mostrar la vista de la cámara con una guía de encuadre y detectar automáticamente códigos EAN-13, EAN-8, UPC-A y UPC-E, sin que el usuario tenga que presionar nada.
3. CUANDO se detecte un código válido, EL SISTEMA DEBERÁ dejar de escanear, dar una señal breve (vibración) y buscar el producto. Una misma lectura no DEBERÁ procesarse dos veces.
4. EL SISTEMA DEBERÁ permitir encender y apagar la linterna.
5. SI el código leído no pasa la validación del dígito verificador, ENTONCES EL SISTEMA DEBERÁ ignorarlo y seguir escaneando.

## R2 · Permiso de cámara
1. ANTES de pedir el permiso, EL SISTEMA DEBERÁ explicar para qué se usa la cámara.
2. SI el usuario niega el permiso, ENTONCES EL SISTEMA DEBERÁ mostrar un mensaje con acceso a los ajustes del teléfono y la opción de **ingresar el código a mano** (R5).
3. Las imágenes de la cámara NO DEBERÁN guardarse ni enviarse a ningún servidor; solo se envía el número del código.

## R3 · Buscar el producto por código
1. CUANDO haya un código válido, EL SISTEMA DEBERÁ buscarlo primero en los **alimentos propios** del usuario y, si no está, en **Open Food Facts**.
2. CUANDO el producto se encuentre con kcal, proteína, carbohidratos y grasa por 100 g, EL SISTEMA DEBERÁ abrir la pantalla **Registrar** de la Spec 001, con el día y el tipo de comida de origen.
3. SI el producto informa una porción del envase en gramos, ENTONCES la pantalla Registrar DEBERÁ ofrecer un acceso rápido para usar esa cantidad (por ejemplo "1 porción · 30 g"), manteniendo 100 g como valor inicial.
4. MIENTRAS se busca, EL SISTEMA DEBERÁ mostrar un indicador de carga y permitir cancelar.
5. Una búsqueda por código ya hecha en la sesión NO DEBERÁ repetirse contra Open Food Facts: se reutiliza el resultado guardado en caché.

## R4 · Producto no encontrado o incompleto
1. SI el producto no existe en Open Food Facts, o le falta alguno de los cuatro valores por 100 g, ENTONCES EL SISTEMA DEBERÁ informarlo y ofrecer:
   - **crear el alimento** con el formulario de la Spec 001 (R4), precargado con el código y, si existen, el nombre, la marca y los valores disponibles;
   - **volver a escanear**.
2. CUANDO el usuario guarde ese alimento, EL SISTEMA DEBERÁ asociarle el código de barras, de modo que el próximo escaneo del mismo código lo encuentre directamente (R3.1).
3. El código de un alimento propio DEBERÁ ser único para cada usuario: si ya existe uno con ese código, se usa el existente en vez de duplicarlo.

## R5 · Ingresar el código a mano
1. EL SISTEMA DEBERÁ permitir escribir el código cuando la cámara no está disponible, no hay permiso, en web, o la lectura falla.
2. CUANDO el código escrito no tenga 8, 12 o 13 dígitos o su dígito verificador no sea válido, EL SISTEMA DEBERÁ indicarlo antes de buscar.

## R6 · Errores de red
1. SI Open Food Facts no responde, falla o supera su límite de uso, ENTONCES EL SISTEMA DEBERÁ mostrar un mensaje claro con **Reintentar**, **Ingresar a mano** y **Buscar por nombre**, sin perder el código leído.
2. EL SISTEMA DEBERÁ limitar la espera de cada consulta (tiempo máximo) para no quedar bloqueado.

## R7 · Calidad y plataformas
1. El escaneo DEBERÁ funcionar en **Android e iOS con Expo Go**, sin requerir un build nativo propio.
2. En web, EL SISTEMA DEBERÁ ofrecer solo el ingreso manual del código (R5).
3. La validación del dígito verificador, la normalización de códigos (por ejemplo UPC-A ↔ EAN-13) y la lectura de la respuesta de Open Food Facts DEBERÁN tener tests unitarios.
4. Todo el texto de la interfaz DEBERÁ estar en español.

---

## Decisiones (preguntas resueltas)
| # | Pregunta | Decisión |
|---|---|---|
| Q1 | Ubicación del botón "Escanear" | En la pantalla **Buscar**, junto al campo de búsqueda |
| Q2 | Porción del envase como acceso rápido | Sí, como botón; 100 g sigue siendo el valor inicial |
| Q3 | Guardar productos de OFF escaneados en la base | No en F2: solo caché local de la sesión; se evalúa en F4 |
