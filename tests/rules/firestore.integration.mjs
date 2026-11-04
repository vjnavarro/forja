import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
let env;
const projectId = 'demo-forja';
const claims = (email) => ({
  email,
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
});
const profile = (uid) => ({
  ownerUid: uid,
  title: 'Prueba privada',
  initialWeight: 90,
  targetWeight: 75,
  startDate: '2025-01-01',
  dietStartDate: '',
  heightCm: null,
  sex: 'unspecified',
  avatar: 'neutral',
  weeklyGoals: { swim: 2, swimMax: 3, strength: 0, core: 0 },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
const weight = () => ({
  date: '2025-02-01',
  kg: 88,
  status: 'confirmed',
  note: 'Dato sintético',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
const db = (uid, email) => env.authenticatedContext(uid, claims(email)).firestore();
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore();
    await setDoc(doc(admin, 'members', 'one@example.test'), { enabled: true });
    await setDoc(doc(admin, 'members', 'two@example.test'), { enabled: true });
    await setDoc(doc(admin, 'users', 'one', 'transformations', 'first'), profile('one'));
    await setDoc(doc(admin, 'users', 'one', 'transformations', 'first', 'weights', 'w1'), weight());
  });
});
test('public and nonmember users cannot read private weights', async () => {
  await assertFails(
    getDoc(
      doc(
        env.unauthenticatedContext().firestore(),
        'users',
        'one',
        'transformations',
        'first',
        'weights',
        'w1',
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(
        db('one', 'outsider@example.test'),
        'users',
        'one',
        'transformations',
        'first',
        'weights',
        'w1',
      ),
    ),
  );
});
test('an allowed user can read only their own transformation and weight history', async () => {
  await assertSucceeds(
    getDocs(
      collection(
        db('one', 'one@example.test'),
        'users',
        'one',
        'transformations',
        'first',
        'weights',
      ),
    ),
  );
  await assertFails(
    getDoc(doc(db('two', 'two@example.test'), 'users', 'one', 'transformations', 'first')),
  );
  await assertFails(
    getDoc(
      doc(
        db('two', 'two@example.test'),
        'users',
        'one',
        'transformations',
        'first',
        'weights',
        'w1',
      ),
    ),
  );
});
test('a user cannot promote membership, list members or inspect another account membership', async () => {
  const one = db('one', 'one@example.test');
  await assertSucceeds(getDoc(doc(one, 'members', 'one@example.test')));
  await assertFails(getDocs(collection(one, 'members')));
  await assertFails(setDoc(doc(one, 'members', 'outsider@example.test'), { enabled: true }));
  await assertFails(getDoc(doc(one, 'members', 'two@example.test')));
});
test('verified email and Google provider are required', async () => {
  for (const claim of [
    { ...claims('one@example.test'), email_verified: false },
    { ...claims('one@example.test'), firebase: { sign_in_provider: 'password' } },
  ])
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('one', claim).firestore(),
          'users',
          'one',
          'transformations',
          'first',
        ),
      ),
    );
});
test('create transformation and initial measurement atomically, without forged ownership', async () => {
  const one = db('one', 'one@example.test');
  const batch = writeBatch(one);
  batch.set(doc(one, 'users', 'one', 'transformations', 'new'), profile('one'));
  batch.set(doc(one, 'users', 'one', 'transformations', 'new', 'weights', 'start'), weight());
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(doc(one, 'users', 'one', 'transformations', 'spoof'), profile('two')));
  await assertFails(setDoc(doc(one, 'users', 'two', 'transformations', 'spoof'), profile('one')));
});
test('malformed weights and attempts to change ownership are denied', async () => {
  const one = db('one', 'one@example.test');
  await assertFails(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'weights', 'bad'), {
      ...weight(),
      kg: -10,
    }),
  );
  await assertFails(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'weights', 'bad'), {
      ...weight(),
      status: 'invented',
    }),
  );
  await assertFails(
    updateDoc(doc(one, 'users', 'one', 'transformations', 'first'), {
      ownerUid: 'two',
      updatedAt: serverTimestamp(),
    }),
  );
});
test('owners can save six avatar builds on legacy profiles; invalid selections and cross-account edits are denied', async () => {
  const ref = doc(db('one', 'one@example.test'), 'users', 'one', 'transformations', 'first');
  const original = (await getDoc(ref)).data();
  for (const avatar of ['male', 'female', 'neutral']) {
    await assertSucceeds(
      updateDoc(ref, {
        avatar,
        avatarStages: { start: 4, current: 5, target: 6 },
        updatedAt: serverTimestamp(),
      }),
    );
  }
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
    await assertFails(updateDoc(ref, { avatarStages, updatedAt: serverTimestamp() }));
  }
  await assertFails(
    updateDoc(doc(db('two', 'two@example.test'), 'users', 'one', 'transformations', 'first'), {
      avatarStages: { start: 4, current: 5, target: 6 },
      updatedAt: serverTimestamp(),
    }),
  );
  const saved = (await getDoc(ref)).data();
  assert.equal(saved.initialWeight, original.initialWeight);
  assert.equal(saved.targetWeight, original.targetWeight);
  assert.deepEqual(saved.createdAt, original.createdAt);
  assert.deepEqual(saved.avatarStages, { start: 4, current: 5, target: 6 });
});
test('clinical context is separate and isolated by owner', async () => {
  const one = db('one', 'one@example.test');
  const context = {
    activityNotes: '',
    treatmentNotes: 'Contexto de prueba',
    lumbarNotes: '',
    medicalNotes: '',
    sourceNotes: '',
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'private', 'context'), context),
  );
  await assertFails(
    getDoc(
      doc(
        db('two', 'two@example.test'),
        'users',
        'one',
        'transformations',
        'first',
        'private',
        'context',
      ),
    ),
  );
});
test('revoking membership removes access to existing data', async () => {
  await env.withSecurityRulesDisabled((context) =>
    updateDoc(doc(context.firestore(), 'members', 'one@example.test'), { enabled: false }),
  );
  await assertFails(
    getDoc(doc(db('one', 'one@example.test'), 'users', 'one', 'transformations', 'first')),
  );
});

test('sessions validate every exercise and retain explicit completion and discomfort', async () => {
  const one = db('one', 'one@example.test');
  const session = {
    date: '2025-02-01',
    type: 'core',
    completed: false,
    minutes: null,
    distance: null,
    exercises: [{ name: 'Ejercicio sintético', sets: 1, repetitions: '5' }],
    discomfort: 'present',
    notes: 'Prueba',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', 'good'), session),
  );
  await assertSucceeds(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', 'six'), {
      ...session,
      exercises: Array.from({ length: 6 }, () => ({
        name: 'Ejercicio sintético',
        sets: 1,
        repetitions: '5',
      })),
    }),
  );
  await assertFails(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', 'bad'), {
      ...session,
      exercises: [{ name: { bad: true }, sets: -1, repetitions: '5' }],
    }),
  );
  await assertFails(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', 'bad'), {
      ...session,
      completed: 'yes',
    }),
  );
  await assertFails(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', 'too-many'), {
      ...session,
      exercises: Array.from({ length: 7 }, () => ({
        name: 'Ejercicio',
        sets: 1,
        repetitions: '5',
      })),
    }),
  );
});
