import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessWeek,
  decodeProgram,
  encodeProgram,
  fingerprintSessions,
  programProposal,
  validateProgram,
  validateReview,
  validateTemplate,
} from '../src/domain/training.js';
import { weeklySummary } from '../src/domain/transformation.js';

const variant = (id, level = 1, focus = id) => ({
  id,
  title: `Variante sintética ${id}`,
  type: 'core',
  focus,
  level,
  source: 'Pauta sintética de prueba',
  minutes: 5 * level,
  distance: null,
  exercises: [
    { name: `Ejercicio sintético ${id}`, sets: level, repetitions: `${level} de prueba` },
  ],
});
const templates = [variant('a'), variant('b'), variant('c', 2), variant('d', 2)];
const program = {
  startWeek: '2025-02-03',
  weeks: 4,
  schedule: [
    { day: 0, type: 'swim' },
    { day: 0, type: 'core' },
    { day: 3, type: 'core' },
  ],
  templateIds: templates.map((row) => row.id),
};
const good = (weekStart, decision = 'maintain') => ({
  weekStart,
  wellbeing: 'good',
  discomfort: 'none',
  decision,
  notes: '',
});
const completed = (draft) =>
  draft.sessions.map((row, index) => ({
    ...row,
    id: `s${index}`,
    completed: true,
    discomfort: 'none',
  }));

