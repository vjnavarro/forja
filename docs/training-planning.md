# Programación, actividades combinadas y revisión semanal

## Uso

En Semana, desactiva incógnito. El calendario permite hasta 21 actividades: una
por tipo y día. Puedes combinar natación, fuerza y core el mismo día. Generar un
borrador no guarda datos; revisa y acepta las fechas antes de guardarlo.

Una semana ya aceptada admite actividades adicionales. Se bloquea repetir el
mismo tipo en el mismo día. Los planes anteriores se conservan y se actualiza su
formato al añadir nuevas actividades, sin borrar sus referencias ni sus sesiones.

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

Cuando existe una programación, el panel se abre al entrar en Semana y avisa de
una revisión anterior pendiente. Incógnito retira el panel y sus detalles.

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
reglas actualizadas y recargar la web. No hay migración destructiva ni nuevas
variables. Las nuevas colecciones se crean al guardar desde la aplicación.
