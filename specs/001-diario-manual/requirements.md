# Spec 001 · Diario manual — Requisitos

**Estado:** Borrador v2 (cambio de alcance: catálogo global, 2026-09-24)
**Fase del plan:** 1 (ver [PLAN.md](../../PLAN.md))
**Plataformas:** Android e iOS

## Contexto
La Fase 0 dejó listos el inicio de sesión y la tabla `profiles`. Esta fase entrega lo mínimo para usar la app a diario **sin IA**: configurar el perfil, obtener metas de macros, buscar alimentos y registrar lo que se come, viendo el avance del día.

## Alcance
**Incluye:** perfil y metas, catálogo y búsqueda de alimentos, alimentos personalizados, registro de consumo por gramos, resumen diario y navegación entre días.

**No incluye (fases futuras):** código de barras (F2), foto con IA (F3), gráficos e historial semanal, favoritos y recientes (F4), modo sin conexión, unidades distintas de gramos (tazas, unidades), notificaciones.

## Glosario
- **Macros:** calorías (kcal), proteína, carbohidratos y grasas, en gramos.
- **Meta diaria:** objetivo de kcal y macros del usuario para un día.
- **Registro:** un alimento consumido, con su cantidad en gramos, fecha y tipo de comida.
- **Tipo de comida:** desayuno, almuerzo, merienda/once, cena o snack.
- **Mercados iniciales:** Latinoamérica, España y Estados Unidos (la app apunta a un alcance global).

---

## R1 · Perfil del usuario
**Historia:** Como usuario, quiero ingresar mis datos físicos y mi objetivo para que la app calcule mis metas.

1. EL SISTEMA DEBERÁ permitir ingresar y editar: sexo (hombre/mujer), fecha de nacimiento, estatura (cm), peso (kg), nivel de actividad (sedentario, ligero, moderado, activo, muy activo) y objetivo (bajar, mantener, subir de peso).
2. CUANDO el usuario guarde el perfil con algún dato fuera de rango (edad 13–100 años, estatura 100–250 cm, peso 30–300 kg), EL SISTEMA DEBERÁ impedir el guardado y mostrar qué campo corregir.
3. CUANDO el usuario guarde un perfil válido, EL SISTEMA DEBERÁ persistirlo en su cuenta, de modo que se conserve al cerrar sesión o cambiar de dispositivo.
4. MIENTRAS el perfil esté incompleto, EL SISTEMA DEBERÁ mostrar en la pantalla "Hoy" un aviso con acceso directo para completarlo.

## R2 · Metas diarias
**Historia:** Como usuario, quiero conocer cuántas calorías y macros debo consumir según mi objetivo.

1. CUANDO el perfil esté completo, EL SISTEMA DEBERÁ calcular la meta de kcal: tasa metabólica basal con la fórmula **Mifflin-St Jeor**, multiplicada por el factor de actividad (1.2 / 1.375 / 1.55 / 1.725 / 1.9) y ajustada por objetivo (bajar −20 %, mantener 0 %, subir +10 %).
2. EL SISTEMA DEBERÁ repartir las metas de macros así: **proteína** en g por kg de peso (bajar 2.0, mantener 1.6, subir 1.8); **grasa** al 25 % de las kcal; **carbohidratos** con las kcal restantes (nunca negativo). Conversión: 4 kcal/g para proteína y carbohidratos, 9 kcal/g para grasa.
3. MIENTRAS el usuario edita el perfil, EL SISTEMA DEBERÁ mostrar una vista previa de las metas resultantes.
4. CUANDO se guarde el perfil, EL SISTEMA DEBERÁ recalcular y guardar las metas.
5. Las metas DEBERÁN mostrarse redondeadas a enteros.

## R3 · Búsqueda de alimentos
**Historia:** Como usuario, quiero buscar un alimento por nombre para registrarlo rápido.

1. EL SISTEMA DEBERÁ incluir un catálogo base **global** de al menos 80 alimentos genéricos comunes en Latinoamérica, España y Estados Unidos, con sus macros por 100 g.
7. Cada alimento del catálogo DEBERÁ tener sinónimos regionales (por ejemplo palta/aguacate, porotos/frijoles/judías/alubias, plátano/banana/banano, frutilla/fresa, choclo/elote/maíz) y la búsqueda DEBERÁ encontrarlo por cualquiera de ellos.
2. CUANDO el usuario escriba 2 o más caracteres, EL SISTEMA DEBERÁ buscar, sin distinguir mayúsculas ni tildes, en el catálogo base, en los alimentos personalizados del usuario y en **Open Food Facts**.
3. EL SISTEMA DEBERÁ mostrar los resultados locales primero y, a continuación, los de Open Food Facts; cada resultado indica nombre, marca (si existe) y kcal por 100 g.
4. EL SISTEMA DEBERÁ descartar los resultados de Open Food Facts que no tengan kcal, proteína, carbohidratos y grasa por 100 g.
5. SI Open Food Facts no responde o falla, ENTONCES EL SISTEMA DEBERÁ mostrar igualmente los resultados locales y un aviso no bloqueante.
6. EL SISTEMA DEBERÁ esperar a que el usuario deje de escribir (≈400 ms) antes de buscar, para no saturar la red.

