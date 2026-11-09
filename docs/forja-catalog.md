# Biblioteca FORJA y referencias en el calendario

El portal integra un primer catálogo de `diglo-vnavarro/FORJA`: 15 fichas de ejercicios y 3
sesiones. Se conserva el contenido canónico y su procedencia. La integración no importa perfiles,
evaluaciones ni ejemplos de deportistas del repositorio general.

## Uso

**Portal → Biblioteca FORJA** abre el contenido general sin iniciar sesión. Permite buscar por
nombre, código o descripción y filtrar por material y patrón de movimiento. Cada ficha incluye
técnica, requisitos, ejemplos contextuales, criterios de parada y enlace a su documento de origen.
La pestaña **Sesiones** presenta el contexto, bloques y tareas de cada sesión.

Para añadir una referencia privada:

1. Entra en una transformación y desactiva incógnito.
2. En **Semana**, elige el día y pulsa **Sesión FORJA**.
3. Selecciona la sesión y revisa su contexto. La elección se hace por ID explícito; no se sustituye
   por la primera sesión del catálogo.
4. Elige la fecha, confirma que has revisado el contexto y pulsa **Añadir referencia al
   calendario**.

También se puede iniciar desde la biblioteca de la transformación. En incógnito se permite consultar
contenido general, pero se deshabilita el añadido privado.

Las tres sesiones de esta versión están documentadas para contextos juveniles. Se guardan como
referencias pendientes de adaptación individual. Las pautas de la fuente permanecen separadas de los
detalles personales. No se trasladan rangos contextuales a series, repeticiones, duración o
distancia personales; no se presupone que una sesión se haya realizado ni que no existan molestias.
La elaboración de programas adultos o de natación sigue requiriendo contenido revisado para ese
contexto.

El calendario permite consultar la referencia, editar detalles personales y marcar lo realizado. Si
se registran ejercicios personales, se muestra ese estado; la referencia original permanece intacta.
El guardado repetido del mismo ID de sesión, versión y fecha se rechaza sin reemplazar el registro
anterior.

## Contenido y actualización

`src/catalog/source.json` fija repositorio, commit y versión de esquema.
`scripts/sync-forja-catalog.mjs` reutiliza los adaptadores del checkout de origen mediante Vite en
modo SSR. Solo exporta ejercicios, sesiones y recursos aprobados que estos referencian. No importa
`examples/`, perfiles, localStorage, el router ni el Service Worker del otro proyecto.

```sh
npm run sync:catalog -- --source /ruta/al/checkout/FORJA
npm run sync:catalog -- --source /ruta/al/checkout/FORJA --check
```

El checkout debe coincidir con el commit fijado y no tener modificaciones en contenido, adaptadores
ni imágenes. `--check` compara JSON e imágenes sin escribir. El catálogo exportado es determinista:
no contiene fechas de generación variables.

Se guardan:

- `src/catalog/catalog.json`: contenido, hash del artefacto y hashes de documentos y recursos de
  origen.
- `public/forja-catalog/{commit}/images/`: las 15 imágenes WebP aprobadas, copiadas sin modificar
  sus bytes.

Los diez ejercicios conceptuales del índice original no se presentan como fichas completas. Para
actualizar, revisar el nuevo commit, exportar, ejecutar las pruebas y proponer los cambios en una
PR. Las actualizaciones no son lecturas de `main` en tiempo de ejecución ni reescriben las
referencias guardadas por usuarios. No hace falta una dependencia nueva, una consulta a Firestore
por cada ficha ni un servicio de IA para consultar este catálogo.

## Persistencia privada y compatibilidad

La sesión conserva sus campos anteriores y puede incluir `catalog`, un bloque opcional con versión
de origen, ID, título, contexto, propósito, ruta documental, tareas y guía de la fuente. Cada tarea
mantiene ID estable, ejercicio, nombre y prescripción íntegra. La guía conserva bloques, calidad,
adaptaciones y criterios de parada. Se separa en texto legible para mantener una validación acotada
en las reglas de Firestore, sin perder las indicaciones originales.

El adaptador valida la estructura y admite hasta seis tareas por referencia. En Firestore, las
tareas se serializan en cuatro columnas de igual longitud: IDs de tarea, IDs de ejercicio, nombres y
prescripciones. La interfaz y las exportaciones conservan el array normal de tareas. Las reglas
validan todas las columnas al crear la referencia, incluidos tipos, cardinalidad, claves y tamaños.
Una edición debe conservar la referencia exactamente; no puede sustituirla ni introducirla sobre una
sesión manual antigua. Así se evita volver a evaluar cada campo de la referencia en cada
actualización personal y se respeta el límite de expresiones de las reglas. La comparación entre
cada columna y su unión separada de nuevo garantiza que todos sus valores sean cadenas y que no
contengan el separador reservado `␟`, sin aceptar conversiones implícitas de números. Las
prescripciones multilínea usan dos límites de 1000 caracteres para ajustarse a la sintaxis de RE2 y
mantener un máximo de 2000.

El añadido es transaccional y actualiza la transformación en el mismo commit. Se mantiene Google,
membresía y aislamiento por propietario. La referencia también se conserva al exportar el resumen y
se incorpora a la huella de revisión semanal. Los pesajes, notas de salud, plantillas y sesiones
anteriores permanecen en sus rutas y formatos. No se migra el historial al desplegar.

## Verificación y publicación

- Pruebas de integridad del catálogo y hashes de imágenes.
- Selección y filtros; correspondencia exacta de SES-001, SES-002 y SES-003.
- Ausencia de dosis o sesiones ficticias al añadir una referencia.
- Validación de campos y límites; rechazo de supuestas aprobaciones o procedencias malformadas.
- Guardado privado, referencias inmutables, concurrencia y ausencia de duplicados.
- Conservación de fuentes en exportaciones, edición y revisión.
- Navegador con cuentas sintéticas: consulta pública, registro en calendario, recarga, incógnito,
  filtros y tamaños móviles.

Después de fusionar y desplegar el cliente, publicar el archivo completo `firestore.rules`
actualizado en Firebase y recargar la web. No se necesitan variables nuevas ni servicios de pago.
Las reglas se prueban en CI y no se publican automáticamente desde Actions.

La siguiente fase es separar de forma más completa planificación y ejecución y seleccionar
propuestas semanales mediante contexto y reglas de contenido revisado. Esta entrega incorpora
catálogo y referencias; no constituye un motor de prescripción personalizada automática.
