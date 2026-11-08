import { validateAppearance } from './avatars.js';

export const MAX_WEIGHT = 350;
export const WEIGHT_STATES = ['confirmed', 'reference', 'spot'];
export const ACTIVITY_TYPES = ['swim', 'strength', 'core'];
export const formatNumber = (value) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(
    value,
  );
export const formatWeight = (value) => `${formatNumber(value)} kg`;
export const formatDate = (value) =>
  !Number.isFinite(dateTime(value))
    ? 'Fecha no válida'
    : new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(dateTime(value)));
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? +date : NaN;
}
export function isWeight(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 30 && value <= MAX_WEIGHT;
}
function text(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
export function validateProfile(value) {
  if (
    !value ||
    !text(value.title, 60) ||
    !isWeight(value.initialWeight) ||
    !isWeight(value.targetWeight) ||
    value.initialWeight === value.targetWeight
  )
    throw new Error(
      'Revisa el nombre, el peso inicial y el objetivo (entre 30 y 350 kg, diferentes entre sí).',
    );
  if (
    !Number.isFinite(dateTime(value.startDate)) ||
    (value.dietStartDate &&
      (!Number.isFinite(dateTime(value.dietStartDate)) || value.dietStartDate < value.startDate))
  )
    throw new Error('Revisa las fechas del historial y del inicio de dieta.');
  if (
    value.heightCm !== null &&
    (!Number.isFinite(value.heightCm) || value.heightCm < 100 || value.heightCm > 250)
  )
    throw new Error('La altura debe estar entre 100 y 250 cm, o quedar vacía.');
  const goals = value.weeklyGoals;
  if (
    !goals ||
    !ACTIVITY_TYPES.every(
      (type) => Number.isInteger(goals[type]) && goals[type] >= 0 && goals[type] <= 14,
    ) ||
    !Number.isInteger(goals.swimMax) ||
    goals.swimMax < goals.swim ||
    goals.swimMax > 14
  )
    throw new Error('Revisa los objetivos semanales (de 0 a 14 sesiones).');
  return {
    title: text(value.title, 60),
    initialWeight: value.initialWeight,
    targetWeight: value.targetWeight,
    startDate: value.startDate,
    dietStartDate: value.dietStartDate || '',
    heightCm: value.heightCm,
    sex: ['male', 'female', 'unspecified'].includes(value.sex) ? value.sex : 'unspecified',
    ...validateAppearance({
      ...value,
      avatar: ['male', 'female', 'neutral'].includes(value.avatar) ? value.avatar : 'neutral',
    }),
    weeklyGoals: {
      swim: goals.swim,
      swimMax: goals.swimMax,
      strength: goals.strength,
      core: goals.core,
    },
  };
}
export function validateWeight(value) {
  if (
    !value ||
    !isWeight(value.kg) ||
    !Number.isFinite(dateTime(value.date)) ||
    !WEIGHT_STATES.includes(value.status)
  )
    throw new Error('Revisa la fecha, el peso y el estado del pesaje.');
  return { date: value.date, kg: value.kg, status: value.status, note: text(value.note, 500) };
}
export function validateSession(value) {
  if (
    !value ||
    !Number.isFinite(dateTime(value.date)) ||
    !ACTIVITY_TYPES.includes(value.type) ||
    typeof value.completed !== 'boolean'
  )
    throw new Error('Revisa la fecha y el tipo de sesión.');
  for (const key of ['minutes', 'distance'])
    if (
      value[key] !== null &&
      (!Number.isFinite(value[key]) ||
        value[key] < 0 ||
        value[key] > (key === 'minutes' ? 1440 : 100000))
    )
      throw new Error('Revisa la duración y la distancia.');
  const exercises = (Array.isArray(value.exercises) ? value.exercises : [])
    .filter((item) => item && text(item.name, 80))
    .map((item) => {
      if (
        !Number.isInteger(item.sets) ||
        item.sets < 0 ||
        item.sets > 100 ||
        !text(item.repetitions, 40)
      )
        throw new Error('Revisa las series y las repeticiones de cada ejercicio.');
      return {
        name: text(item.name, 80),
        sets: item.sets,
        repetitions: text(item.repetitions, 40),
      };
    });
  if (exercises.length > 6) throw new Error('Una sesión admite hasta 6 ejercicios.');
  return {
    date: value.date,
    type: value.type,
    completed: value.completed,
    minutes: value.minutes,
    distance: value.distance,
    exercises,
    discomfort: ['not-reported', 'none', 'present'].includes(value.discomfort)
      ? value.discomfort
      : 'not-reported',
    notes: text(value.notes, 2000),
  };
}
export function referenceWeights(weights) {
  return weights
    .filter(
      (row) => row.status !== 'spot' && isWeight(row.kg) && Number.isFinite(dateTime(row.date)),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.createdAt?.toMillis?.() ?? a.order ?? 0) - (b.createdAt?.toMillis?.() ?? b.order ?? 0),
    );
}
export function milestoneDefinitions(profile) {
  const loss = profile.targetWeight < profile.initialWeight;
  const direction = loss ? -1 : 1;
  const delta = Math.abs(profile.initialWeight - profile.targetWeight);
  let step = delta > 25 ? 10 : delta > 10 ? 5 : 2;
  let threshold = loss
    ? Math.floor((profile.initialWeight - 0.01) / step) * step
    : Math.ceil((profile.initialWeight + 0.01) / step) * step;
  const definitions = [];
  for (
    let i = 0;
    i < 30 && (loss ? threshold > profile.targetWeight : threshold < profile.targetWeight);
    i++
  ) {
    definitions.push({
      id: `weight-${threshold}`,
      kind: 'weight',
      value: threshold,
      strict: loss,
      label: `${loss ? 'Bajar de' : 'Alcanzar'} ${formatWeight(threshold)}`,
    });
    step = delta > 25 && threshold <= 100 ? 5 : step;
    threshold += direction * step;
  }
  definitions.push({
    id: 'target',
    kind: 'weight',
    value: profile.targetWeight,
    strict: false,
    label: 'Objetivo final',
  });
  if (loss)
    for (const amount of [10, 20, 30])
      if (amount < delta)
        definitions.push({
          id: `lost-${amount}`,
          kind: 'loss',
          value: amount,
          strict: true,
          label: `Superar ${amount} kg perdidos`,
        });
  return definitions;
}
export function calculateProgress(profile, weights) {
  const refs = referenceWeights(weights);
  const latest = refs.at(-1);
  const current = latest?.kg ?? null;
  const direction = profile.targetWeight < profile.initialWeight ? -1 : 1;
  const total = Math.abs(profile.initialWeight - profile.targetWeight);
  const advanced =
    current === null ? 0 : +((current - profile.initialWeight) * direction).toFixed(3);
  const progress = current === null ? null : Math.max(0, Math.min(100, (advanced / total) * 100));
  const milestones = milestoneDefinitions(profile).map((item) => {
    const first = refs.find((row) =>
      item.kind === 'loss'
        ? profile.initialWeight - row.kg > item.value
        : direction < 0
          ? item.strict
            ? row.kg < item.value
            : row.kg <= item.value
          : row.kg >= item.value,
    );
    return { ...item, reached: !!first, date: first?.date ?? null };
  });
  const pendingWeights = milestones.filter((item) => item.kind === 'weight' && !item.reached);
  const next = pendingWeights[0] ?? null;
  return {
    refs,
    latest,
    current,
    total,
    advanced,
    progress,
    change: current === null ? null : +(current - profile.initialWeight).toFixed(3),
    percentChange:
      current === null ? null : ((current - profile.initialWeight) / profile.initialWeight) * 100,
    remaining:
      current === null
        ? null
        : +Math.max(0, (profile.targetWeight - current) * direction).toFixed(3),
    milestones,
    next,
    bmi: current !== null && profile.heightCm ? current / (profile.heightCm / 100) ** 2 : null,
  };
}
export function weekBounds(date) {
  const d = new Date(dateTime(date));
  if (!Number.isFinite(+d)) throw new Error('Semana no válida.');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 6);
  return { start, end: d.toISOString().slice(0, 10) };
}
export function weeklySummary(profile, weights, sessions, date) {
  const { start, end } = weekBounds(date);
  const metrics = calculateProgress(
    profile,
    weights.filter((row) => row.date <= end),
  );
  const before = referenceWeights(weights.filter((row) => row.date < start)).at(-1);
  const inWeek = metrics.refs.filter((row) => row.date >= start);
  const weekSessions = sessions.filter((row) => row.date >= start && row.date <= end);
  return {
    start,
    end,
    globalProgress: {
      initialWeight: profile.initialWeight,
      targetWeight: profile.targetWeight,
      currentWeight: metrics.current,
      change: metrics.change,
      percent: metrics.progress === null ? null : +metrics.progress.toFixed(2),
      remaining: metrics.remaining,
    },
    latestReference: metrics.latest ? { date: metrics.latest.date, kg: metrics.latest.kg } : null,
    weights: inWeek.map(({ date, kg, status }) => ({ date, kg, status })),
    weightChange: before && inWeek.length ? +(inWeek.at(-1).kg - before.kg).toFixed(1) : null,
    completed: Object.fromEntries(
      ACTIVITY_TYPES.map((type) => [
        type,
        weekSessions.filter((row) => row.type === type && row.completed).length,
      ]),
    ),
    sessions: weekSessions.map(
      ({ date, type, completed, minutes, distance, exercises, discomfort, notes, origin }) => ({
        date,
        type,
        completed,
        minutes,
        distance,
        exercises,
        discomfort,
        notes,
        ...(origin ? { origin: { ...origin } } : {}),
      }),
    ),
    milestones: metrics.milestones.filter((item) => item.date >= start && item.date <= end),
    nextMilestone: metrics.next,
    nextWeekGoals: { ...profile.weeklyGoals },
    discomfortReported: weekSessions.some((row) => row.discomfort === 'present'),
    progression:
      'Sin progresión automática. Ajustar únicamente con tolerancia e indicaciones profesionales.',
  };
}
export function summaryText(profile, summary, context) {
  const labels = { swim: 'Natación', strength: 'Fuerza', core: 'Core' };
  return [
    `FORJA · ${profile.title}`,
    `Semana: ${summary.start} a ${summary.end}`,
    `Inicio del historial: ${profile.startDate} · ${formatWeight(profile.initialWeight)}`,
    `Objetivo orientativo: ${formatWeight(profile.targetWeight)}`,
    `Progreso global: ${summary.globalProgress.percent === null ? 'Sin referencia' : `${Math.round(summary.globalProgress.percent)}% · Pendiente ${formatWeight(summary.globalProgress.remaining)}`}`,
    `Última referencia: ${summary.latestReference ? `${formatWeight(summary.latestReference.kg)} (${summary.latestReference.date})` : 'Sin pesajes de referencia'}`,
    `Cambio semanal confirmado: ${summary.weightChange === null ? 'Sin datos suficientes' : `${formatNumber(summary.weightChange)} kg`}`,
    `Sesiones completadas: ${ACTIVITY_TYPES.map((type) => `${labels[type]} ${summary.completed[type]}`).join(' · ')}`,
    `Hitos: ${summary.milestones.map((item) => `${item.label} (${item.date})`).join('; ') || 'Ningún hito registrado esta semana'}`,
    `Objetivos siguientes: ${ACTIVITY_TYPES.map((type) => `${labels[type]} ${type === 'swim' && summary.nextWeekGoals.swimMax !== summary.nextWeekGoals.swim ? `${summary.nextWeekGoals.swim}–${summary.nextWeekGoals.swimMax}` : summary.nextWeekGoals[type]}`).join(' · ')}`,
    summary.discomfortReported
      ? 'Se han comunicado molestias. No aumentar automáticamente ejercicios.'
      : 'Molestias: consultar cada registro; no se infiere ausencia de molestias.',
    summary.progression,
    '\nREGISTROS DE LA SEMANA',
    JSON.stringify({ weights: summary.weights, sessions: summary.sessions }, null, 2),
    ...(context
      ? ['\nCONTEXTO PRIVADO INCLUIDO POR EL USUARIO', JSON.stringify(context, null, 2)]
      : []),
  ].join('\n');
}
export function parseImport(raw, userEmail) {
  if (
    !raw ||
    raw.schemaVersion !== 1 ||
    typeof raw.ownerEmail !== 'string' ||
    raw.ownerEmail.toLowerCase() !== userEmail.toLowerCase()
  )
    throw new Error('El archivo debe pertenecer a la cuenta con la que has accedido.');
  if (
    !Array.isArray(raw.weights) ||
    raw.weights.length > 400 ||
    !Array.isArray(raw.sessions) ||
    raw.sessions.length > 50
  )
    throw new Error('El archivo admite hasta 400 pesajes y 50 sesiones.');
  const profile = validateProfile(raw.profile);
  const weights = raw.weights.map(validateWeight);
  if (weights.some((row) => row.date < profile.startDate))
    throw new Error('Hay pesajes anteriores al inicio del historial.');
  const healthContext = Object.fromEntries(
    ['activityNotes', 'treatmentNotes', 'lumbarNotes', 'medicalNotes', 'sourceNotes'].map((key) => [
      key,
      text(raw.healthContext?.[key]),
    ]),
  );
  return { profile, weights, sessions: raw.sessions.map(validateSession), healthContext };
}
