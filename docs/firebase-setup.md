# Activar Firebase Spark y el módulo privado

Esta guía requiere una cuenta Google con permisos sobre el proyecto. La máquina
de desarrollo no tiene un proyecto ni una identidad de administrador conectados.
No envíes contraseñas ni archivos de cuenta de servicio por chat.

## Crear y configurar

1. En Firebase Console, crea o selecciona un proyecto. Mantén el plan **Spark**;
   no vincules facturación. Google Analytics no es necesario.
2. Registra una aplicación **web**, sin Firebase Hosting. Copia `apiKey`,
   `projectId`, `authDomain` y `appId` de su configuración web.
3. En Authentication → Sign-in method, activa **Google** y configura el correo de
   soporte solicitado por Google. No hacen falta otros proveedores.
4. En Authentication → Settings → Authorized domains, añade `vjnavarro.github.io`.
   Es un hostname, sin `/forja/`. Conserva el dominio Firebase del proyecto.
5. Crea Firestore **Standard**, en modo nativo y en producción. Escoge la región
   europea adecuada antes de crear la base: no se cambia después. Usa la base
   `(default)`, que es la utilizada por este adaptador.
6. Publica el contenido de `firestore.rules` en Rules. No uses reglas de modo de
   prueba ni `allow read, write: if true`.
7. Crea, en la consola de Firestore, un documento por cuenta permitida:
   colección `members`, ID del documento = correo completo en minúsculas, campo
   booleano `enabled: true`. La lista de cuentas reales se entrega de forma
   privada, no se guarda en este repositorio. No crees usuarios ficticios aquí.

El cliente no puede listar ni modificar `members`. Solo lee el documento de su
propio correo. Las reglas exigen correo verificado, proveedor Google, membresía
habilitada y coincidencia de `uid` en todas las rutas de datos. Google puede
identificar una cuenta que no esté en la lista; la app y los datos siguen
rechazando su acceso. No se utilizan funciones de bloqueo de pago.

## Configuración web y Pages

Los cuatro nombres de variable son:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_APP_ID
```

Rellénalos en `.env.local` para desarrollo con el proyecto real. En GitHub usa
Settings → Secrets and variables → Actions → **Variables**, con esos nombres.
El workflow los incorpora durante `npm run build`. El archivo `.env.example`
no debe contener valores de administrador, correos de miembros ni datos de salud.

Las claves web de Firebase no son credenciales de administración y quedan visibles
en el JavaScript del navegador. Su seguridad depende de las reglas desplegadas y
los dominios autorizados. Si una variable falta, el acceso privado permanece
cerrado. Los valores de configuración del entorno Codex no se copian por sí solos
a las variables de GitHub; hay que configurar ambos lugares si ambos se utilizan.

## Validar antes de usar datos reales

1. Ejecuta `npm test`, el emulador Firestore y `npm run test:rules`. La suite incluye
   cuentas no permitidas, correo no verificado, proveedor distinto de Google,
   cruces de UID, membresía revocada y escritura de datos inválidos.
2. Comprueba el inicio real con cada una de las cuentas autorizadas en el dominio
   final. Una cuenta nueva debe mostrar **Nueva transformación**, sin historial
   de otra cuenta.
3. Verifica la denegación de una cuenta que no está en `members`. Comprueba que
   cambiar a una ruta de otra cuenta no abre su transformación.
4. Crea una transformación de prueba y confirma que aparece en otro dispositivo
   de la misma cuenta. Comprueba que abre en incógnito tras recargar.
5. Importa el historial real desde su archivo privado solo después de esas
   verificaciones y desde la cuenta indicada en `ownerEmail`.

No copies datos reales a los fixtures, al emulador usado por pruebas automáticas,
a un issue, a una PR, a `public/` ni al repositorio. No publiques un snapshot
compartido del entorno que contenga el archivo de importación privado.

## Modelo de datos

```text
members/{email-en-minusculas}                enabled (solo administración)
users/{uid}/transformations/{id}            configuración, sin contexto clínico
  weights/{id}                             date, kg, status, note
  sessions/{id}                            actividad, completado, series, molestias
  private/context                          notas de salud y antecedentes
```

Los estados de pesaje son `confirmed`, `reference` y `spot`. Solo los dos primeros
entran en la curva, el indicador y los hitos. La abscisa de la gráfica utiliza
fechas numéricas reales, no índices semanales. Un hito se fecha en el primer
registro de referencia que cumple el umbral, con comparación estricta cuando se
trata de «bajar de» o «superar». No se infieren sesiones realizadas. Cada sesión admite hasta seis ejercicios con
series y repeticiones, validados también en las reglas.

## Operación

- Para retirar acceso, cambia `enabled` a `false` en el documento de membresía.
  El observador de autorización desmonta el espacio privado y las reglas vuelven
  a rechazar sus lecturas y escrituras.
- La sesión Auth usa persistencia de sesión; los documentos Firestore solo se
  cachean en memoria. Cerrar sesión desmonta los datos del usuario.
- No se han habilitado borrados desde el cliente. La importación crea una nueva
  transformación. Las correcciones o políticas de conservación se gestionan de
  forma deliberada desde administración, no mediante sobrescrituras automáticas.
- Vigila las cuotas de Spark. Si se agotan, se informa de fallo de conexión o
  guardado; la app no contrata capacidad ni cambia de plan.
