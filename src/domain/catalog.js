import catalog from '../catalog/catalog.json' with { type: 'json' };
import { validateSession } from './transformation.js';
export { catalog };
const searchable = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-ES');
export function findCatalogExercise(id) {
  return catalog.exercises.find((row) => row.identity.id === id);
}
export function filterCatalogExercises({ query = '', equipment = '', pattern = '' } = {}) {
  const text = searchable(query.trim());
  return catalog.exercises.filter(
    (row) =>
      (!text ||
        searchable(
          [
            row.identity.id,
            row.identity.displayName,
            ...row.identity.aliases,
            row.identity.description,
          ].join(' '),
        ).includes(text)) &&
      (!equipment || row.context.equipment.some((item) => item.id === equipment)) &&
      (!pattern || row.classification.movementPattern.id === pattern),
  );
}
export function catalogSessionDraft({ sessionId, date, contextReviewed }) {
  const session = catalog.sessions.find((row) => row.identity.id === sessionId);
  if (!session || contextReviewed !== true)
    throw new Error('Selecciona una sesión y revisa su contexto antes de añadirla.');
  return validateSession({
    date,
    type: 'strength',
    completed: false,
    minutes: null,
    distance: null,
    exercises: [],
    discomfort: 'not-reported',
    notes:
      'Referencia FORJA reservada. La pauta individual está pendiente de concretar; las cifras de la fuente son contextuales.',
    catalog: {
      schemaVersion: 1,
      release: catalog.source.commit,
      sessionId,
      title: session.identity.name,
      audience: 'youth',
      referenceOnly: true,
      sourcePath: session.traceability.sourcePath,
      context: [
        ...session.context.profile,
        ...session.context.weekly,
        ...session.context.resources,
      ].join('\n'),
      purpose: session.purpose,
      guidance: session.blocks
        .flatMap((block) =>
          block.tasks.map((task) =>
            [
              block.name,
              task.exerciseId,
              `Calidad: ${task.quality}`,
              `Adaptaciones: ${task.adaptations.join(' ')}`,
              `Parada o modificación: ${task.stopCriteria.join(' ')}`,
            ].join('\n'),
          ),
        )
        .join('\n\n'),
      tasks: session.blocks.flatMap((block) =>
        block.tasks.map((task, index) => ({
          key: `${block.id}-${index}`,
          exerciseId: task.exerciseId,
          name: findCatalogExercise(task.exerciseId).identity.displayName,
          prescription: task.prescription,
        })),
      ),
    },
  });
}
