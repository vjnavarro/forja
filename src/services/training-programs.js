import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  decodeProgram,
  digest,
  encodeProgram,
  fingerprintSessions,
  programProposal,
  validateReview,
  validateTemplate,
} from '../domain/training.js';
import { shiftDate } from '../domain/planning.js';
import { weekBounds } from '../domain/transformation.js';
import { commitPlan } from './weekly-plans.js';

const root = (db, uid, id) => doc(db, 'users', uid, 'transformations', id);
async function weekRows(parent, start) {
  const result = await getDocs(
    query(
      collection(parent, 'sessions'),
      where('date', '>=', start),
      where('date', '<=', shiftDate(start, 6)),
    ),
  );
  return result.docs.map((row) => ({ ...row.data(), id: row.id }));
}
export async function saveTrainingTemplate(db, uid, id, value, original = null) {
  const parent = root(db, uid, id),
    ref = original ? doc(parent, 'templates', original.id) : doc(collection(parent, 'templates'));
  const template = validateTemplate(value);
  await runTransaction(db, async (tx) => {
    const current = original ? await tx.get(ref) : null;
    if (
      original &&
      (!current.exists() || current.data().updatedAt?.toMillis() !== original.updatedAt?.toMillis())
    )
      throw new Error('La plantilla ha cambiado. Vuelve a abrirla.');
    tx.set(ref, {
      ...template,
      createdAt: current ? current.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(parent, { updatedAt: serverTimestamp() });
  });
  return ref.id;
}
export async function saveTrainingProgram(db, uid, id, value) {
  const program = encodeProgram(value),
    parent = root(db, uid, id),
    batch = writeBatch(db);
  batch.set(doc(parent, 'private', 'program'), { ...program, updatedAt: serverTimestamp() });
  batch.update(parent, { updatedAt: serverTimestamp() });
  await batch.commit();
}
export async function saveTrainingReview(db, uid, id, start, input) {
  const parent = root(db, uid, id),
    ref = doc(parent, 'reviews', start);
  return runTransaction(db, async (tx) => {
    await tx.get(parent);
    const old = await tx.get(ref),
      rows = await weekRows(parent, start);
    const fingerprint = await fingerprintSessions(rows);
    if (fingerprint !== input.fingerprint)
      throw new Error(
        'Las sesiones han cambiado. Reabre la revisión para valorar los datos actuales.',
      );
    const review = validateReview(start, rows, input);
    tx.set(ref, {
      ...review,
      fingerprint,
      createdAt: old.exists() ? old.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(parent, { updatedAt: serverTimestamp() });
    return review;
  });
}
async function loadProposal(parent, date, read = (ref) => getDoc(ref)) {
  const start = weekBounds(date).start,
    programDoc = await read(doc(parent, 'private', 'program'));
  if (!programDoc.exists()) throw new Error('Guarda primero tu programación.');
  const program = decodeProgram(programDoc.data()),
    previousStart = shiftDate(start, -7);
  const needsReview = start !== program.startWeek;
  const reviewDoc = needsReview ? await read(doc(parent, 'reviews', previousStart)) : null;
  const review = reviewDoc?.exists() ? reviewDoc.data() : null;
  const previous = needsReview ? await weekRows(parent, previousStart) : [];
  if (needsReview && (!review || review.fingerprint !== (await fingerprintSessions(previous))))
    throw new Error(
      'Revisa y cierra la semana anterior con sus datos actuales antes de generar la propuesta.',
    );
  const templateDocs = program.templateIds.length
    ? await getDocs(
        query(collection(parent, 'templates'), where(documentId(), 'in', program.templateIds)),
      )
    : null;
  const templates = templateDocs?.docs.map((row) => ({ ...row.data(), id: row.id })) ?? [];
  if (templates.length !== program.templateIds.length)
    throw new Error('Alguna plantilla seleccionada ya no está disponible. Revisa la programación.');
  const proposal = programProposal(program, templates, start, review, previous);
  const token = await digest({
    program: programDoc.data(),
    templates: [...templates].sort((a, b) => a.id.localeCompare(b.id)),
    review,
    previous: await fingerprintSessions(previous),
  });
  return { ...proposal, token };
}
export function prepareTrainingProposal(db, uid, id, date) {
  return loadProposal(root(db, uid, id), date);
}
export function acceptTrainingProposal(db, uid, id, date, token) {
  return commitPlan(db, uid, id, async (tx, parent) => {
    const proposal = await loadProposal(parent, date, (ref) => tx.get(ref));
    if (proposal.token !== token)
      throw new Error(
        'La programación, las plantillas o la revisión han cambiado. Genera de nuevo la propuesta.',
      );
    return { draft: proposal.draft, preserveExisting: true };
  });
}
