# Planificación semanal: estado y siguiente versión

## Implementado

La vista Semana muestra los objetivos elegidos por el usuario y las sesiones
que este registra con fecha, actividad, duración/distancia, ejercicios,
series/repeticiones, molestias y estado planificado o completado. No genera
entrenamientos. El resumen cuenta únicamente las sesiones marcadas como realizadas.

La biblioteca es una selección estática de ilustraciones y consultas en canales
institucionales (Swim England y Mayo Clinic). No es un catálogo de ejercicios
validado para una situación clínica concreta. Las notas privadas de salud se
guardan como texto y no se interpretan para prescribir ejercicios.

## Fuentes para construir la siguiente versión

1. **Configuración personal:** disponibilidad, días de piscina, frecuencia deseada,
   material, duración disponible y objetivos confirmados por el usuario.
2. **Pauta profesional:** ejercicios concretos autorizados, límites de carga,
   frecuencia y criterios de pausa/revisión facilitados por médico o fisioterapeuta.
   Una autorización genérica para empezar no completa estos campos.
3. **Catálogo revisado:** cada ejercicio necesita identificador, explicación,
   material, enlace técnico específico, procedencia y estado de revisión. Los
   enlaces actuales de búsqueda son referencias de consulta, no esta validación.
4. **Registro real:** sesiones completadas, tolerancia y molestias comunicadas.
   Ausencia de registro no significa cumplimiento ni ausencia de dolor.

No se deducen cargas de los kilos, del avatar o del sexo. Las cifras del catálogo
de demostración no son dosis personales de entrenamiento.

## Flujo propuesto, todavía pendiente de implementar

El usuario elige una plantilla y su distribución de días. Un motor sencillo de
reglas organiza un **borrador** semanal de natación, fuerza y core a partir de
las sesiones y ejercicios autorizados. Cada sesión conserva la procedencia de
su plantilla. El usuario revisa y acepta el borrador antes de guardarlo.

El borrador no aumenta series, repeticiones ni intensidad automáticamente. Si se
comunican molestias, se señala la necesidad de revisar el plan y no se ofrecen
progresiones automáticas. No se interpreta un diagnóstico para decidir ejercicios.
Los ejercicios que carezcan de una pauta personal suficiente quedan pendientes
de configurar; no se rellenan con valores genéricos.

La siguiente semana puede repetir una plantilla aceptada, manteniendo las cargas
y separando siempre lo planificado de lo completado. Evitar sesiones duplicadas
al generar o aceptar varias veces una semana forma parte de la implementación.

## Tecnología y coste

La primera versión del planificador puede ejecutarse en React mediante reglas
locales y guardar plantillas/planes privados en Firestore bajo el UID del usuario,
con validación de esquema y reglas de acceso específicas. Mantiene Spark y Pages;
no necesita Cloud Functions ni una API de IA de pago.

ChatGPT puede utilizarse de forma manual con los resúmenes exportados y solo con
los datos que el usuario elija compartir. Hoy no hay conexión automática con
ChatGPT, búsquedas médicas automáticas ni servicios de IA que reciban su historial.

## Orden de trabajo

Importar y verificar el historial privado; recoger disponibilidad y pauta
profesional; crear catálogo revisado y plantilla personal; implementar el borrador
semanal y su aceptación; probar aislamiento, guardado y separación entre tareas
planificadas/completadas. No se considera implementado hasta completar ese flujo.
