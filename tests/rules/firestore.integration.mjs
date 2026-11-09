import {
  encodeCatalogReference,
  decodeCatalogReference,
} from '../../src/domain/catalog-reference.js';
import { addCatalogSession } from '../../src/services/catalog-sessions.js';
import { catalog, catalogSessionDraft } from '../../src/domain/catalog.js';
import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { acceptWeeklyPlan } from '../../src/services/weekly-plans.js';
import { generateDraft, plannedSession } from '../../src/domain/planning.js';
import {
  saveTrainingTemplate,
  saveTrainingProgram,
  saveTrainingReview,
  prepareTrainingProposal,
  acceptTrainingProposal,
} from '../../src/services/training-programs.js';
import { fingerprintSessions } from '../../src/domain/training.js';
import {
  prepareWeekReset,
  resetTrainingWeek,
  deleteTrainingSession,
} from '../../src/services/week-maintenance.js';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
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
function writeSession(database, id, data) {
  const batch = writeBatch(database);
  batch.set(doc(database, 'users', 'one', 'transformations', 'first', 'sessions', id), data);
  batch.update(doc(database, 'users', 'one', 'transformations', 'first'), {
    updatedAt: serverTimestamp(),
  });
  return batch.commit();
}
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
  await assertSucceeds(writeSession(one, 'good', session));
  await assertSucceeds(
    writeSession(one, 'six', {
      ...session,
      exercises: Array.from({ length: 6 }, () => ({
        name: 'Ejercicio sintético',
        sets: 1,
        repetitions: '5',
      })),
    }),
  );
  await assertFails(
    writeSession(one, 'bad', {
      ...session,
      exercises: [{ name: { bad: true }, sets: -1, repetitions: '5' }],
    }),
  );
  await assertFails(writeSession(one, 'bad', { ...session, completed: 'yes' }));
  await assertFails(
    writeSession(one, 'too-many', {
      ...session,
      exercises: Array.from({ length: 7 }, () => ({
        name: 'Ejercicio',
        sets: 1,
        repetitions: '5',
      })),
    }),
  );
});

