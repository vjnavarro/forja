import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgress,
  dateTime,
  parseImport,
  referenceWeights,
  summaryText,
  validateProfile,
  validateSession,
  validateWeight,
  weekBounds,
  weeklySummary,
} from '../src/domain/transformation.js';
const profile = {
  title: 'Seguimiento de prueba',
  initialWeight: 100,
  targetWeight: 70,
  startDate: '2025-01-01',
  dietStartDate: '2025-01-02',
  heightCm: 180,
  sex: 'unspecified',
  avatar: 'neutral',
  weeklyGoals: { swim: 2, swimMax: 3, strength: 0, core: 1 },
};
const weights = [
  { date: '2025-01-01', kg: 100, status: 'confirmed', note: '' },
  { date: '2025-01-10', kg: 89, status: 'reference', note: '' },
  { date: '2025-01-20', kg: 80, status: 'spot', note: '' },
  { date: '2025-02-01', kg: 79, status: 'confirmed', note: '' },
];
test('reference values exclude spot readings and preserve calendar spacing', () => {
  const m = calculateProgress(profile, weights);
  assert.equal(m.current, 79);
  assert.equal(m.change, -21);
  assert.equal(m.progress, 70);
  assert.equal(m.remaining, 9);
  assert.equal(m.refs.length, 3);
  assert.equal(dateTime(m.refs[1].date) - dateTime(m.refs[0].date), 9 * 86400000);
  assert.equal(dateTime(m.refs[2].date) - dateTime(m.refs[1].date), 22 * 86400000);
  assert.equal(m.milestones.find((row) => row.id === 'lost-20').date, '2025-02-01');
});
test('milestones use the first reference proving a strict threshold, and never the spot date', () => {
  const m = calculateProgress(profile, [
    ...weights,
    { date: '2025-01-11', kg: 80, status: 'confirmed', note: '' },
  ]);
  assert.equal(m.milestones.find((row) => row.id === 'lost-20').date, '2025-02-01');
  assert.equal(m.milestones.find((row) => row.id === 'weight-80').date, '2025-02-01');
});
test('no reference means no invented current measurement; target achievement is capped', () => {
  assert.equal(calculateProgress(profile, []).current, null);
  assert.equal(calculateProgress(profile, []).progress, null);
  assert.equal(
    calculateProgress(profile, [{ date: '2025-03-01', kg: 68, status: 'confirmed' }]).progress,
    100,
  );
  assert.equal(
    calculateProgress(profile, [{ date: '2025-03-01', kg: 110, status: 'confirmed' }]).progress,
    0,
  );
});
test('calendar validation rejects rolled dates and allows leap days', () => {
  for (const value of ['2025-02-29', '2025-04-31', 'not-date', '2025-1-01'])
    assert.ok(Number.isNaN(dateTime(value)));
  assert.ok(Number.isFinite(dateTime('2024-02-29')));
  assert.throws(() => validateWeight({ date: '2025-02-30', kg: 85, status: 'confirmed' }));
});
test('new transformations validate independent starting and diet dates and optional sex', () => {
  assert.equal(validateProfile(profile).dietStartDate, '2025-01-02');
  assert.throws(() => validateProfile({ ...profile, dietStartDate: '2024-12-31' }));
  assert.throws(() => validateProfile({ ...profile, targetWeight: 100 }));
  assert.throws(() =>
    validateProfile({ ...profile, weeklyGoals: { ...profile.weeklyGoals, swimMax: 1 } }),
  );
});
test('weekly summary counts only explicitly completed sessions and does not increase goals when pain is reported', () => {
  const sessions = [
    {
      date: '2025-02-04',
      type: 'swim',
      completed: true,
      minutes: 20,
      distance: 200,
      exercises: [],
      discomfort: 'not-reported',
      notes: '',
    },
    {
      date: '2025-02-05',
      type: 'core',
      completed: false,
      minutes: null,
      distance: null,
      exercises: [],
      discomfort: 'present',
      notes: 'Molestia de prueba.',
    },
  ];
  const summary = weeklySummary(profile, weights, sessions, '2025-02-06');
  assert.deepEqual(weekBounds('2025-02-06'), { start: '2025-02-03', end: '2025-02-09' });
  assert.equal(summary.completed.swim, 1);
  assert.equal(summary.completed.core, 0);
  assert.equal(summary.weightChange, null);
  assert.equal(summary.discomfortReported, true);
  assert.deepEqual(summary.nextWeekGoals, profile.weeklyGoals);
  assert.match(summaryText(profile, summary), /No aumentar automáticamente/);
});
test('imports are bound to the signed-in email and preserve every supplied status without adding sessions', () => {
  const raw = {
    schemaVersion: 1,
    ownerEmail: 'one@example.test',
    profile,
    weights,
    sessions: [],
    healthContext: { medicalNotes: 'Contexto sintético.' },
  };
  const result = parseImport(raw, 'ONE@example.test');
  assert.equal(result.weights.length, 4);
  assert.equal(result.weights[2].status, 'spot');
  assert.equal(result.sessions.length, 0);
  assert.equal(result.healthContext.medicalNotes, 'Contexto sintético.');
  assert.throws(() => parseImport(raw, 'two@example.test'));
});
test('session validation does not treat missing discomfort as absent or plan as complete', () => {
  const value = validateSession({
    date: '2025-02-05',
    type: 'core',
    completed: false,
    minutes: null,
    distance: null,
    exercises: [{ name: 'Ejercicio elegido', sets: 1, repetitions: 'Según registro' }],
    notes: '',
  });
  assert.equal(value.completed, false);
  assert.equal(value.discomfort, 'not-reported');
  assert.throws(() =>
    validateSession({ ...value, exercises: [{ name: 'Ejercicio', sets: -1, repetitions: '2' }] }),
  );
});
