# FORJA · Mi Transformación

Primera versión de una aplicación de progreso deportivo, optimizada para móvil. React + Vite; sin backend, cuentas, analítica ni servicios de pago. Todos los registros, pesos y planes son ficticios. No introducir datos personales reales.

## Desarrollo

Requiere Node.js 22 o posterior y npm.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

```sh
npm test
```

Las pruebas con el runner de Node comprueban el cálculo de progreso e hitos,
los límites de peso y la compatibilidad con el almacenamiento de la primera
versión. GitHub Actions ejecuta estas pruebas antes de compilar.

## Funciones

- Dashboard con evolución del peso, objetivo de 78 kg e hitos derivados del progreso ficticio.
- Registro de pesos de demo con validación y actualización de la gráfica.
- Cinco sesiones semanales de natación, fuerza y core; marcar o desmarcar actividades actualiza los objetivos.
- Biblioteca filtrable con búsquedas de vídeos de técnica en YouTube (contenido externo, no curado).
- Persistencia local en el navegador y opción para restablecer la demo. No hay sincronización entre dispositivos.
- Resumen Inicio / Hoy / Objetivo, indicador de progreso e hitos calculados desde el último registro. La meta ficticia sigue siendo 78 kg; no se calcula IMC ni se infiere un objetivo médico.
- Biblioteca con ilustraciones FORJA, filtros y búsqueda de ejercicios.
- Identidad oficial FORJA: logotipo SVG, paleta azul, fuente Inter alojada localmente e icono para iPhone.

## Publicar gratis en GitHub Pages

1. Revisar y fusionar la pull request en `main`.
2. En GitHub, abrir **Settings → Pages → Build and deployment → Source: GitHub Actions**. Para mantener el alojamiento gratuito, usar un repositorio público con GitHub Free; no contratar un plan.
3. En **Actions**, comprobar que `Build and deploy FORJA` termina correctamente. También puede ejecutarse manualmente desde `main`.
4. La aplicación estará en `https://vjnavarro.github.io/forja/`. La dirección definitiva se muestra en el despliegue de GitHub Pages.

Las pull requests solo compilan. La publicación se realiza exclusivamente desde `main`. Vite usa `/forja/` como base; cambiar `vite.config.js` si se renombra el repositorio o se usa un dominio propio. La navegación interna usa estado React y no necesita reglas de reescritura.

## Estructura y futura integración Firebase

- `src/demo.js`: datos ficticios iniciales.
- `src/storage.js`: adaptador local de lectura, guardado y reinicio.
- `src/progress.js`: validación de registros y cálculo de progreso e hitos.
- `src/main.jsx`: estado de la aplicación y navegación.
- `src/components/`: dashboard, semana, biblioteca, registro y marca.
- `src/assets/brand/`: maestros SVG oficiales, sin redibujar.
- `public/images/exercises/`: tres ilustraciones WebP usadas en la biblioteca.
- `src/tokens.css`: paleta y variables visuales compartidas.
- `src/style.css`: diseño responsive y navegación móvil con safe area de iPhone.
- `docs/brand.md`: procedencia de recursos y alcance de la integración visual.

Firebase **no está conectado**: no hay SDK, configuración, credenciales ni peticiones a Authentication o Firestore. Para una futura integración Spark, reemplazar el adaptador local por una capa asíncrona de repositorios y añadir un proveedor de autenticación. Separar los datos por UID, crear reglas de seguridad y probarlas en emuladores antes de habilitar acceso real. No habilitar facturación ni servicios de pago. No subir claves privadas o archivos `.env`.

Inter se distribuye con la aplicación bajo licencia SIL OFL 1.1, incluida en
`public/brand/Inter-OFL.txt`; no se hacen peticiones a Google Fonts. Si la fuente
local no carga se usan fuentes del sistema. El plan es ilustrativo y no sustituye
asesoramiento profesional.
