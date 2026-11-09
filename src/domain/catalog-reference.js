function strings(value, limits) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== Object.keys(limits).length
  )
    return false;
  return Object.entries(limits).every(
    ([key, max]) =>
      typeof value[key] === 'string' &&
      !value[key].includes('␟') &&
      value[key].length > 0 &&
      value[key].length <= max,
  );
}
export function validateCatalogReference(value) {
  const fields = [
    'schemaVersion',
    'release',
    'sessionId',
    'title',
    'audience',
    'referenceOnly',
    'context',
    'purpose',
    'sourcePath',
    'tasks',
    'guidance',
  ];
  if (
    !value ||
    Object.keys(value).length !== fields.length ||
    !fields.every((key) => Object.hasOwn(value, key)) ||
    value.schemaVersion !== 1 ||
    typeof value.release !== 'string' ||
    !/^[a-f0-9]{40}$/.test(value.release) ||
    typeof value.sessionId !== 'string' ||
    !/^SES-\d{3}$/.test(value.sessionId) ||
    typeof value.sourcePath !== 'string' ||
    value.sourcePath.length > 240 ||
    !/^docs\/06-sessions\/[a-z0-9-]+\.md$/.test(value.sourcePath) ||
    value.audience !== 'youth' ||
    value.referenceOnly !== true ||
    typeof value.title !== 'string' ||
    !value.title.length ||
    value.title.length > 200 ||
    typeof value.context !== 'string' ||
    !value.context.length ||
    value.context.length > 8000 ||
    typeof value.purpose !== 'string' ||
    !value.purpose.length ||
    value.purpose.length > 4000 ||
    typeof value.guidance !== 'string' ||
    !value.guidance.length ||
    value.guidance.length > 40000 ||
    !Array.isArray(value.tasks) ||
    !value.tasks.length ||
    value.tasks.length > 6
  )
    throw new Error('La referencia FORJA no tiene un formato válido.');
  const limits = { key: 100, exerciseId: 6, name: 160, prescription: 2000 };
  if (
    value.tasks.some((task) => !strings(task, limits) || !/^EX-\d{3}$/.test(task.exerciseId)) ||
    new Set(value.tasks.map((task) => task.key)).size !== value.tasks.length
  )
    throw new Error('Las tareas de la referencia FORJA no son válidas.');
  return { ...value, tasks: value.tasks.map((task) => ({ ...task })) };
}

// Firestore stores columns to validate all strings within its expression budget.
// The UI and exports keep the ordinary array of tasks.
export function encodeCatalogReference(input) {
  const value = validateCatalogReference(input);
  return {
    ...value,
    tasks: {
      taskKeys: value.tasks.map((row) => row.key),
      exerciseIds: value.tasks.map((row) => row.exerciseId),
      names: value.tasks.map((row) => row.name),
      prescriptions: value.tasks.map((row) => row.prescription),
    },
  };
}
export function decodeCatalogReference(input) {
  if (Array.isArray(input?.tasks)) return validateCatalogReference(input);
  const tasks = input?.tasks;
  if (
    !tasks ||
    Object.keys(tasks).length !== 4 ||
    !['taskKeys', 'exerciseIds', 'names', 'prescriptions'].every(
      (key) => Array.isArray(tasks[key]) && tasks[key].length === tasks.taskKeys?.length,
    ) ||
    tasks.taskKeys.length < 1 ||
    tasks.taskKeys.length > 6
  )
    throw new Error('No se pudo leer la referencia FORJA.');
  return validateCatalogReference({
    ...input,
    tasks: tasks.taskKeys.map((key, index) => ({
      key,
      exerciseId: tasks.exerciseIds[index],
      name: tasks.names[index],
      prescription: tasks.prescriptions[index],
    })),
  });
}
