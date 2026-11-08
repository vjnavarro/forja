import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { shiftDate } from '../domain/planning.js';
import { digest, fingerprintSessions } from '../domain/training.js';
import { dateTime, weekBounds } from '../domain/transformation.js';

function weekStart(value) {
  if (!Number.isFinite(dateTime(value)) || weekBounds(value).start !== value)
    throw new Error('Selecciona el lunes de la semana que quieres eliminar.');
  return value;
}
async function resetSnapshot(parent, start, read = getDoc) {
  const refs = [
    doc(parent, 'plans', start),
    doc(parent, 'reviews', start),
    doc(parent, 'private', 'program'),
  ];
  const documents = await Promise.all(refs.map(read));
  const result = await getDocs(
    query(
      collection(parent, 'sessions'),
      where('date', '>=', start),
      where('date', '<=', shiftDate(start, 6)),
    ),
  );
  const rows = result.docs.map((row) => ({ ...row.data(), id: row.id }));
  const program = documents[2].exists() ? documents[2].data() : null;
  const token = await digest({
    sessions: await fingerprintSessions(rows),
    documents: documents.map((row) => (row.exists() ? row.data() : null)),
  });
  return { refs, documents, rows, program, token };
}
export async function prepareWeekReset(db, uid, id, date) {
  const start = weekStart(date),
    parent = doc(db, 'users', uid, 'transformations', id);
  const value = await resetSnapshot(parent, start);
  return {
    weekStart: start,
    weekEnd: shiftDate(start, 6),
    nextWeek: shiftDate(start, 7),
    count: value.rows.length,
    completed: value.rows.filter((row) => row.completed).length,
    canRestart: value.program?.startWeek === start,
    hasData: value.rows.length > 0 || value.documents[0].exists() || value.documents[1].exists(),
    token: value.token,
  };
}
export async function resetTrainingWeek(db, uid, id, date, { token, restartProgram = false }) {
  const start = weekStart(date),
    parent = doc(db, 'users', uid, 'transformations', id);
  return runTransaction(db, async (tx) => {
    const profile = await tx.get(parent);
    if (!profile.exists()) throw new Error('La transformación ya no está disponible.');
    const value = await resetSnapshot(parent, start, (ref) => tx.get(ref));
    if (value.token !== token)
      throw new Error(
        'La semana o su programación han cambiado. Cierra y revisa el borrado de nuevo.',
      );
    if (restartProgram && value.program?.startWeek !== start)
      throw new Error(
        'Solo se puede trasladar el inicio al eliminar la primera semana de la programación.',
      );
    if (value.rows.length > 400)
      throw new Error('Hay demasiados registros para eliminar la semana en una sola operación.');
    value.rows.forEach((row) => tx.delete(doc(parent, 'sessions', row.id)));
    value.documents.slice(0, 2).forEach((row, index) => {
      if (row.exists()) tx.delete(value.refs[index]);
    });
    if (restartProgram)
      tx.update(value.refs[2], { startWeek: shiftDate(start, 7), updatedAt: serverTimestamp() });
    tx.update(parent, { updatedAt: serverTimestamp() });
    return { deleted: value.rows.length, nextWeek: restartProgram ? shiftDate(start, 7) : start };
  });
}
export async function deleteTrainingSession(db, uid, id, original) {
  const parent = doc(db, 'users', uid, 'transformations', id),
    ref = doc(parent, 'sessions', original.id);
  return runTransaction(db, async (tx) => {
    const [profile, current] = await Promise.all([tx.get(parent), tx.get(ref)]);
    if (
      !profile.exists() ||
      !current.exists() ||
      current.data().updatedAt?.toMillis() !== original.updatedAt?.toMillis()
    )
      throw new Error('La actividad ha cambiado. Cierra y vuelve a revisar el borrado.');
    tx.delete(ref);
    tx.update(parent, { updatedAt: serverTimestamp() });
  });
}
