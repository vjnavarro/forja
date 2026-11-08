# Planificación semanal

## Qué está implementado

En Semana, desactiva incógnito, elige la semana y abre **Planificar semana**.
Selecciona tus días disponibles y el número de bloques de natación, fuerza y core.
El calendario distribuye hasta siete bloques, uno por día disponible. Los objetivos
del perfil son una referencia inicial; el usuario decide cuántos bloques organizar.

**Generar borrador** no guarda datos. Puedes cambiar fechas y actividades antes
de marcar que has revisado el calendario y pulsar **Aceptar y guardar plan**.
Si cambias la disponibilidad o las cantidades, se descarta el borrador anterior.
No se sustituye una sesión existente: los días ocupados se indican como conflicto.

Las sesiones aceptadas quedan pendientes, sin duración, distancia, ejercicios ni
dosis inventadas, y con molestias sin valorar. **Editar sesión** permite concretar
estos datos, registrar observaciones y señalar qué se ha completado. Una edición
basada en una versión antigua se rechaza si otro navegador/dispositivo ya ha
modificado ese registro, para evitar sobrescribir datos recientes.

**Reutilizar semana anterior** toma únicamente sus fechas relativas y actividades,
tanto de sesiones planificadas como completadas. No copia duración, dosis,
observaciones, molestias ni completados. Se revisa y acepta un nuevo borrador.
El resumen semanal cuenta solo los completados explícitos e incluye las sesiones
planificadas con `completed: false`.

Incógnito retira el planificador y los detalles de sesiones de la interfaz. El
borrador vive en memoria y se descarta al salir de la vista o cambiar de semana.

## Fuentes y límites

El calendario utiliza tu disponibilidad, los bloques que eliges y, si lo solicitas,
la distribución de la semana anterior. No deduce cargas del peso, del sexo o del
avatar. No interpreta el contexto clínico ni aumenta automáticamente los ejercicios.
Los bloques de fuerza/core se señalan como pendientes de concretar cuando no se
han indicado ejercicios.

La biblioteca actual es una selección estática de ilustraciones y consultas en
canales institucionales (Swim England y Mayo Clinic). No es un catálogo de
prescripciones adaptado a una situación clínica concreta. La autorización general
para empezar progresivamente no concreta ejercicios, dosis ni límites.

Para una futura plantilla de ejercicios personalizada siguen pendientes:
disponibilidad y material detallados; ejercicios y límites concretos revisados
para la situación de la persona; y un catálogo con enlaces técnicos específicos,
procedencia y estado de revisión. Los valores de la antigua demo no son dosis
personales de entrenamiento. Si se comunican molestias no se generan progresiones.

No hay conexión automática con ChatGPT ni búsquedas médicas automáticas. Los
resúmenes se comparten por acción del usuario; el contexto de salud es optativo.
Se mantiene React, GitHub Pages y Firestore Spark, sin IA de pago ni Cloud Functions.

## Guardado y acceso

Cada plan aceptado se registra en `users/{uid}/transformations/{id}/plans/{lunes}`,
con procedencia, fechas e IDs de las sesiones. Solo se admite un plan aceptado por
semana. Su aceptación y la creación de las sesiones son una transacción: dos
aceptaciones simultáneas no duplican ni sobrescriben registros. Después se editan
las sesiones individualmente; no hay sustitución masiva ni borrado desde este flujo.

Cada escritura de sesiones actualiza el documento de la transformación en el mismo
commit. Las reglas exigen ese cambio. El planificador lee ese documento antes de
consultar el calendario: un cambio concurrente hace reintentar su transacción y
volver a comprobar los conflictos. Las reglas también validan hasta siete
referencias, un bloque por fecha, sin completados ni dosis en la aceptación inicial,
y acceso exclusivamente del propietario autorizado.

## Activación de una instalación existente

Este módulo requiere publicar la nueva versión de `firestore.rules`.
Despliega primero el cliente de esta versión; a continuación publica las nuevas
reglas y recarga la web. Hasta publicar las reglas, el planificador mostrará un
aviso de activación pendiente. No se migran ni borran historiales. El cliente
anterior no actualizaba el documento padre al escribir sesiones y no es compatible
con las reglas nuevas para esas escrituras. No hacen falta nuevas variables ni
credenciales administrativas en el navegador.
