import test from 'node:test';
import assert from 'node:assert/strict';
import { weights } from '../src/demo.js';
import { formatWeight, getProgress, isValidWeight, normalizeDemo } from '../src/progress.js';
import { readDemo, saveDemo, resetDemo } from '../src/storage.js';

test('demo progress uses the actual distance from initial to target weight', () => {
  const result = getProgress(weights);
  assert.equal(result.current, 82.4);
  assert.equal(result.lost, 4);
  assert.equal(result.total, 8.4);
  assert.equal(result.remaining, 4.4);
  assert.equal(Math.round(result.progress), 48);
  assert.equal(result.nextMilestone.kg, 82);
  assert.deepEqual(
    result.milestones.filter((item) => item.reached).map((item) => item.kg),
    [84],
  );
});

test('reaching and passing the target caps progress and completes every milestone', () => {
  for (const kg of [78, 76.5]) {
    const result = getProgress([{ kg }]);
    assert.equal(result.progress, 100);
    assert.equal(result.remaining, 0);
    assert.equal(result.nextMilestone, undefined);
    assert.ok(result.milestones.every((item) => item.reached));
  }
});

test('weight gain stays distinguishable from loss and never gives negative progress', () => {
  const result = getProgress([{ kg: 90 }]);
  assert.equal(result.lost, -3.6);
  assert.equal(result.progress, 0);
  assert.equal(result.remaining, 12);
  assert.equal(result.nextMilestone.kg, 84);
  assert.ok(result.milestones.every((item) => !item.reached));
});

test('weight validation rejects corrupt, infinite and out-of-range values', () => {
  for (const value of [null, '82.4', NaN, Infinity, -4, 29.9, 250.1])
    assert.equal(isValidWeight(value), false);
  for (const value of [30, 82.4, 250]) assert.equal(isValidWeight(value), true);
  assert.equal(formatWeight(82.4), '82,4 kg');
});

test('previous demo storage is preserved, while invalid records and unknown sessions are removed', () => {
  assert.deepEqual(normalizeDemo({ weights, completed: ['swim-1', 'core-1'] }), {
    weights,
    completed: ['swim-1', 'core-1'],
  });
  assert.deepEqual(
    normalizeDemo({
      weights: [null, { kg: 'oops' }, { kg: 81.5 }],
      completed: ['swim-1', 'swim-1', 'unknown'],
    }),
    { weights: [{ week: 'Sem 1', kg: 81.5 }], completed: ['swim-1'] },
  );
  assert.deepEqual(normalizeDemo({ weights: [], completed: [] }), { completed: [] });
  for (const value of [null, false, [], 'invalid', { weights: [{}], completed: 'bad' }])
    assert.deepEqual(normalizeDemo(value), {});
});

test('storage round trip, malformed JSON, blocked storage and reset have safe outcomes', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    },
  });
  try {
    assert.equal(saveDemo({ weights, completed: [] }), true);
    assert.deepEqual(readDemo(), { weights, completed: [] });
    data.set('forja.demo.v1', 'not-json');
    assert.deepEqual(readDemo(), {});
    assert.equal(resetDemo(), true);
    assert.equal(data.size, 0);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage blocked');
      },
    });
    assert.deepEqual(readDemo(), {});
    assert.equal(saveDemo({ weights }), false);
    assert.equal(resetDemo(), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
