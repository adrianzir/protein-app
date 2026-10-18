# Spec 005 · Monetización: anuncios discretos y Premium — Requisitos

**Estado:** Borrador
**Fase del plan:** 6 (ver [PLAN.md](../../PLAN.md)); se publica junto con o después de la Fase 5 (beta y publicación)
**Depende de:** builds propios con EAS (Fase 5), [Spec 003 · Foto con IA](../003-foto-ia/requirements.md) (límite diario de análisis)
**Plataformas:** Android e iOS (en web y en Expo Go no hay anuncios ni compras)

## Contexto
La app es gratuita. Para cubrir costos (IA, Supabase) y generar ingresos se proponen dos fuentes que se complementan:
1. **Anuncios discretos** dentro de algunas pantallas, como tarjetas o franjas, **nunca a pantalla completa ni obligatorios**.
2. Un plan **Premium** de pago, **sin anuncios** y con más análisis de foto por día.

## Alcance
**Incluye:** anuncios banner y nativos en ubicaciones definidas; consentimiento de anuncios (Europa) y permiso de rastreo (iOS); suscripción Premium mensual y anual con las compras de App Store y Google Play; restaurar compras; estado Premium verificado en el servidor.

**No incluye:** anuncios intersticiales, de video con recompensa, al abrir la app o de pantalla completa; anuncios en web; pagos fuera de las tiendas; cupones o códigos promocionales; compartir o vender datos del usuario; planes familiares o de empresa.

## Glosario
- **Banner:** franja de anuncio de tamaño fijo dentro de una pantalla.
- **Anuncio nativo:** anuncio que se muestra como una tarjeta con el estilo de la app, identificado como "Anuncio".
- **Red de anuncios:** servicio que entrega los anuncios y paga por ellos (propuesta: Google AdMob).
- **Premium:** suscripción de pago que quita los anuncios y amplía límites.
- **Consentimiento de anuncios:** aviso exigido en el Espacio Económico Europeo y Reino Unido para mostrar anuncios personalizados.

---

## R1 · Ubicación de los anuncios
**Historia:** Como usuario gratuito, acepto ver anuncios mientras no interrumpan lo que estoy haciendo.

1. EL SISTEMA DEBERÁ mostrar anuncios **solo** en estas ubicaciones:
   - **Hoy:** un anuncio nativo entre las secciones de comida (después de la segunda comida).
   - **Buscar:** un anuncio nativo después de la sección Recientes, o después de los resultados de "Mis alimentos y catálogo".
   - **Progreso:** un banner debajo del resumen del período.
2. EL SISTEMA NO DEBERÁ mostrar anuncios en: inicio de sesión, Perfil, Registrar, Editar registro, Nuevo alimento, escáner, análisis y confirmación de foto, ni en pantallas de error o de pago.
3. EL SISTEMA DEBERÁ mostrar como máximo **un anuncio visible por pantalla**.
4. Cada anuncio DEBERÁ llevar la etiqueta visible **"Anuncio"** y distinguirse del contenido de la app (fondo y borde propios).
5. Un anuncio NO DEBERÁ ubicarse pegado a botones de acción (por ejemplo, el "+" de cada comida o "Guardar"), para evitar toques accidentales.
6. SI un anuncio no carga o no hay anuncio disponible, ENTONCES su espacio DEBERÁ ocultarse sin dejar un hueco en blanco.

## R2 · Anuncios no intrusivos
1. EL SISTEMA NO DEBERÁ mostrar anuncios de pantalla completa, intersticiales, al abrir la app, ni que obliguen a esperar o cerrar algo para continuar.
2. Los anuncios NO DEBERÁN reproducir sonido sin que el usuario lo active.
3. Cargar un anuncio NO DEBERÁ retrasar la carga del contenido de la pantalla.

## R3 · Consentimiento y privacidad
1. CUANDO el usuario esté en el Espacio Económico Europeo o Reino Unido (por ejemplo, España), EL SISTEMA DEBERÁ mostrar el formulario de consentimiento de anuncios antes del primer anuncio, y mostrar anuncios no personalizados si no se acepta.
2. En iOS, ANTES de pedir el permiso de rastreo de Apple, EL SISTEMA DEBERÁ explicar para qué se usa; SI se niega, ENTONCES DEBERÁ mostrar solo anuncios no personalizados.
3. EL SISTEMA DEBERÁ permitir cambiar la elección de privacidad de anuncios desde **Perfil**.
4. EL SISTEMA NO DEBERÁ enviar a la red de anuncios datos del diario, del perfil, metas, peso ni fotos.
5. CUANDO el usuario tenga menos de 18 años según su fecha de nacimiento, EL SISTEMA DEBERÁ pedir solo anuncios no personalizados y aptos para todo público.
6. EL SISTEMA DEBERÁ excluir categorías sensibles para una app de salud (productos para bajar de peso, suplementos, alcohol, apuestas, citas).

