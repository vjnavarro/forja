# Programación, actividades combinadas y revisión semanal

## Uso

En **Semana**, desactiva incógnito para ver el calendario. En móvil, la tira de
siete días permite consultar uno cada vez sin recorrer una lista larga. En escritorio,
los días aparecen en una cuadrícula. Cada día tiene accesos **+ Natación**, **+ Fuerza**
y **+ Core** que abren el formulario con fecha y actividad ya elegidas.

Las tarjetas muestran el estado y la distancia, duración o número de ejercicios.
Se puede marcar una actividad completada, editar sus detalles o eliminarla desde
la propia tarjeta. Las observaciones y ejercicios se despliegan con **Ver detalles**.
Eliminar requiere revisar fecha y actividad y confirmar expresamente; también se
advierte si estaba completada. No se da por realizada ninguna actividad al crearla.

**Semana tipo y revisión** abre la configuración para varias semanas. **Distribuir
esta semana** conserva el planificador de disponibilidad y su borrador revisable.
Ambos quedan detrás del calendario para que no compitan con el registro diario.
El calendario permite combinar natación, fuerza y core el mismo día; la planificación
por lotes admite hasta 21 combinaciones únicas de fecha y tipo.

Al entrar se muestra la semana actual o la primera de la programación si todavía
no ha empezado. Se puede navegar con las flechas, la fecha o **Ir a hoy**. Guardar
una programación desde una semana fuera de su periodo lleva a su primera semana.
Una propuesta fuera de periodo informa de las fechas, sin pedir una revisión ajena.

## Corregir una semana de prueba

1. Selecciona la semana que quieres vaciar.
2. Abre **Corregir una semana de prueba → Eliminar esta semana**.
3. Revisa el intervalo y los números de actividades totales y completadas.
4. Si es la primera de la programación, puedes marcar **Empezar la programación el…**
   para trasladar el inicio a la semana siguiente conservando duración, días y plantillas.
5. Confirma la casilla de borrado y pulsa **Confirmar eliminación**.

Se borran las sesiones cuya fecha pertenece a esa semana, su documento de plan y
su revisión. También se incluyen sesiones manuales o completadas, indicadas antes
de confirmar. Una sesión trasladada a otra semana se conserva aunque el plan
antiguo mantenga una referencia a su ID. No se borran pesajes, contexto, plantillas,
transformaciones ni actividades de otras semanas. El borrado es definitivo.

El reinicio se realiza en una transacción. Si cambian las sesiones, el plan, la
revisión o la programación desde que se abrió la confirmación, se rechaza y exige
revisar de nuevo. Si se traslada el inicio, la nueva primera semana no requiere
cerrar la semana de prueba eliminada. No se puede mover el inicio al borrar una
semana intermedia. El borrado individual también rechaza una versión antigua.

## Configurar una vez para varias semanas

Abre **Mi programación y revisión semanal**:

1. En **Nueva plantilla**, define nombre, enfoque, tipo, duración/distancia y
   ejercicios con su pauta. El nivel de carga (1–5) lo define el usuario; no es
   una escala médica. Puedes indicar la procedencia o las indicaciones de la pauta.
2. Crea variantes con distintos enfoques. Si quieres disponer de una progresión,
   configura por separado una variante de nivel superior con sus dosis revisadas.
   La aplicación no calcula nuevos pesos, series ni repeticiones.
3. En **Crear programación**, elige la semana de inicio, de 1 a 12 semanas, las
   actividades de cada día y hasta doce plantillas activas. Se pueden marcar las
   tres actividades de un mismo día.
4. En la primera semana, pulsa **Preparar propuesta de esta semana**, revisa las
   variantes y confirma su aceptación. Las sesiones quedan pendientes de realizar.

Se guarda la regla de repetición para N semanas. No se guardan anticipadamente
los ejercicios de todas ellas: cada propuesta posterior se prepara a partir de
la revisión de la semana anterior y se acepta de forma explícita. Esto permite
adaptar lo pendiente sin reescribir registros ya guardados.

Al abrir **Semana tipo y revisión**, el panel avisa de una revisión anterior
pendiente. Incógnito retira el calendario, el panel y sus detalles.