test('programs persist an exact multi-activity schedule and explicit duration', () => {
  assert.deepEqual(decodeProgram(encodeProgram(program)).schedule, program.schedule);
  assert.equal(encodeProgram(program).schedule['0-swim'], true);
  assert.equal(encodeProgram(program).schedule['0-core'], true);
  assert.throws(() => validateProgram({ ...program, weeks: 13 }));
  assert.throws(() =>
    validateProgram({ ...program, schedule: [program.schedule[0], program.schedule[0]] }),
  );
});
test('template validation requires user-defined exercise doses and focus', () => {
  assert.deepEqual(validateTemplate(templates[0]).exercises, templates[0].exercises);
  assert.throws(() => validateTemplate({ ...templates[0], exercises: [] }));
  assert.throws(() => validateTemplate({ ...templates[0], focus: '' }));
  assert.throws(() => validateTemplate({ ...templates[0], level: 6 }));
});
test('focus rotation balances groups even if one group has more variants', () => {
  const bank = [variant('a', 1, 'Grupo A'), variant('b', 1, 'Grupo A'), variant('c', 1, 'Grupo B')];
  const draft = programProposal(
    { ...program, templateIds: bank.map((row) => row.id) },
    bank,
    '2025-02-03',
    null,
  ).draft;
  assert.deepEqual(
    draft.sessions.filter((row) => row.type === 'core').map((row) => row.origin.focus),
    ['Grupo A', 'Grupo B'],
  );
});
test('alternating focuses uses configured variants and never makes records completed', () => {
  const first = programProposal(program, templates, '2025-02-03', null);
  assert.equal(first.draft.sessions.length, 3);
  const firstCore = first.draft.sessions.filter((row) => row.type === 'core');
  assert.deepEqual(
    firstCore.map((row) => row.origin.templateId),
    ['a', 'b'],
  );
  const next = programProposal(
    program,
    templates,
    '2025-02-10',
    good('2025-02-03'),
    completed(first.draft),
  );
  assert.deepEqual(
    next.draft.sessions.filter((row) => row.type === 'core').map((row) => row.origin.templateId),
    ['b', 'a'],
  );
  assert.ok(
    next.draft.sessions.every((row) => !row.completed && row.discomfort === 'not-reported'),
  );
  assert.deepEqual(
    next.draft.sessions.find((row) => row.origin.templateId === 'a').exercises,
    templates[0].exercises,
  );
});
test('increases use only the next higher variant explicitly configured by the user', () => {
  const first = programProposal(program, templates, '2025-02-03', null);
  const next = programProposal(
    program,
    templates,
    '2025-02-10',
    good('2025-02-03', 'increase'),
    completed(first.draft),
  );
  const core = next.draft.sessions.filter((row) => row.type === 'core');
  assert.ok(core.every((row) => row.origin.level === 2));
  for (const row of core)
    assert.deepEqual(
      row.exercises,
      templates.find((template) => template.id === row.origin.templateId).exercises,
    );
  assert.throws(
    () =>
      programProposal(
        { ...program, templateIds: ['a', 'b'] },
        templates,
        '2025-02-10',
        good('2025-02-03', 'increase'),
        completed(first.draft),
      ),
    /No hay una variante/,
  );
});
test('pain in logs overrides a favourable weekly report; unknown discomfort blocks increases', () => {
  const first = programProposal(program, templates, '2025-02-03', null),
    rows = completed(first.draft);
  rows[0].discomfort = 'present';
  assert.equal(assessWeek(rows, good('2025-02-03')).increaseAllowed, false);
  assert.throws(() =>
    programProposal(program, templates, '2025-02-10', good('2025-02-03', 'increase'), rows),
  );
  const held = programProposal(program, templates, '2025-02-10', good('2025-02-03'), rows);
  assert.ok(
    held.draft.sessions.every(
      (row) => row.exercises.length === 0 && row.minutes === null && row.distance === null,
    ),
  );
  assert.equal(
    assessWeek(completed(first.draft), { wellbeing: 'good', discomfort: 'unknown' })
      .increaseAllowed,
    false,
  );
});
test('review requires actual records and refuses increases with incomplete or unfavourable weeks', () => {
  const first = programProposal(program, templates, '2025-02-03', null),
    rows = completed(first.draft);
  assert.throws(() => validateReview('2025-02-03', [], good('2025-02-03')));
  assert.throws(() =>
    validateReview(
      '2025-02-03',
      [{ ...rows[0], completed: false }],
      good('2025-02-03', 'increase'),
    ),
  );
  assert.throws(() =>
    validateReview('2025-02-03', rows, { ...good('2025-02-03', 'increase'), wellbeing: 'bad' }),
  );
  assert.equal(
    validateReview('2025-02-03', rows, good('2025-02-03', 'increase')).decision,
    'increase',
  );
});
test('program boundaries and a previous weekly review are required', () => {
  assert.throws(
    () => programProposal(program, templates, '2025-03-03', good('2025-02-24')),
    /fuera/,
  );
  assert.throws(() => programProposal(program, templates, '2025-02-10', null), /semana anterior/);
});
test('manual dose adjustments are not silently replaced by the previous template', () => {
  const first = programProposal(program, templates, '2025-02-03', null),
    rows = completed(first.draft);
  const core = rows.find((row) => row.type === 'core');
  core.exercises = [{ ...core.exercises[0], sets: 0 }];
  core.origin = { ...core.origin, edited: true };
  const next = programProposal(program, templates, '2025-02-10', good('2025-02-03'), rows);
  assert.ok(
    next.draft.sessions
      .filter((row) => row.type === 'core')
      .every((row) => row.exercises.length === 0),
  );
  assert.ok(next.warnings.some((value) => value.includes('ajustadas manualmente')));
});
test('session fingerprint ignores ordering but detects changes to real records', async () => {
  const rows = completed(programProposal(program, templates, '2025-02-03', null).draft);
  assert.equal(await fingerprintSessions(rows), await fingerprintSessions([...rows].reverse()));
  assert.notEqual(
    await fingerprintSessions(rows),
    await fingerprintSessions(
      rows.map((row, index) => (index === 0 ? { ...row, completed: false } : row)),
    ),
  );
  assert.notEqual(
    await fingerprintSessions(rows),
    await fingerprintSessions(
      rows.map((row, index) =>
        index === 0 ? { ...row, notes: 'Nueva observación sintética' } : row,
      ),
    ),
  );
});
test('weekly export retains the source and manual-adjustment flag of generated activities', () => {
  const rows = completed(programProposal(program, templates, '2025-02-03', null).draft);
  rows[0].origin.edited = true;
  const profile = {
    initialWeight: 100,
    targetWeight: 80,
    startDate: '2025-01-01',
    heightCm: null,
    weeklyGoals: { swim: 1, swimMax: 1, strength: 0, core: 2 },
  };
  const summary = weeklySummary(profile, [], rows, '2025-02-03');
  assert.deepEqual(summary.sessions[0].origin, rows[0].origin);
  assert.equal(summary.sessions[0].origin.edited, true);
});