## R4 · Premium
**Historia:** Como usuario, quiero pagar para usar la app sin anuncios y analizar más fotos.

1. EL SISTEMA DEBERÁ ofrecer Premium en dos planes, **mensual** y **anual**, comprados con App Store o Google Play.
2. Premium DEBERÁ incluir: **sin anuncios** y **más análisis de foto por día** que el plan gratuito (Spec 003 · R8).
3. EL SISTEMA DEBERÁ mostrar una pantalla de Premium con los beneficios y los precios **en la moneda local que informe la tienda**, accesible desde Perfil y desde el aviso de límite de fotos alcanzado.
4. EL SISTEMA DEBERÁ permitir **restaurar compras** (cambio de teléfono o reinstalación).
5. EL SISTEMA DEBERÁ indicar cómo cancelar (se gestiona en la tienda) y mostrar la fecha de renovación o de término.
6. CUANDO termine una suscripción, EL SISTEMA DEBERÁ volver al plan gratuito sin borrar datos del usuario.

## R5 · Estado Premium en el servidor
1. El estado Premium DEBERÁ verificarse en el servidor con la información de la tienda, no solo en la app.
2. El estado DEBERÁ guardarse por usuario con RLS: el usuario solo lee el suyo; solo el servidor lo escribe.
3. CUANDO cambie el estado (compra, renovación, cancelación, reembolso), EL SISTEMA DEBERÁ reflejarlo en la app en pocos minutos.
4. El límite diario de análisis de foto (Spec 003 · R8) DEBERÁ usar el estado Premium del servidor.
5. SI no hay conexión, ENTONCES la app DEBERÁ usar el último estado conocido.

## R6 · Calidad y plataformas
1. Anuncios y compras DEBERÁN funcionar en builds propios de Android e iOS (EAS); en Expo Go y en web no se mostrarán anuncios ni compras y la app seguirá funcionando.
2. En desarrollo y pruebas DEBERÁN usarse **anuncios de prueba** de la red y compras de prueba de las tiendas, nunca anuncios reales.
3. La lógica de dónde mostrar anuncios, qué pide el consentimiento y el cálculo del límite según el plan DEBERÁN tener tests automáticos.
4. Las fichas de las tiendas DEBERÁN declarar el uso de anuncios y los datos recopilados (Google Play "Seguridad de los datos", App Store "Privacidad de la app"), y la app DEBERÁ tener una política de privacidad pública.
5. Todo el texto de la interfaz DEBERÁ estar en español.

---

## Decisiones pendientes (propuestas)
| # | Pregunta | Propuesta |
|---|---|---|
| Q1 | Red de anuncios | **Google AdMob** (la más usada en Android e iOS, con librería para Expo) |
| Q2 | Ubicaciones | Hoy (entre comidas), Buscar (bajo Recientes o resultados), Progreso (bajo el resumen) |
| Q3 | Herramienta de suscripciones | **RevenueCat** (gratis hasta cierto nivel de ingresos; simplifica tiendas, recibos y restaurar compras) frente a integrar cada tienda por separado |
| Q4 | Precio de Premium | A definir por ti; referencia del mercado: ~US$ 2–4/mes y ~US$ 15–30/año, ajustado por país en las tiendas |
| Q5 | Prueba gratis | 7 días en el plan anual |
| Q6 | Beneficios de Premium | Sin anuncios + 30 análisis de foto por día (gratis: 10) |
| Q7 | Cuándo activar los anuncios | Después del piloto, cuando la app esté publicada en las tiendas |

## Requisitos previos (fuera de la app)
- Cuentas de desarrollador: **Apple Developer** (US$ 99/año) y **Google Play Console** (US$ 25, pago único).
- Cuenta de **AdMob** y, si se aprueba Q3, de **RevenueCat**.
- Datos tributarios y bancarios para recibir pagos de las tiendas y de AdMob.
- **Política de privacidad** publicada en una URL.
