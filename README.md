# FORJA

Portal modular React + Vite. El módulo **Mi Transformación** permite mantener
transformaciones privadas por cuenta Google: pesajes, gráfica histórica, hitos,
sesiones, contexto privado y resúmenes exportables. GitHub Pages aloja la interfaz;
Firebase Authentication y Firestore protegen y sincronizan los datos.

## Desarrollo

Node.js 22 o posterior y npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

La base de publicación es `/forja/`. La navegación usa hash y funciona en Pages
sin reescrituras. Inter y las imágenes se sirven desde la propia aplicación.

Sin configuración Firebase, el portal se muestra, pero el acceso privado queda
cerrado. No hay un modo de autenticación simulado en la versión de producción,
ni datos personales iniciales en el código o en los archivos públicos.

## Activar el acceso privado

Sigue [docs/firebase-setup.md](docs/firebase-setup.md). Requiere un proyecto Firebase
en **Spark**, Google habilitado, Firestore Standard en modo nativo, las reglas
publicadas y las cuentas autorizadas en una colección privada `members`.
No hacen falta Cloud Functions, Cloud Storage, Blaze ni una clave de servicio en
el navegador.

Para desarrollo con un proyecto real, copia `.env.example` a `.env.local` y rellena
los cuatro valores de configuración web. Para Pages, el workflow incluye la
configuración pública del proyecto `forja-vjnh393t` facilitada por su propietario.
Puedes sustituir los cuatro valores mediante GitHub **Settings → Secrets and
variables → Actions → Variables**.
La configuración web de Firebase es pública; la autorización depende de las
reglas, no de ocultar esos valores. Nunca incluyas claves de administrador.

## Pruebas locales del acceso privado

Solo se utilizan cuentas y datos sintéticos en `tests/fixtures/`. El proyecto
`demo-forja` está reservado para emuladores y no accede a servicios reales.

```sh
# Terminal 1, Docker local: emulador Firestore oficial de Google
bash scripts/start-firestore-emulator.sh
# Terminal 2: emulador Authentication
npx --yes firebase-tools@15.34.2 emulators:start --only auth --project demo-forja
# Terminal 3
node scripts/seed-emulators.mjs
npm run dev:emulators
npm run test:rules
```

El script Docker publica únicamente `127.0.0.1:8080`, usa una imagen oficial
fijada por digest y monta las reglas en solo lectura. No necesita credenciales
ni hace peticiones a un proyecto real. Puede ocupar espacio adicional para la
imagen con Java y los emuladores. El modo de emulación se habilita únicamente
con `import.meta.env.DEV`; una compilación de producción lo desactiva incluso si
se define `VITE_USE_EMULATORS`.

Si ya tienes Java 25 y acceso a las descargas oficiales, puedes sustituir Docker
por `npx --yes firebase-tools@15.34.2 emulators:start --only auth,firestore
--project demo-forja`.

`npm test` comprueba cálculos y validaciones. `npm run test:rules` requiere el
emulador y comprueba autorización, separación de cuentas, datos malformados y
revocación. Las pruebas con navegador y los emuladores no sustituyen la
validación de Google OAuth y reglas en el proyecto real antes de activar usuarios.

## Datos y privacidad

- Cada cuenta puede crear varias transformaciones. Una cuenta nueva empieza vacía.
- El menú **Cuenta**, en el portal y las vistas privadas, muestra el correo de
  la sesión Google y permite cerrarla. El cierre fallido conserva el acceso y
  muestra un aviso para reintentar; un cierre confirmado retira las vistas privadas.
- Cada etapa de la infografía permite elegir entre seis complexiones masculinas o
  femeninas, además de un avatar neutro. Se configuran al crear la transformación
  o desde **Figuras** y se guardan en su perfil privado. El peso no cambia la imagen.
- Las rutas son `users/{uid}/transformations/{id}`; los pesajes, sesiones y contexto
  privado están en subcolecciones separadas. No se autoriza acceso entre usuarios.
- No hay caché persistente de datos de seguimiento en localStorage o IndexedDB.
  Firestore utiliza memoria; la sesión de acceso queda limitada a la sesión del
  navegador. La sincronización y el guardado confirmado requieren conexión.
- Incógnito está activado al abrir una transformación y al volver del segundo
  plano. Se retiran cifras, gráfica, notas y detalles del DOM; no se aplica un
  simple desenfoque. Es protección visual, no protección frente a quien controle
  una sesión ya autenticada o las herramientas del navegador.
- El contexto clínico no genera prescripciones. No hay progresión automática de
  ejercicios ni aumento de objetivos por haber completado una sesión.
- Los avatares masculino/femenino y el avatar neutro son ilustrativos, no médicos.
- El resumen se descarga o copia por acción del usuario; no se envía
  automáticamente a ChatGPT. El contexto clínico está excluido salvo selección
  expresa, y la exportación requiere desactivar incógnito.

## Importar un historial propio

Dentro de tu cuenta autorizada, usa **Importar historial privado**. El formato
está ilustrado con datos sintéticos en `tests/fixtures/initial.json`; el campo
`ownerEmail` debe coincidir con la cuenta abierta. La importación crea una nueva
transformación, no mezcla ni sobrescribe otra. No convierte lecturas puntuales en
confirmadas ni añade sesiones que no estén en el archivo. Mantén los archivos
reales fuera del repositorio, de `public/` y de snapshots compartidos del entorno.

## Planificación de entrenamientos

La vista Semana registra objetivos y sesiones elegidos por el usuario. Todavía no
genera planes de entrenamiento ni adapta automáticamente los ejercicios a una
situación clínica. [Estado, fuentes y diseño de la siguiente versión](docs/training-planning.md).

## Publicación

En GitHub, **Settings → Pages → Source: GitHub Actions**. Las PR ejecutan pruebas y
compilación; el despliegue se activa al fusionar en `main`. No se despliegan reglas
Firestore desde Actions: se publican de forma explícita según la guía de Firebase,
antes de habilitar la configuración de producción. El portal sin Firebase permanece
cerrado para datos privados. El alojamiento sigue siendo gratuito con las
condiciones de GitHub Pages y las cuotas Spark; no se activa facturación.

## Estructura

- `src/App.jsx`: portal, rutas y estado de acceso.
- `src/private/`: espacio del usuario, dashboard, formularios y vistas privadas.
- `src/domain/transformation.js`: validación, cronología, indicadores y resúmenes.
- `src/services/`: configuración y adaptador Firebase modular.
- `firestore.rules`: autorización y validaciones del almacenamiento.
- `src/assets/brand/`, `public/brand/`, `src/tokens.css`: identidad FORJA.
- `public/images/`: ejercicios, figuras y paisaje; no contiene datos personales.
- `docs/brand.md`: procedencia y uso de los recursos visuales.
