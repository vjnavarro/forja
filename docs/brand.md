# Identidad visual de FORJA · Mi Transformación

Esta aplicación utiliza recursos del paquete `assets.zip` aportado por el
propietario del proyecto. La referencia visual es el dashboard de transformación
con Inicio / Hoy / Objetivo, gráfica, progreso e hitos, adaptado a la identidad
FORJA y a pantallas móviles. Todos los datos de la aplicación siguen siendo
ficticios.

## Recursos incorporados

- Las tres copias SVG de `assets/brand/master/` se conservan sin cambios en
  `src/assets/brand/`. El logo se renderiza en línea para utilizar `currentColor`.
- La paleta de marca de `assets/brand/tokens.md` se recoge en `src/tokens.css`,
  con variables adicionales para superficies, contraste y estados de interfaz.
- Inter variable, subconjunto latino con soporte de español, se sirve localmente
  desde `@fontsource-variable/inter`. Su licencia SIL OFL se entrega en
  `public/brand/Inter-OFL.txt`.
- Se incluyen únicamente las ilustraciones maestras de EX-002 (sentadilla goblet),
  EX-012 (remo con mancuerna) y EX-013 (plancha frontal), como WebP en
  `public/images/exercises/`. El resto del paquete no aumenta la descarga de la web.
- El favicon conserva la geometría del símbolo, con navy/blanco según el tema del
  navegador. El icono de iPhone es una rasterización del mismo símbolo, blanco
  sobre navy, a 180 × 180 px.

El manifiesto del paquete identifica esos maestros como `APPROVED`. Las
infografías y fichas marcadas como borradores no se han incorporado. Las imágenes
ilustran movimientos; las repeticiones siguen siendo los ejemplos de la demo,
no una prescripción personal.

## Alcance

Se comparte la identidad con el proyecto general FORJA. No se importa su
descriptor sobre jóvenes deportistas ni se presenta esta aplicación como el
sistema metodológico completo. El ZIP no incluye el sistema de diseño canónico
`src/design-system/forja/`; no se ha supuesto que sus componentes están disponibles.
Los iconos de interfaz continúan usando la dependencia Lucide de esta aplicación.

El dashboard no usa fotografías personales, reconstrucciones corporales ni IMC.
El porcentaje divide el cambio desde 86,4 kg entre la distancia al objetivo
ficticio de 78 kg y se limita al intervalo 0–100. Los hitos y el peso restante
se recalculan con el último registro, también si el peso sube.

La clave `forja.demo.v1` se conserva para respetar registros anteriores.
Los registros inválidos se descartan al leerlos, sin bloquear el arranque; las
sesiones desconocidas y duplicadas no alteran los objetivos semanales.

GitHub Pages mantiene la base `/forja/`, que se aplica también a fuentes,
imágenes e iconos. No se conecta Firebase ni se añaden servicios de pago.
