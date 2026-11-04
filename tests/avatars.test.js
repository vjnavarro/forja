import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { avatarSprite, validateAppearance } from '../src/domain/avatars.js';
import { parseImport, validateProfile, calculateProgress } from '../src/domain/transformation.js';

test('legacy imports keep their three original figures; all six builds can be chosen independently', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/initial.json', import.meta.url)));
  const legacy = parseImport(fixture, fixture.ownerEmail).profile;
  assert.deepEqual(legacy.avatarStages, { start: 1, current: 2, target: 3 });
  for (const avatar of ['male', 'female', 'neutral']) {
    const stages = { start: 4, current: 5, target: 6 };
    const updated = validateProfile({ ...legacy, avatar, avatarStages: stages });
    assert.deepEqual(updated.avatarStages, stages);
    assert.equal(updated.avatar, avatar);
    assert.equal(updated.initialWeight, legacy.initialWeight);
    assert.deepEqual(
      calculateProgress(updated, fixture.weights),
      calculateProgress(legacy, fixture.weights),
    );
  }
  // No forced order: the same figure or a larger build may be chosen at any point.
  assert.deepEqual(
    validateAppearance({ avatar: 'male', avatarStages: { start: 6, current: 2, target: 2 } })
      .avatarStages,
    { start: 6, current: 2, target: 2 },
  );
});

test('malformed appearance data is rejected rather than silently replacing a saved selection', () => {
  for (const avatarStages of [
    null,
    [],
    {},
    { start: 1, current: 2 },
    { start: 0, current: 2, target: 3 },
    { start: 1, current: 7, target: 3 },
    { start: 1, current: 2, target: 1.5 },
    { start: 1, current: 2, target: '6' },
    { start: 1, current: 2, target: 3, unknown: true },
  ]) {
    assert.throws(() => validateAppearance({ avatar: 'female', avatarStages }));
  }
  assert.throws(() => validateAppearance({ avatar: 'unknown' }));
});

test('each of the twelve builds resolves to an existing sprite and the correct third', () => {
  for (const avatar of ['male', 'female']) {
    for (let level = 1; level <= 6; level++) {
      const sprite = avatarSprite(avatar, level);
      assert.ok(
        existsSync(new URL(`../public/images/transformation/${sprite.file}`, import.meta.url)),
      );
      assert.equal(sprite.position, `${((level - 1) % 3) * 50}% center`);
      assert.equal(sprite.file.includes('-light'), level > 3);
    }
  }
  assert.equal(avatarSprite('neutral', 6), null);
});
