# Identidad visual FORJA

El portal utiliza los recursos del paquete `assets.zip` aportado por el
propietario del proyecto. Mi Transformación sigue la composición del mockup:
Inicio / Actual / Objetivo, gráfica, progreso, hitos y recorrido de montaña.
La información de cada cuenta se obtiene de Firestore y nunca se incluye en
las imágenes o en los archivos públicos.

## Recursos

- Los tres SVG de `src/assets/brand/` mantienen los bytes originales. Se renderizan
  en línea para utilizar `currentColor`, sin redibujar el escudo o el wordmark.
- `src/tokens.css` recoge la paleta oficial navy/azul, con variables adicionales
  de superficies y contraste. El dashboard usa superficies oscuras y verde para
  la evolución; el portal y las demás vistas mantienen superficies claras.
- Inter variable, subconjunto latino, se sirve con la aplicación; su licencia
  SIL OFL está en `public/brand/Inter-OFL.txt`.
- EX-002, EX-012 y EX-013 se incorporan como ilustraciones maestras WebP a la
  biblioteca. El manifiesto aportado las identifica como `APPROVED`. No se han
  incorporado infografías que estuvieran marcadas como borradores.
- `forja-stages.webp` y `forja-stages-female.webp`, en
  `public/images/transformation/`, son composiciones generadas de personajes
  adultos ficticios. Cada archivo contiene tres etapas de la misma identidad;
  CSS presenta cada tercio sin repetir la descarga. Hay también un avatar neutro.
- `mountain-journey.webp` es un paisaje generado. La ruta, los hitos y las cifras
  son elementos de interfaz superpuestos; no son texto incrustado en la imagen.
- Favicon e icono de iPhone derivan del símbolo oficial y conservan su geometría.

Los personajes son ilustrativos y estáticos: no se deducen de las mediciones ni
predicen el aspecto futuro de una persona. La interfaz lo explica junto a las
figuras. La selección de figura no interviene en cálculos clínicos ni prescribe
un objetivo.

## Alcance

Se comparte la identidad con FORJA general, sin trasladar automáticamente su
descriptor sobre jóvenes deportistas a este módulo de seguimiento personal.
El ZIP no incluía los componentes canónicos `src/design-system/forja/`; la
iconografía funcional continúa utilizando Lucide.

El progreso y los hitos se calculan según el perfil y los pesajes de referencia
de cada transformación. El IMC es opcional y orientativo, solo si el usuario
ha indicado una altura. El modo incógnito retira las cifras, las gráficas y los
detalles privados de la interfaz; no altera las imágenes ilustrativas.

Los adaptadores de la antigua demo local no se utilizan en el portal privado:
no se importa automáticamente su almacenamiento ni se mezcla con una cuenta
Google. Los únicos fixtures incluidos son sintéticos y se emplean en pruebas.
