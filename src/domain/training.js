import { decodeCatalogReference } from './catalog-reference.js';
import { ACTIVITY_TYPES, dateTime, today, validateSession, weekBounds } from './transformation.js';
import { ACTIVITY_LABELS, plannedSession, shiftDate, validateDraft } from './planning.js';

const clean = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
export function validateTemplate(value) {
  if (
    !value ||
    !clean(value.title, 80) ||
    !clean(value.focus, 80) ||
    !Number.isInteger(value.level) ||
    value.level < 1 ||
    value.level > 5
  )
    throw new Error('Indica nombre, enfoque y nivel de carga de la plantilla (1–5).');
  const session = validateSession({
    ...value,
    date: '2025-01-01',
    completed: false,
    discomfort: 'not-reported',
    notes: '',
  });
  if (session.type !== 'swim' && !session.exercises.length)
    throw new Error('Define al menos un ejercicio y su pauta para esta plantilla.');
  return {
    title: clean(value.title, 80),
    focus: clean(value.focus, 80),
    level: value.level,
    source: clean(value.source, 1000),
    type: session.type,
    minutes: session.minutes,
    distance: session.distance,
    exercises: session.exercises,
  };
}
export function validateProgram(value) {
  if (
    !value ||
    !Number.isFinite(dateTime(value.startWeek)) ||
    weekBounds(value.startWeek).start !== value.startWeek ||
    !Number.isInteger(value.weeks) ||
    value.weeks < 1 ||
    value.weeks > 12 ||
    !Array.isArray(value.schedule) ||
    value.schedule.length < 1 ||
    value.schedule.length > 21 ||
    !Array.isArray(value.templateIds) ||
    value.templateIds.length > 12 ||
    value.templateIds.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) ||
    new Set(value.templateIds).size !== value.templateIds.length
  )
    throw new Error(
      'Revisa el inicio, la duración (1–12 semanas), las actividades y las plantillas.',
    );
  const schedule = value.schedule.map((row) => {
    if (
      !row ||
      !Number.isInteger(row.day) ||
      row.day < 0 ||
      row.day > 6 ||
      !ACTIVITY_TYPES.includes(row.type)
    )
      throw new Error('Elige días y actividades válidos.');
    return { day: row.day, type: row.type };
  });
  if (new Set(schedule.map((row) => `${row.day}:${row.type}`)).size !== schedule.length)
    throw new Error('Cada actividad solo puede aparecer una vez por día.');
  return {
    startWeek: value.startWeek,
    weeks: value.weeks,
    schedule,
    templateIds: [...value.templateIds],
  };
}
export function assessWeek(rows, report) {
  const pain = report.discomfort !== 'none' || rows.some((row) => row.discomfort === 'present');
  const complete = rows.length > 0 && rows.every((row) => row.completed === true);
  return { pain, complete, increaseAllowed: !pain && complete && report.wellbeing === 'good' };
}
export function validateReview(weekStart, rows, value, currentDate = today()) {
  if (
    !Number.isFinite(dateTime(weekStart)) ||
    weekBounds(weekStart).start !== weekStart ||
    weekStart > currentDate ||
    !rows.length ||
    !['good', 'mixed', 'bad'].includes(value?.wellbeing) ||
    !['none', 'present', 'unknown'].includes(value?.discomfort) ||
    !['maintain', 'increase', 'reduce'].includes(value?.decision)
  )
    throw new Error('Revisa las sensaciones y la decisión de esta semana.');
  const result = {
    weekStart,
    wellbeing: value.wellbeing,
    discomfort: value.discomfort,
    decision: value.decision,
    notes: clean(value.notes, 2000),
  };
  if (result.decision === 'increase' && !assessWeek(rows, result).increaseAllowed)
    throw new Error(
      'No se propone un aumento con molestias, sensaciones desfavorables o actividades pendientes.',
    );
  return result;
}
export async function digest(value) {
  const canonical = (item) =>
    item?.toMillis
      ? { seconds: item.seconds, nanoseconds: item.nanoseconds }
      : Array.isArray(item)
        ? item.map(canonical)
        : item && typeof item === 'object'
          ? Object.fromEntries(
              Object.keys(item)
                .sort()
                .filter((key) => item[key] !== undefined)
                .map((key) => [key, canonical(item[key])]),
            )
          : item;
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(canonical(value))),
  );
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function fingerprintSessions(rows) {
  return digest(
    [...rows]
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((row) => [
        row.id,
        row.date,
        row.type,
        row.completed,
        row.minutes,
        row.distance,
        row.exercises,
        row.discomfort,
        row.notes,
        row.updatedAt?.toMillis?.() ?? 0,
        row.origin ?? null,
        row.catalog ? decodeCatalogReference(row.catalog) : null,
      ]),
  );
}
export function programProposal(programValue, templates, date, review, previous = []) {
  const program = validateProgram(programValue),
    start = weekBounds(date).start;
  const index = (dateTime(start) - dateTime(program.startWeek)) / (7 * 86400000);
  if (index < 0 || index >= program.weeks)
    throw new Error('Esta semana queda fuera de la programación. Ajusta su inicio o duración.');
  if (index > 0 && (!review || review.weekStart !== shiftDate(start, -7)))
    throw new Error('Cierra y revisa la semana anterior antes de preparar esta propuesta.');
  const assessment = review
    ? assessWeek(previous, review)
    : { pain: false, increaseAllowed: false };
  const hold = assessment.pain || review?.wellbeing === 'bad';
  if (review?.decision === 'increase' && !assessment.increaseAllowed)
    throw new Error('La revisión no permite proponer aumentos.');
  const warnings = [],
    used = {},
    levels = {};
  let raised = false;
  const active = templates
    .filter((row) => program.templateIds.includes(row.id))
    .map((row) => ({ ...validateTemplate(row), id: row.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const rows = program.schedule.map(({ day, type }) => {
    const session = plannedSession(shiftDate(start, day), type);
    const pool = active.filter((row) => row.type === type),
      available = [...new Set(pool.map((row) => row.level))].sort((a, b) => a - b);
    const oldLevels = previous
      .filter((row) => row.type === type)
      .map((row) => row.origin?.level ?? 0);
    const baseline = Math.max(0, ...oldLevels) || available[0] || 0;
    const dose = (row) =>
      JSON.stringify([
        row.minutes,
        row.distance,
        row.exercises.map((exercise) => [exercise.name, exercise.sets, exercise.repetitions]),
      ]);
    const manualDrift = previous.some(
      (row) =>
        row.type === type &&
        (row.origin?.templateId ||
          row.exercises.length ||
          row.minutes !== null ||
          row.distance !== null) &&
        !pool.some(
          (template) =>
            (!row.origin?.templateId || template.id === row.origin.templateId) &&
            dose(template) === dose(row),
        ),
    );
    if (levels[type] === undefined) {
      let level = baseline;
      if (review?.decision === 'increase') {
        level = available.find((n) => n > baseline) ?? baseline;
        if (level <= baseline)
          warnings.push(
            `${ACTIVITY_LABELS[type]}: no hay una variante de mayor carga configurada; conserva su nivel.`,
          );
      } else if (review?.decision === 'reduce')
        level = available.filter((n) => n < baseline).at(-1) ?? baseline;
      levels[type] = level;
    }
    const variants = pool.filter(
      (row) =>
        row.level === levels[type] && !(review?.decision === 'reduce' && levels[type] >= baseline),
    );
    const occurrence = used[type] ?? 0;
    used[type] = occurrence + 1;
    const focuses = [
      ...new Set(variants.map((row) => row.focus.toLocaleLowerCase('es-ES'))),
    ].sort();
    const selectedFocus = focuses[(index + occurrence) % focuses.length];
    const focusVariants = variants.filter(
      (row) => row.focus.toLocaleLowerCase('es-ES') === selectedFocus,
    );
    const template =
      !hold && !manualDrift && focusVariants.length
        ? focusVariants[Math.floor((index + occurrence) / focuses.length) % focusVariants.length]
        : null;
    if (manualDrift)
      warnings.push(
        `${ACTIVITY_LABELS[type]}: hay pautas ajustadas manualmente o plantillas modificadas. Revisa sus diferencias antes de reutilizar las cargas.`,
      );
    if (template && review?.decision === 'increase' && template.level > baseline) raised = true;
    if (template)
      Object.assign(session, {
        minutes: template.minutes,
        distance: template.distance,
        exercises: template.exercises.map((e) => ({ ...e })),
        notes:
          `Plantilla: ${template.title}. Enfoque: ${template.focus}. Nivel configurado: ${template.level}. Fuente: ${template.source || 'Definida por el usuario'}.`.slice(
            0,
            2000,
          ),
      });
    else
      session.notes = hold
        ? 'Bloque pendiente de revisar por molestias o valoración incompleta. Sin ejercicios ni dosis propuestos.'
        : 'Bloque pendiente de configurar: no hay una plantilla compatible en el nivel actual.';
    session.origin = {
      weekStart: start,
      templateId: template?.id ?? '',
      title: template?.title ?? '',
      focus: template?.focus ?? '',
      level: template?.level ?? 0,
      edited: false,
    };
    return session;
  });
  if (review?.decision === 'increase' && !raised)
    throw new Error(
      'No hay una variante de mayor carga definida. Configúrala en tus plantillas o elige mantener.',
    );
  if (hold)
    warnings.push(
      'Se conserva el calendario con los detalles pendientes de revisar. No se proponen ejercicios ni aumentos.',
    );
  if (rows.some((row) => !row.origin.templateId) && !assessment.pain)
    warnings.push('Algunos bloques necesitan una plantilla; quedan pendientes de concretar.');
  return {
    draft: validateDraft({
      weekStart: start,
      source: index === 0 ? 'program' : 'review',
      sessions: rows,
    }),
    warnings: [...new Set(warnings)],
    cycleWeek: index + 1,
    totalWeeks: program.weeks,
  };
}
export function encodeProgram(value) {
  const program = validateProgram(value);
  return {
    ...program,
    schedule: Object.fromEntries(
      program.schedule.map((slot) => [`${slot.day}-${slot.type}`, true]),
    ),
  };
}
export function decodeProgram(value) {
  return {
    ...validateProgram({
      ...value,
      schedule: Array.isArray(value.schedule)
        ? value.schedule
        : Object.keys(value.schedule ?? {}).map((key) => {
            const [day, type] = key.split('-');
            return { day: Number(day), type };
          }),
    }),
    updatedAt: value.updatedAt,
  };
}
