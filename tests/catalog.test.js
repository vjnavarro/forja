import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { catalog, catalogSessionDraft, filterCatalogExercises } from '../src/domain/catalog.js';
import {
  validateCatalogReference,
  encodeCatalogReference,
  decodeCatalogReference,
} from '../src/domain/catalog-reference.js';
import { validateSession, weeklySummary } from '../src/domain/transformation.js';
import { fingerprintSessions } from '../src/domain/training.js';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const draft = (sessionId = 'SES-002') =>
  catalogSessionDraft({ sessionId, date: '2025-02-03', contextReviewed: true });

test('catalog release has exact canonical IDs, intact provenance and byte-identical approved images', () => {
  const { sha256, ...payload } = catalog;
  assert.equal(hash(JSON.stringify(payload)), sha256);
  assert.equal(catalog.exercises.length, 15);
  assert.equal(catalog.sessions.length, 3);
  assert.equal(catalog.source.repository, 'diglo-vnavarro/FORJA');
  assert.match(catalog.source.commit, /^[a-f0-9]{40}$/);
  assert.deepEqual(
    catalog.exercises.map((row) => row.identity.id),
    Array.from({ length: 15 }, (_, i) => `EX-${String(i + 1).padStart(3, '0')}`),
  );
  for (const exercise of catalog.exercises) {
    const image = readFileSync(new URL(`../public/${exercise.media.image}`, import.meta.url));
    assert.equal(hash(image), exercise.media.sha256);
    assert.equal(catalog.files[exercise.media.sourcePath], hash(image));
    assert.ok(catalog.files[exercise.traceability.sources[0]]);
  }
  assert.ok(
    Object.keys(catalog.files).every((file) =>
      /^(docs\/(05-exercises\/library|06-sessions)\/|assets\/exercises\/)/.test(file),
    ),
  );
});
test('catalog filtering combines accent-insensitive search, equipment and movement pattern', () => {
  assert.equal(filterCatalogExercises().length, 15);
  assert.ok(
    filterCatalogExercises({ query: 'EX-010' }).some((row) => row.identity.id === 'EX-010'),
  );
  assert.ok(
    filterCatalogExercises({
      query: 'traccion',
      equipment: 'resistanceBand',
      pattern: 'pull',
    }).some((row) => row.identity.id === 'EX-010'),
  );
  assert.equal(filterCatalogExercises({ query: 'ex-010', equipment: 'dumbbell' }).length, 0);
  assert.equal(filterCatalogExercises({ query: 'sin coincidencias' }).length, 0);
});
test('each selected session preserves its exact contextual tasks without inventing personal doses or completions', () => {
  for (const session of catalog.sessions) {
    const value = draft(session.identity.id);
    assert.equal(value.catalog.sessionId, session.identity.id);
    assert.equal(value.catalog.title, session.identity.name);
    assert.equal(value.catalog.sourcePath, session.traceability.sourcePath);
    assert.deepEqual(
      value.catalog.tasks.map((task) => task.prescription),
      session.blocks.flatMap((block) => block.tasks.map((task) => task.prescription)),
    );
    for (const block of session.blocks)
      for (const task of block.tasks) {
        assert.ok(value.catalog.guidance.includes(task.quality));
        for (const stop of task.stopCriteria) assert.ok(value.catalog.guidance.includes(stop));
      }
    assert.equal(value.catalog.referenceOnly, true);
    assert.equal(value.catalog.audience, 'youth');
    assert.equal(value.completed, false);
    assert.equal(value.discomfort, 'not-reported');
    assert.deepEqual(value.exercises, []);
    assert.equal(value.minutes, null);
    assert.equal(value.distance, null);
  }
  assert.throws(() =>
    catalogSessionDraft({ sessionId: 'SES-999', date: '2025-02-03', contextReviewed: true }),
  );
  assert.throws(() =>
    catalogSessionDraft({ sessionId: 'SES-002', date: '2025-02-03', contextReviewed: false }),
  );
  assert.throws(() =>
    catalogSessionDraft({ sessionId: 'SES-002', date: '2025-02-30', contextReviewed: true }),
  );
});
test('reference validation rejects forged approval, malformed provenance and partial or oversized tasks', () => {
  const original = draft().catalog;
  for (const change of [
    { referenceOnly: false },
    { release: [original.release] },
    { sessionId: ['SES-002'] },
    { sourcePath: 'javascript:alert(1)' },
    { tasks: [...original.tasks, ...original.tasks] },
    { tasks: [{ ...original.tasks[0], prescription: 'a'.repeat(2001) }] },
    { audience: 'adult' },
    { extra: true },
  ])
    assert.throws(() => validateCatalogReference({ ...original, ...change }));
  assert.throws(() => validateSession({ ...draft(), catalog: false }));
  const copy = validateCatalogReference(original);
  copy.tasks[0].name = 'Changed copy';
  assert.notEqual(copy.tasks[0].name, original.tasks[0].name);
});
test('weekly exports and fingerprints retain the source snapshot independently of personal exercise details', async () => {
  const value = { ...draft(), id: 's1' };
  const profile = {
    initialWeight: 90,
    targetWeight: 75,
    startDate: '2025-01-01',
    weeklyGoals: { swim: 2, swimMax: 3, strength: 0, core: 0 },
  };
  const summary = weeklySummary(profile, [], [value], '2025-02-03');
  assert.deepEqual(summary.sessions[0].catalog, value.catalog);
  assert.equal(summary.completed.strength, 0);
  const originalHash = await fingerprintSessions([value]);
  const altered = structuredClone(value);
  altered.catalog.tasks[0].prescription = 'Changed reference';
  assert.notEqual(await fingerprintSessions([altered]), originalHash);
  const { catalog: _source, ...legacy } = value;
  assert.equal(validateSession(legacy).catalog, undefined);
});

test('reference serialization round-trips with readable exports and rejects malformed columns', async () => {
  const value = draft().catalog;
  const encoded = encodeCatalogReference(value);
  assert.deepEqual(decodeCatalogReference(encoded), value);
  assert.deepEqual(decodeCatalogReference(value), value);
  assert.throws(() =>
    decodeCatalogReference({ ...encoded, tasks: { ...encoded.tasks, names: [] } }),
  );
  assert.throws(() =>
    decodeCatalogReference({
      ...encoded,
      tasks: { ...encoded.tasks, names: encoded.tasks.names.map(() => 5) },
    }),
  );
  assert.throws(() =>
    validateCatalogReference({ ...value, tasks: [{ ...value.tasks[0], name: 'a␟b' }] }),
  );
  assert.equal(
    await fingerprintSessions([{ ...draft(), id: 's1' }]),
    await fingerprintSessions([{ ...draft(), id: 's1', catalog: encoded }]),
  );
});