test('accepting a seven-slot plan is atomic, private and stores only uncompleted undosed sessions', async () => {
  const one = db('one', 'one@example.test');
  const draft = generateDraft('2025-02-03', [0, 1, 2, 3, 4, 5, 6], {
    swim: 3,
    strength: 2,
    core: 2,
  });
  assert.equal(await acceptWeeklyPlan(one, 'one', 'first', draft), 7);
  const plan = doc(one, 'users', 'one', 'transformations', 'first', 'plans', '2025-02-03');
  assert.equal((await getDoc(plan)).data().sessionIds.length, 7);
  const sessions = await getDocs(
    collection(one, 'users', 'one', 'transformations', 'first', 'sessions'),
  );
  assert.equal(sessions.size, 7);
  assert.ok(
    sessions.docs.every(
      (row) => row.data().completed === false && row.data().exercises.length === 0,
    ),
  );
  await assertFails(
    getDoc(
      doc(
        db('two', 'two@example.test'),
        'users',
        'one',
        'transformations',
        'first',
        'plans',
        '2025-02-03',
      ),
    ),
  );
  await assertFails(acceptWeeklyPlan(db('two', 'two@example.test'), 'one', 'first', draft));
  await assertFails(updateDoc(plan, { source: 'manual' }));
});
test('simultaneous acceptance does not duplicate or replace a plan', async () => {
  const one = db('one', 'one@example.test');
  const draft = generateDraft('2025-02-03', [0, 2], { swim: 1, strength: 0, core: 1 });
  const results = await Promise.allSettled([
    acceptWeeklyPlan(one, 'one', 'first', draft),
    acceptWeeklyPlan(one, 'one', 'first', draft),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    (await getDocs(collection(one, 'users', 'one', 'transformations', 'first', 'sessions'))).size,
    2,
  );
  const session = doc(
    one,
    'users',
    'one',
    'transformations',
    'first',
    'sessions',
    'week-2025-02-03-swim',
  );
  const batch = writeBatch(one);
  batch.update(session, { completed: true, updatedAt: serverTimestamp() });
  batch.update(doc(one, 'users', 'one', 'transformations', 'first'), {
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  await assert.rejects(acceptWeeklyPlan(one, 'one', 'first', draft));
  assert.equal((await getDoc(session)).data().completed, true);
});
test('existing sessions are preserved and malformed or incomplete plan writes are denied', async () => {
  const one = db('one', 'one@example.test');
  await writeSession(one, 'manual', {
    ...plannedSession('2025-02-03', 'swim'),
    completed: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assert.rejects(
    acceptWeeklyPlan(
      one,
      'one',
      'first',
      generateDraft('2025-02-03', [0], { swim: 1, strength: 0, core: 0 }),
    ),
    /Ya existe alguna/,
  );
  assert.equal(
    (await getDocs(collection(one, 'users', 'one', 'transformations', 'first', 'sessions'))).size,
    1,
  );
  const plan = doc(one, 'users', 'one', 'transformations', 'first', 'plans', '2025-02-10');
  for (const data of [
    {
      weekStart: '2025-02-10',
      weekEnd: '2025-02-16',
      source: 'availability',
      sessionIds: ['week-2025-02-10-0'],
    },
    { weekStart: '2025-02-10', weekEnd: '2025-02-17', source: 'availability', sessionIds: [] },
    { weekStart: '2025-02-10', weekEnd: '2025-02-16', source: 'unknown', sessionIds: [] },
  ]) {
    const batch = writeBatch(one);
    batch.set(plan, { ...data, createdAt: serverTimestamp() });
    batch.update(doc(one, 'users', 'one', 'transformations', 'first'), {
      updatedAt: serverTimestamp(),
    });
    await assertFails(batch.commit());
  }
  await assertFails(
    setDoc(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', 'untracked'), {
      ...plannedSession('2025-02-10', 'swim'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});

test('a complete combined week supports 21 activities without duplicate days/types or rule limits', async () => {
  const one = db('one', 'one@example.test');
  const draft = generateDraft('2025-03-03', [0, 1, 2, 3, 4, 5, 6], {
    swim: 7,
    strength: 7,
    core: 7,
  });
  assert.equal(await acceptWeeklyPlan(one, 'one', 'first', draft), 21);
  const rows = await getDocs(
    collection(one, 'users', 'one', 'transformations', 'first', 'sessions'),
  );
  assert.equal(rows.size, 21);
  const plan = doc(one, 'users', 'one', 'transformations', 'first', 'plans', '2025-03-03');
  assert.equal((await getDoc(plan)).data().version, 2);
  const batch = writeBatch(one);
  batch.update(plan, { sessionIds: [], updatedAt: serverTimestamp() });
  batch.update(doc(one, 'users', 'one', 'transformations', 'first'), {
    updatedAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
});

const templateData = (title, level = 1) => ({
  title,
  focus: `Enfoque sintético ${title}`,
  level,
  type: 'core',
  minutes: 5 * level,
  distance: null,
  source: 'Pauta sintética de pruebas',
  exercises: Array.from({ length: 6 }, (_, index) => ({
    name: `Ejercicio sintético ${index}`,
    sets: level,
    repetitions: '5 de prueba',
  })),
});
async function trainingSetup(one) {
  const a = await saveTrainingTemplate(one, 'one', 'first', templateData('A'));
  const b = await saveTrainingTemplate(one, 'one', 'first', templateData('B'));
  const c = await saveTrainingTemplate(one, 'one', 'first', templateData('C', 2));
  await saveTrainingProgram(one, 'one', 'first', {
    startWeek: '2025-02-03',
    weeks: 4,
    schedule: [
      { day: 0, type: 'swim' },
      { day: 0, type: 'core' },
      { day: 3, type: 'core' },
    ],
    templateIds: [a, b, c],
  });
  const proposal = await prepareTrainingProposal(one, 'one', 'first', '2025-02-03');
  await acceptTrainingProposal(one, 'one', 'first', '2025-02-03', proposal.token);
  return { a, b, c };
}
async function completeTrainingWeek(one, pain = false) {
  const rows = await getDocs(
    collection(one, 'users', 'one', 'transformations', 'first', 'sessions'),
  );
  const batch = writeBatch(one);
  rows.docs.forEach((row, index) =>
    batch.update(row.ref, {
      completed: true,
      discomfort: pain && index === 0 ? 'present' : 'none',
      updatedAt: serverTimestamp(),
    }),
  );
  batch.update(doc(one, 'users', 'one', 'transformations', 'first'), {
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return (
    await getDocs(collection(one, 'users', 'one', 'transformations', 'first', 'sessions'))
  ).docs.map((row) => ({ ...row.data(), id: row.id }));
}
test('template rotation, recurring program and reviewed progression persist privately without new services', async () => {
  const one = db('one', 'one@example.test');
  await trainingSetup(one);
  const rows = await completeTrainingWeek(one);
  assert.equal(rows.length, 3);
  assert.ok(rows.filter((row) => row.type === 'core').every((row) => row.exercises.length === 6));
  await saveTrainingReview(one, 'one', 'first', '2025-02-03', {
    fingerprint: await fingerprintSessions(rows),
    wellbeing: 'good',
    discomfort: 'none',
    decision: 'increase',
    notes: '',
  });
  const next = await prepareTrainingProposal(one, 'one', 'first', '2025-02-10');
  assert.ok(
    next.draft.sessions.filter((row) => row.type === 'core').every((row) => row.origin.level === 2),
  );
  const result = await acceptTrainingProposal(one, 'one', 'first', '2025-02-10', next.token);
  assert.equal(result.created, 3);
  const again = await acceptTrainingProposal(one, 'one', 'first', '2025-02-10', next.token);
  assert.equal(again.created, 0);
  assert.equal(again.preserved, 3);
  const two = db('two', 'two@example.test');
  for (const [type, id] of [
    ['templates', rows.find((row) => row.origin.templateId).origin.templateId],
    ['private', 'program'],
    ['reviews', '2025-02-03'],
  ])
    await assertFails(getDoc(doc(two, 'users', 'one', 'transformations', 'first', type, id)));
});
test('new session records invalidate a review; new template versions invalidate an unaccepted proposal', async () => {
  const one = db('one', 'one@example.test');
  const { a } = await trainingSetup(one);
  const rows = await completeTrainingWeek(one),
    oldHash = await fingerprintSessions(rows);
  const first = rows[0];
  const change = writeBatch(one);
  change.update(doc(one, 'users', 'one', 'transformations', 'first', 'sessions', first.id), {
    notes: 'Cambio concurrente sintético',
    updatedAt: serverTimestamp(),
  });
  change.update(doc(one, 'users', 'one', 'transformations', 'first'), {
    updatedAt: serverTimestamp(),
  });
  await change.commit();
  await assert.rejects(
    saveTrainingReview(one, 'one', 'first', '2025-02-03', {
      fingerprint: oldHash,
      wellbeing: 'good',
      discomfort: 'none',
      decision: 'maintain',
      notes: '',
    }),
    /han cambiado/,
  );
  const fresh = (
    await getDocs(collection(one, 'users', 'one', 'transformations', 'first', 'sessions'))
  ).docs.map((row) => ({ ...row.data(), id: row.id }));
  await saveTrainingReview(one, 'one', 'first', '2025-02-03', {
    fingerprint: await fingerprintSessions(fresh),
    wellbeing: 'good',
    discomfort: 'none',
    decision: 'maintain',
    notes: '',
  });
  const proposal = await prepareTrainingProposal(one, 'one', 'first', '2025-02-10');
  const original = {
    ...(await getDoc(doc(one, 'users', 'one', 'transformations', 'first', 'templates', a))).data(),
    id: a,
  };
  await saveTrainingTemplate(one, 'one', 'first', { ...original, title: 'A ajustada' }, original);
  await assert.rejects(
    acceptTrainingProposal(one, 'one', 'first', '2025-02-10', proposal.token),
    /han cambiado/,
  );
  assert.equal(
    (await getDocs(collection(one, 'users', 'one', 'transformations', 'first', 'sessions'))).size,
    3,
  );
});
test('reported discomfort blocks increases even with a favourable report and retains undosed next-week blocks', async () => {
  const one = db('one', 'one@example.test');
  await trainingSetup(one);
  const rows = await completeTrainingWeek(one, true),
    fingerprint = await fingerprintSessions(rows);
  await assert.rejects(
    saveTrainingReview(one, 'one', 'first', '2025-02-03', {
      fingerprint,
      wellbeing: 'good',
      discomfort: 'none',
      decision: 'increase',
      notes: '',
    }),
    /No se propone/,
  );
  await saveTrainingReview(one, 'one', 'first', '2025-02-03', {
    fingerprint,
    wellbeing: 'mixed',
    discomfort: 'present',
    decision: 'maintain',
    notes: '',
  });
  const next = await prepareTrainingProposal(one, 'one', 'first', '2025-02-10');
  assert.ok(
    next.draft.sessions.every(
      (row) =>
        row.exercises.length === 0 &&
        row.minutes === null &&
        row.distance === null &&
        !row.completed,
    ),
  );
  await acceptTrainingProposal(one, 'one', 'first', '2025-02-10', next.token);
});
test('legacy accepted plans can receive another activity on the same day without losing their references', async () => {
  const one = db('one', 'one@example.test'),
    parent = doc(one, 'users', 'one', 'transformations', 'first');
  const batch = writeBatch(one);
  batch.set(doc(parent, 'sessions', 'week-2025-02-03'), {
    ...plannedSession('2025-02-03', 'swim'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(parent, 'plans', '2025-02-03'), {
    weekStart: '2025-02-03',
    weekEnd: '2025-02-09',
    source: 'availability',
    sessionIds: ['week-2025-02-03'],
    createdAt: serverTimestamp(),
  });
  batch.update(parent, { updatedAt: serverTimestamp() });
  await batch.commit();
  assert.equal(
    await acceptWeeklyPlan(
      one,
      'one',
      'first',
      generateDraft('2025-02-03', [0], { swim: 0, strength: 0, core: 1 }),
    ),
    1,
  );
  const saved = (await getDoc(doc(parent, 'plans', '2025-02-03'))).data();
  assert.equal(saved.version, 2);
  assert.deepEqual(saved.sessionIds, ['week-2025-02-03', 'week-2025-02-03-core']);
  assert.equal((await getDoc(doc(parent, 'sessions', 'week-2025-02-03'))).data().type, 'swim');
});
test('program limits accept twelve templates and all combined days; malformed schedules and plan IDs are denied', async () => {
  const one = db('one', 'one@example.test'),
    parent = doc(one, 'users', 'one', 'transformations', 'first');
  const ids = [];
  for (let index = 0; index < 12; index++)
    ids.push(
      await saveTrainingTemplate(one, 'one', 'first', {
        ...templateData(`T${index}`),
        exercises: [{ name: 'Ejercicio sintético', sets: 1, repetitions: '5' }],
      }),
    );
  const schedule = Array.from({ length: 7 }, (_, day) =>
    ['swim', 'strength', 'core'].map((type) => ({ day, type })),
  ).flat();
  await saveTrainingProgram(one, 'one', 'first', {
    startWeek: '2025-02-03',
    weeks: 12,
    schedule,
    templateIds: ids,
  });
  assert.equal((await getDoc(doc(parent, 'private', 'program'))).data().templateIds.length, 12);
  const bad = writeBatch(one);
  bad.set(doc(parent, 'private', 'program'), {
    startWeek: '2025-02-03',
    weeks: 4,
    schedule: { '8-core': true },
    templateIds: [],
    updatedAt: serverTimestamp(),
  });
  bad.update(parent, { updatedAt: serverTimestamp() });
  await assertFails(bad.commit());
  for (const sessionIds of [
    [42],
    ['week-2025-02-03-swim/week-2025-02-04-core'],
    ['../other'],
    [{ id: 'fake' }],
  ]) {
    const b = writeBatch(one);
    b.set(doc(parent, 'plans', '2025-02-03'), {
      version: 2,
      weekStart: '2025-02-03',
      weekEnd: '2025-02-09',
      source: 'program',
      sessionIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    b.update(parent, { updatedAt: serverTimestamp() });
    await assertFails(b.commit());
  }
});

test('reset first week removes only its activities, plan and review and moves program start atomically', async () => {
  const one = db('one', 'one@example.test');
  await trainingSetup(one);
  const rows = await completeTrainingWeek(one);
  await saveTrainingReview(one, 'one', 'first', '2025-02-03', {
    wellbeing: 'good',
    discomfort: 'none',
    decision: 'maintain',
    notes: '',
    fingerprint: await fingerprintSessions(rows),
  });
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  await writeSession(one, 'outside', {
    ...plannedSession('2025-02-10', 'swim'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // A generated activity moved outside the deleted week must also survive.
  const moved = rows[0].id;
  const move = writeBatch(one);
  move.update(doc(parent, 'sessions', moved), { date: '2025-02-11', updatedAt: serverTimestamp() });
  move.update(parent, { updatedAt: serverTimestamp() });
  await move.commit();
  const beforeProgram = (await getDoc(doc(parent, 'private', 'program'))).data();
  const preview = await prepareWeekReset(one, 'one', 'first', '2025-02-03');
  assert.equal(preview.count, 2);
  assert.equal(preview.completed, 2);
  assert.equal(preview.canRestart, true);
  const result = await resetTrainingWeek(one, 'one', 'first', '2025-02-03', {
    token: preview.token,
    restartProgram: true,
  });
  assert.deepEqual(result, { deleted: 2, nextWeek: '2025-02-10' });
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 2);
  assert.equal((await getDoc(doc(parent, 'sessions', moved))).exists(), true);
  assert.equal((await getDoc(doc(parent, 'sessions', 'outside'))).exists(), true);
  assert.equal((await getDoc(doc(parent, 'plans', '2025-02-03'))).exists(), false);
  assert.equal((await getDoc(doc(parent, 'reviews', '2025-02-03'))).exists(), false);
  assert.equal((await getDocs(collection(parent, 'weights'))).size, 1);
  assert.equal((await getDocs(collection(parent, 'templates'))).size, 3);
  const program = (await getDoc(doc(parent, 'private', 'program'))).data();
  assert.equal(program.startWeek, '2025-02-10');
  assert.equal(program.weeks, beforeProgram.weeks);
  assert.deepEqual(program.schedule, beforeProgram.schedule);
  assert.deepEqual(program.templateIds, beforeProgram.templateIds);
  // New first week bypasses the obsolete requirement to review the deleted one.
  const proposal = await prepareTrainingProposal(one, 'one', 'first', '2025-02-10');
  assert.equal(proposal.cycleWeek, 1);
});
test('week reset rejects stale sessions or program changes without partially deleting data', async () => {
  const one = db('one', 'one@example.test');
  await trainingSetup(one);
  const preview = await prepareWeekReset(one, 'one', 'first', '2025-02-03');
  await writeSession(one, 'later', {
    ...plannedSession('2025-02-05', 'swim'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await assert.rejects(
    resetTrainingWeek(one, 'one', 'first', '2025-02-03', {
      token: preview.token,
      restartProgram: true,
    }),
    /han cambiado/,
  );
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 4);
  const fresh = await prepareWeekReset(one, 'one', 'first', '2025-02-03');
  const batch = writeBatch(one);
  batch.update(doc(parent, 'private', 'program'), { weeks: 5, updatedAt: serverTimestamp() });
  batch.update(parent, { updatedAt: serverTimestamp() });
  await batch.commit();
  await assert.rejects(
    resetTrainingWeek(one, 'one', 'first', '2025-02-03', {
      token: fresh.token,
      restartProgram: true,
    }),
    /han cambiado/,
  );
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 4);
});
test('owners can clear a full 21-activity week and recreate it; deletion requires ownership and parent stamp', async () => {
  const one = db('one', 'one@example.test'),
    other = db('two', 'two@example.test');
  const draft = generateDraft('2025-02-03', [0, 1, 2, 3, 4, 5, 6], {
    swim: 7,
    strength: 7,
    core: 7,
  });
  await acceptWeeklyPlan(one, 'one', 'first', draft);
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  const ref = doc(parent, 'sessions', 'week-2025-02-03-swim');
  await assertFails(deleteDoc(ref));
  const unauthorized = writeBatch(other);
  unauthorized.delete(doc(other, ref.path));
  unauthorized.update(doc(other, parent.path), { updatedAt: serverTimestamp() });
  await assertFails(unauthorized.commit());
  const preview = await prepareWeekReset(one, 'one', 'first', '2025-02-03');
  assert.equal(preview.canRestart, false);
  await assert.rejects(
    resetTrainingWeek(one, 'one', 'first', '2025-02-03', {
      token: preview.token,
      restartProgram: true,
    }),
    /primera semana/,
  );
  await resetTrainingWeek(one, 'one', 'first', '2025-02-03', { token: preview.token });
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 0);
  assert.equal(await acceptWeeklyPlan(one, 'one', 'first', draft), 21);
});
test('deleting a single activity rejects stale versions and leaves sibling activities reusable', async () => {
  const one = db('one', 'one@example.test');
  await acceptWeeklyPlan(
    one,
    'one',
    'first',
    generateDraft('2025-02-03', [0], { swim: 1, strength: 1, core: 1 }),
  );
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  const ref = doc(parent, 'sessions', 'week-2025-02-03-swim');
  const original = { ...(await getDoc(ref)).data(), id: ref.id };
  const change = writeBatch(one);
  change.update(ref, { completed: true, updatedAt: serverTimestamp() });
  change.update(parent, { updatedAt: serverTimestamp() });
  await change.commit();
  await assert.rejects(deleteTrainingSession(one, 'one', 'first', original), /ha cambiado/);
  await deleteTrainingSession(one, 'one', 'first', { ...(await getDoc(ref)).data(), id: ref.id });
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 2);
  assert.equal(
    await acceptWeeklyPlan(
      one,
      'one',
      'first',
      generateDraft('2025-02-03', [0], { swim: 1, strength: 0, core: 0 }),
    ),
    1,
  );
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 3);
});

test('proposal outside program dates reports the period instead of demanding an unrelated review', async () => {
  const one = db('one', 'one@example.test');
  await trainingSetup(one);
  for (const date of ['2025-01-27', '2025-03-03'])
    await assert.rejects(
      prepareTrainingProposal(one, 'one', 'first', date),
      /fuera del periodo.*03\/02\/2025/,
    );
});

test('canonical references store contextual snapshots privately with empty personal doses and preserve the source on edits', async () => {
  const one = db('one', 'one@example.test');
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  for (const session of catalog.sessions) {
    const value = catalogSessionDraft({
      sessionId: session.identity.id,
      date: '2025-02-03',
      contextReviewed: true,
    });
    const id = await addCatalogSession(one, 'one', 'first', value);
    const ref = doc(parent, 'sessions', id),
      stored = (await getDoc(ref)).data();
    assert.deepEqual(decodeCatalogReference(stored.catalog), value.catalog);
    assert.equal(stored.completed, false);
    assert.deepEqual(stored.exercises, []);
    const edit = writeBatch(one);
    edit.update(ref, {
      notes: 'Registro personal sintético',
      exercises: [{ name: 'Pauta propia sintética', sets: 1, repetitions: '5' }],
      updatedAt: serverTimestamp(),
    });
    edit.update(parent, { updatedAt: serverTimestamp() });
    await assertSucceeds(edit.commit());
    assert.deepEqual(decodeCatalogReference((await getDoc(ref)).data().catalog), value.catalog);
    const altered = writeBatch(one);
    altered.update(ref, {
      catalog: { ...stored.catalog, title: 'Cambiar la fuente' },
      updatedAt: serverTimestamp(),
    });
    altered.update(parent, { updatedAt: serverTimestamp() });
    await assertFails(altered.commit());
  }
  assert.equal((await getDocs(collection(parent, 'sessions'))).size, 3);
  const other = db('two', 'two@example.test');
  await assertFails(getDocs(collection(other, parent.path, 'sessions')));
  await assert.rejects(
    addCatalogSession(
      other,
      'one',
      'first',
      catalogSessionDraft({ sessionId: 'SES-001', date: '2025-02-04', contextReviewed: true }),
    ),
  );
});
test('concurrent calendar reference acceptance prevents duplicates and does not replace an existing record', async () => {
  const one = db('one', 'one@example.test');
  const value = catalogSessionDraft({
    sessionId: 'SES-002',
    date: '2025-02-03',
    contextReviewed: true,
  });
  const attempts = await Promise.allSettled([
    addCatalogSession(one, 'one', 'first', value),
    addCatalogSession(one, 'one', 'first', value),
  ]);
  assert.equal(attempts.filter((row) => row.status === 'fulfilled').length, 1);
  const rows = await getDocs(
    collection(one, 'users', 'one', 'transformations', 'first', 'sessions'),
  );
  assert.equal(rows.size, 1);
  assert.deepEqual(decodeCatalogReference(rows.docs[0].data().catalog), value.catalog);
  await assert.rejects(
    addCatalogSession(one, 'one', 'first', { ...value, completed: true }),
    /sin registros realizados/,
  );
});
test('catalog rules reject malformed or unbounded snapshots and accept full references beside six personal records', async () => {
  const one = db('one', 'one@example.test');
  const value = catalogSessionDraft({
    sessionId: 'SES-001',
    date: '2025-02-03',
    contextReviewed: true,
  });
  const taskList = [...value.catalog.tasks, { ...value.catalog.tasks[0], key: 'sixth-valid-task' }];
  const source = encodeCatalogReference({ ...value.catalog, tasks: taskList });
  const stamped = {
    ...value,
    catalog: source,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(writeSession(one, 'six-catalog-tasks', stamped));
  await assertSucceeds(
    writeSession(one, 'historical-catalog-with-six-recorded-exercises', {
      ...stamped,
      completed: true,
      exercises: Array.from({ length: 6 }, () => ({
        name: 'Registro sintético',
        sets: 1,
        repetitions: '5',
      })),
    }),
  );
  for (const [index, change] of [
    { referenceOnly: false },
    { guidance: 'x'.repeat(40001) },
    { tasks: { ...source.tasks, names: [5] } },
    { tasks: { ...source.tasks, names: Array(6).fill(5) } },
    { tasks: { ...source.tasks, names: ['', ...source.tasks.names.slice(1)] } },
    { tasks: { ...source.tasks, prescriptions: ['', ...source.tasks.prescriptions.slice(1)] } },
    { tasks: { ...source.tasks, taskKeys: Array(6).fill('duplicate') } },
    { tasks: { ...source.tasks, prescriptions: Array(6).fill('x'.repeat(2001)) } },
    { tasks: { ...source.tasks, names: Array(6).fill('a␟b') } },
    { sourcePath: 'https://example.test/forged' },
    { release: ['x'] },
    { tasks: { ...source.tasks, taskKeys: [...source.tasks.taskKeys, 'seventh'] } },
  ].entries())
    await assertFails(
      writeSession(one, `bad-catalog-${index}`, { ...stamped, catalog: { ...source, ...change } }),
    );
});

test('session validation still rejects every missing required field and cannot insert a reference through an update', async () => {
  const one = db('one', 'one@example.test');
  const value = {
    ...plannedSession('2025-02-03', 'core'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  for (const field of [
    'date',
    'type',
    'completed',
    'minutes',
    'distance',
    'exercises',
    'discomfort',
    'notes',
    'createdAt',
    'updatedAt',
  ]) {
    const missing = { ...value };
    delete missing[field];
    await assertFails(writeSession(one, `missing-${field}`, missing));
  }
  await writeSession(one, 'manual-to-update', value);
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  const update = writeBatch(one);
  update.update(doc(parent, 'sessions', 'manual-to-update'), {
    catalog: encodeCatalogReference(
      catalogSessionDraft({ sessionId: 'SES-001', date: '2025-02-03', contextReviewed: true })
        .catalog,
    ),
    updatedAt: serverTimestamp(),
  });
  update.update(parent, { updatedAt: serverTimestamp() });
  await assertFails(update.commit());
});
test('weekly review fingerprints match decoded UI references and encoded Firestore storage', async () => {
  const one = db('one', 'one@example.test');
  await addCatalogSession(
    one,
    'one',
    'first',
    catalogSessionDraft({ sessionId: 'SES-002', date: '2025-02-03', contextReviewed: true }),
  );
  const parent = doc(one, 'users', 'one', 'transformations', 'first');
  const rows = (await getDocs(collection(parent, 'sessions'))).docs.map((row) => ({
    ...row.data(),
    id: row.id,
  }));
  const ui = rows.map((row) => ({ ...row, catalog: decodeCatalogReference(row.catalog) }));
  const fingerprint = await fingerprintSessions(ui);
  await assertSucceeds(
    saveTrainingReview(one, 'one', 'first', '2025-02-03', {
      fingerprint,
      wellbeing: 'mixed',
      discomfort: 'unknown',
      decision: 'maintain',
      notes: '',
    }),
  );
  assert.equal(
    (await getDoc(doc(parent, 'reviews', '2025-02-03'))).data().fingerprint,
    fingerprint,
  );
});
