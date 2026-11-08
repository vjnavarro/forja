import { ACTIVITY_TYPES, dateTime, validateSession, weekBounds } from './transformation.js';

export const ACTIVITY_LABELS = { swim: 'Natación', strength: 'Fuerza', core: 'Core' };
export function shiftDate(date, days) {
  const time = dateTime(date);
  if (!Number.isFinite(time)) throw new Error('Revisa la fecha de la semana.');
  return new Date(time + days * 86400000).toISOString().slice(0, 10);
}
export function weekDates(date) {
  const { start } = weekBounds(date);
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}
export function plannedSession(date, type) {
  return validateSession({
    date,
    type,
    completed: false,
    minutes: null,
    distance: null,
    exercises: [],
    discomfort: 'not-reported',
    notes: 'Origen: calendario semanal revisado por el usuario.',
  });
}
export function validateDraft(draft) {
  if (
    !draft ||
    !Number.isFinite(dateTime(draft.weekStart)) ||
    weekBounds(draft.weekStart).start !== draft.weekStart
  )
    throw new Error('La semana debe empezar en lunes.');
  if (
    !['availability', 'previous-week', 'manual'].includes(draft.source) ||
    !Array.isArray(draft.sessions) ||
    draft.sessions.length < 1 ||
    draft.sessions.length > 7
  )
    throw new Error('El borrador debe contener entre una y siete sesiones.');
  const end = shiftDate(draft.weekStart, 6);
  const sessions = draft.sessions
    .map((row) => {
      const value = validateSession(row);
      if (
        value.date < draft.weekStart ||
        value.date > end ||
        value.completed ||
        value.discomfort !== 'not-reported' ||
        value.exercises.length ||
        value.minutes !== null ||
        value.distance !== null
      )
        throw new Error(
          'El borrador organiza fechas y actividades; los detalles se concretan al editar cada sesión.',
        );
      return value;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(sessions.map((row) => row.date)).size !== sessions.length)
    throw new Error('Elige un solo bloque del borrador por día.');
  return { weekStart: draft.weekStart, weekEnd: end, source: draft.source, sessions };
}
export function generateDraft(date, days, counts) {
  const dates = weekDates(date);
  if (
    !Array.isArray(days) ||
    days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(days).size !== days.length ||
    !ACTIVITY_TYPES.every(
      (key) => Number.isInteger(counts?.[key]) && counts[key] >= 0 && counts[key] <= 7,
    )
  )
    throw new Error('Revisa los días disponibles y el número de sesiones.');
  const available = [...days].sort((a, b) => a - b);
  const queue = [];
  const remaining = { ...counts };
  while (ACTIVITY_TYPES.some((type) => remaining[type] > 0))
    for (const type of ACTIVITY_TYPES)
      if (remaining[type] > 0) {
        queue.push(type);
        remaining[type]--;
      }
  if (!queue.length || queue.length > available.length)
    throw new Error(
      'Selecciona al menos una sesión y suficientes días: un bloque por día disponible.',
    );
  return validateDraft({
    weekStart: dates[0],
    source: 'availability',
    sessions: queue.map((type, index) =>
      plannedSession(
        dates[
          available[
            queue.length === 1
              ? 0
              : Math.floor((index * (available.length - 1)) / (queue.length - 1))
          ]
        ],
        type,
      ),
    ),
  });
}
export function repeatPreviousWeek(date, sessions) {
  const dates = weekDates(date);
  const previousStart = shiftDate(dates[0], -7);
  const previousEnd = shiftDate(dates[0], -1);
  const previous = sessions.filter((row) => row.date >= previousStart && row.date <= previousEnd);
  if (!previous.length) throw new Error('No hay sesiones en la semana anterior para reutilizar.');
  return validateDraft({
    weekStart: dates[0],
    source: 'previous-week',
    sessions: previous.map((row) => plannedSession(shiftDate(row.date, 7), row.type)),
  });
}
export function planConflicts(draft, sessions) {
  return draft.sessions.filter((slot) => sessions.some((row) => row.date === slot.date));
}
