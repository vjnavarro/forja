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

## Funciones

- Dashboard con evolución del peso, objetivo de 78 kg e hitos derivados del progreso ficticio.
- Registro de pesos de demo con validación y actualización de la gráfica.
- Cinco sesiones semanales de natación, fuerza y core; marcar o desmarcar actividades actualiza los objetivos.
- Biblioteca filtrable con búsquedas de vídeos de técnica en YouTube (contenido externo, no curado).
- Persistencia local en el navegador y opción para restablecer la demo. No hay sincronización entre dispositivos.

## Publicar gratis en GitHub Pages

1. Revisar y fusionar la pull request en `main`.
2. En GitHub, abrir **Settings → Pages → Build and deployment → Source: GitHub Actions**. Para mantener el alojamiento gratuito, usar un repositorio público con GitHub Free; no contratar un plan.
3. En **Actions**, comprobar que `Build and deploy FORJA` termina correctamente. También puede ejecutarse manualmente desde `main`.
4. La aplicación estará en `https://vjnavarro.github.io/forja/`. La dirección definitiva se muestra en el despliegue de GitHub Pages.

Las pull requests solo compilan. La publicación se realiza exclusivamente desde `main`. Vite usa `/forja/` como base; cambiar `vite.config.js` si se renombra el repositorio o se usa un dominio propio. La navegación interna usa estado React y no necesita reglas de reescritura.

## Estructura y futura integración Firebase

- `src/demo.js`: datos ficticios iniciales.
- `src/storage.js`: adaptador local de lectura, guardado y reinicio.
- `src/main.jsx`: componentes de dashboard, semana, biblioteca y registro.
- `src/style.css`: diseño responsive y navegación móvil con safe area de iPhone.

Firebase **no está conectado**: no hay SDK, configuración, credenciales ni peticiones a Authentication o Firestore. Para una futura integración Spark, reemplazar el adaptador local por una capa asíncrona de repositorios y añadir un proveedor de autenticación. Separar los datos por UID, crear reglas de seguridad y probarlas en emuladores antes de habilitar acceso real. No habilitar facturación ni servicios de pago. No subir claves privadas o archivos `.env`.

Las fuentes web son opcionales; si no están disponibles se usan fuentes del sistema. El plan es ilustrativo y no sustituye asesoramiento profesional.
