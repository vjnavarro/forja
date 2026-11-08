import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { planConflicts, validateDraft } from '../domain/planning.js';

export async function acceptWeeklyPlan(db, uid, transformationId, input) {
  const draft = validateDraft(input);
  const parent = doc(db, 'users', uid, 'transformations', transformationId);
  const target = doc(parent, 'plans', draft.weekStart);
  const sessions = collection(parent, 'sessions');
  const refs = draft.sessions.map((session) => doc(sessions, `week-${session.date}`));
  return runTransaction(db, async (tx) => {
    const [plan, transformation] = await Promise.all([tx.get(target), tx.get(parent)]);
    if (plan.exists())
      throw new Error('Esta semana ya tiene un plan aceptado. Puedes editar sus sesiones.');
    if (!transformation.exists()) throw new Error('La transformación ya no está disponible.');
    // Every session write also updates the parent (enforced by rules). This read
    // makes the transaction retry if the queried calendar changes concurrently.
    const week = await getDocs(
      query(sessions, where('date', '>=', draft.weekStart), where('date', '<=', draft.weekEnd)),
    );
    if (
      planConflicts(
        draft,
        week.docs.map((item) => item.data()),
      ).length
    )
      throw new Error(
        'Ya hay sesiones en alguno de esos días. Revisa el borrador antes de guardarlo.',
      );
    const existing = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (existing.some((snapshot) => snapshot.exists()))
      throw new Error('Ya existen sesiones de este plan. Revisa la semana.');
    tx.set(target, {
      weekStart: draft.weekStart,
      weekEnd: draft.weekEnd,
      source: draft.source,
      sessionIds: refs.map((ref) => ref.id),
      createdAt: serverTimestamp(),
    });
    draft.sessions.forEach((session, index) =>
      tx.set(refs[index], {
        ...session,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    tx.update(parent, { updatedAt: serverTimestamp() });
    return refs.length;
  });
}