## R4 · Alimentos personalizados
**Historia:** Como usuario, quiero crear un alimento que no encuentro, copiando los datos de la etiqueta.

1. EL SISTEMA DEBERÁ permitir crear un alimento con nombre, marca opcional y kcal, proteína, carbohidratos y grasas por 100 g.
2. CUANDO algún valor sea negativo, o la suma de proteína, carbohidratos y grasa supere los 100 g, EL SISTEMA DEBERÁ impedir el guardado.
3. Los alimentos personalizados DEBERÁN ser visibles solo para quien los creó.

## R5 · Registro de consumo
**Historia:** Como usuario, quiero anotar cuánto comí de un alimento en una comida del día.

1. CUANDO el usuario elija un alimento, EL SISTEMA DEBERÁ pedir la cantidad en gramos (valor por defecto: 100) y el tipo de comida.
2. MIENTRAS el usuario ajusta los gramos, EL SISTEMA DEBERÁ mostrar al instante las kcal y macros resultantes (valor por 100 g × gramos / 100).
3. CUANDO se ingrese una cantidad ≤ 0 o > 5000 g, EL SISTEMA DEBERÁ impedir el guardado.
4. CUANDO se guarde un registro, EL SISTEMA DEBERÁ almacenar una copia del nombre y de los macros calculados, para que el historial no cambie si luego se edita o borra el alimento original.
5. El registro se DEBERÁ asociar al día que el usuario está viendo en "Hoy" (por defecto, la fecha local actual).
6. EL SISTEMA DEBERÁ permitir editar los gramos y el tipo de comida de un registro, y también eliminarlo tras pedir confirmación.

## R6 · Resumen diario ("Hoy")
**Historia:** Como usuario, quiero ver cuánto llevo consumido hoy frente a mis metas.

1. EL SISTEMA DEBERÁ mostrar, para el día seleccionado, el total de kcal, proteína, carbohidratos y grasas junto a su meta y una barra de progreso.
2. CUANDO un total supere su meta, EL SISTEMA DEBERÁ destacarlo visualmente, con un indicador distinto del color, por accesibilidad.
3. EL SISTEMA DEBERÁ listar los registros agrupados por tipo de comida, con el subtotal de kcal de cada grupo.
4. EL SISTEMA DEBERÁ permitir pasar al día anterior o al siguiente y volver a "Hoy"; no se podrá navegar a días futuros.
5. CUANDO se cree, edite o elimine un registro, EL SISTEMA DEBERÁ actualizar el resumen sin que el usuario tenga que recargar.

## R7 · Seguridad y datos
1. Cada usuario DEBERÁ poder leer y modificar **solo** su perfil, sus registros y sus alimentos personalizados (RLS en Supabase).
2. El catálogo base DEBERÁ ser de solo lectura para los usuarios.
3. La app NO DEBERÁ contener claves secretas. Open Food Facts no requiere clave.

## R8 · Calidad y plataformas
1. Todas las funciones DEBERÁN funcionar en **Android e iOS** con Expo Go.
2. Los cálculos de metas y macros DEBERÁN tener tests unitarios, incluidos los casos límite.
3. Los formularios DEBERÁN usar el teclado adecuado (numérico para cantidades) y no quedar tapados por el teclado.
4. Todo el texto de la interfaz DEBERÁ estar en español.

---

## Decisiones (preguntas resueltas)
| # | Pregunta | Decisión |
|---|---|---|
| Q1 | Tipos de comida | Desayuno, almuerzo, **merienda/once**, cena y snack (etiqueta neutra para todos los mercados) |
| Q2 | Edición manual de metas | No en F1; queda para F4 |
| Q3 | Opciones de sexo | Se muestra como "sexo biológico (para el cálculo)": hombre / mujer |

## Preguntas abiertas (v2)
| # | Pregunta | Propuesta por defecto |
|---|---|---|
| Q4 | ¿Interfaz también en **inglés** para EE. UU. desde la F1? | No en F1: solo español, pero con textos centralizados para traducir en F4 |
| Q5 | ¿Unidades **imperiales** (lb, ft/in, oz) para EE. UU.? | No en F1: solo métricas; imperiales en F4 junto con el inglés |
