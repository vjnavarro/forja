import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDraft,
  planConflicts,
  plannedSession,
  repeatPreviousWeek,
  validateDraft,
  weekDates,
} from '../src/domain/planning.js';
import { weeklySummary } from '../src/domain/transformation.js';

test('week dates remain Monday to Sunday across year boundaries and leap days', () => {
  assert.deepEqual(weekDates('2026-01-01'), [
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
    '2026-01-04',
  ]);
  assert.ok(weekDates('2024-02-29').includes('2024-02-29'));
  assert.throws(() => weekDates('2025-02-29'));
});
test('draft uses only chosen days/counts and never fills doses, exercise or completed records', () => {
  const draft = generateDraft('2025-02-03', [0, 1, 3, 5], { swim: 2, strength: 1, core: 1 });
  assert.deepEqual(
    draft.sessions.map((row) => [row.date, row.type]),
    [
      ['2025-02-03', 'swim'],
      ['2025-02-04', 'strength'],
      ['2025-02-06', 'core'],
      ['2025-02-08', 'swim'],
    ],
  );
  assert.ok(
    draft.sessions.every(
      (row) =>
        !row.completed &&
        row.discomfort === 'not-reported' &&
        row.minutes === null &&
        row.distance === null &&
        row.exercises.length === 0,
    ),
  );
  const profile = {
    initialWeight: 100,
    targetWeight: 80,
    startDate: '2025-01-01',
    heightCm: null,
    weeklyGoals: { swim: 2, swimMax: 3, strength: 1, core: 1 },
  };
  assert.deepEqual(weeklySummary(profile, [], draft.sessions, '2025-02-03').completed, {
    swim: 0,
    strength: 0,
    core: 0,
  });
});
test('empty, fractional, excessive or contradictory availability is rejected', () => {
  for (const [days, counts] of [
    [[], { swim: 1, strength: 0, core: 0 }],
    [[0], { swim: 2, strength: 0, core: 0 }],
    [[0, 0], { swim: 1, strength: 0, core: 0 }],
    [[7], { swim: 1, strength: 0, core: 0 }],
    [[0], { swim: 0.5, strength: 0, core: 0 }],
    [[0], { swim: 0, strength: 0, core: 0 }],
  ])
    assert.throws(() => generateDraft('2025-02-03', days, counts));
});
test('previous-week reuse copies calendar only, preserving no doses, pain or completed state', () => {
  const previous = [
    {
      ...plannedSession('2025-02-03', 'core'),
      completed: true,
      discomfort: 'present',
      minutes: 20,
      exercises: [{ name: 'Synthetic exercise', sets: 4, repetitions: '10' }],
      notes: 'Private synthetic observation',
    },
  ];
  const draft = repeatPreviousWeek('2025-02-10', previous);
  assert.equal(draft.sessions[0].date, '2025-02-10');
  assert.equal(draft.sessions[0].type, 'core');
  assert.equal(draft.sessions[0].completed, false);
  assert.equal(draft.sessions[0].discomfort, 'not-reported');
  assert.equal(draft.sessions[0].minutes, null);
  assert.deepEqual(draft.sessions[0].exercises, []);
  assert.ok(!draft.sessions[0].notes.includes('Private'));
  assert.throws(() => repeatPreviousWeek('2025-03-10', previous));
});
test('manual changes stay in the selected week with one block per day', () => {
  const draft = generateDraft('2025-02-03', [0, 2], { swim: 1, strength: 0, core: 1 });
  assert.throws(() =>
    validateDraft({ ...draft, sessions: [...draft.sessions, { ...draft.sessions[0] }] }),
  );
  assert.throws(() =>
    validateDraft({ ...draft, sessions: [{ ...draft.sessions[0], date: '2025-02-10' }] }),
  );
  assert.throws(() =>
    validateDraft({ ...draft, sessions: [{ ...draft.sessions[0], completed: true }] }),
  );
  assert.throws(() =>
    validateDraft({ ...draft, sessions: [{ ...draft.sessions[0], minutes: 25 }] }),
  );
  assert.throws(() => validateDraft({ ...draft, weekStart: '2025-02-04' }));
});
test('any existing session on the proposed day is a conflict, regardless of activity or completion', () => {
  const draft = generateDraft('2025-02-03', [0, 2], { swim: 1, strength: 0, core: 1 });
  const conflicts = planConflicts(draft, [
    { ...plannedSession('2025-02-03', 'strength'), completed: true },
  ]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].date, '2025-02-03');
});