## Cerrar una semana y preparar la siguiente

**Cerrar y revisar esta semana** muestra los completados reales y pregunta por
sensaciones, molestias y la decisión: mantener, usar un nivel inferior configurado
o proponer uno superior configurado. Se requiere confirmar que se han revisado los
registros. También se puede abrir la revisión de la semana anterior.

La propuesta siguiente mantiene días y actividades. Alterna los grupos de enfoque
que hayas definido y las variantes dentro de cada grupo, conservando exactamente
las dosis de la plantilla elegida. La alternancia no certifica equilibrio muscular
ni idoneidad clínica: depende de las plantillas personales disponibles.

Un aumento requiere todas las actividades completadas, valoración favorable,
ausencia explícita de molestias y una variante superior definida. Se utiliza el
siguiente nivel disponible, sin inventar incrementos. Si no existe ninguna variante
superior, hay que definirla o elegir mantener. Un tipo sin nivel superior conserva
su nivel mientras otro tipo puede usar su variante superior; la propuesta lo indica.

Si hay molestias registradas, valoración incompleta de molestias o sensaciones
malas, se conserva el calendario y se dejan pendientes los ejercicios y dosis.
Una respuesta favorable no ignora un registro de molestias. Si las dosis reales
se han ajustado o ya no coinciden con las plantillas de origen, se pide revisar sus
diferencias antes de reutilizarlas, en vez de restablecer automáticamente una carga.

Al terminar las N semanas se guarda la revisión, pero no se prepara otra semana
fuera del periodo hasta que el usuario ajuste la programación.

## Protección de registros y concurrencia

Aceptar una propuesta solo añade actividades nuevas. Las ya guardadas, manuales,
completadas o ajustadas se conservan y se informa del número preservado. Para cambiar
una sesión existente se usa **Editar sesión**. Dos aceptaciones simultáneas no crean
duplicados. La edición rechaza una versión antigua si otro dispositivo la cambió.

La revisión contiene una huella de los registros valorados. Si cambian las sesiones,
hay que revisarlas de nuevo. Una propuesta deja de ser válida si cambian la
programación, las plantillas o la revisión antes de aceptarla. Cada escritura de
sesiones, programación, plantillas o revisiones actualiza también la transformación
para que la transacción vuelva a comprobar cambios concurrentes.

## Fuentes y límites

Las pautas proceden de las plantillas que configura el usuario y de sus registros.
Los bloques sin una plantilla compatible quedan pendientes de concretar. No se
deducen cargas del peso, del sexo o del avatar. La autorización general para empezar
progresivamente no concreta ejercicios, dosis ni límites para una situación clínica.

La biblioteca estática con ilustraciones y consultas en Swim England/Mayo Clinic
continúa siendo material de consulta, no un conjunto de prescripciones personales.
No hay búsqueda médica ni conexión automática con ChatGPT. Los resúmenes se
comparten por acción del usuario; el contexto clínico continúa siendo optativo.
Se mantiene React, GitHub Pages y Spark, sin IA de pago ni Cloud Functions.

## Datos privados y activación

Bajo `users/{uid}/transformations/{id}` se añaden `templates/{id}`,
`private/program` y `reviews/{lunes}`. Los planes V2 admiten hasta 21 referencias
con tipos de actividad en sus IDs; mantienen compatibilidad con referencias V1.
Las nuevas sesiones verifican el enlace al plan y sus fechas. La validación de los
IDs evita superar el límite de expresiones de las reglas al guardar 21 actividades.
Cada sesión generada conserva su procedencia (plantilla, enfoque y nivel); una
edición manual queda indicada. Todos estos documentos siguen limitados al propietario
autorizado. No se incluye información personal en el código o los fixtures.

Para activar esta versión: desplegar primero el cliente, publicar después las
reglas actualizadas y recargar la web. No hay borrado automático ni nuevas
variables. Las nuevas reglas permiten eliminar sesiones, planes y revisiones solo
al propietario autorizado y exigen actualizar también la transformación en el
mismo commit. Pesajes y contexto conservan sus restricciones anteriores. Las nuevas colecciones se crean al guardar desde la aplicación.
