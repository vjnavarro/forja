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
  const result = await commitPlan(db, uid, transformationId, async () => ({
    draft,
    preserveExisting: false,
  }));
  return result.created;
}
export async function commitPlan(db, uid, transformationId, prepare) {
  const parent = doc(db, 'users', uid, 'transformations', transformationId);
  const sessions = collection(parent, 'sessions');
  return runTransaction(db, async (tx) => {
    const transformation = await tx.get(parent);
    if (!transformation.exists()) throw new Error('La transformación ya no está disponible.');
    const prepared = await prepare(tx, parent),
      draft = validateDraft(prepared.draft);
    const target = doc(parent, 'plans', draft.weekStart),
      plan = await tx.get(target);
    // Every session write also updates the parent (enforced by rules). This read
    // makes the transaction retry if the queried calendar changes concurrently.
    const week = await getDocs(
      query(sessions, where('date', '>=', draft.weekStart), where('date', '<=', draft.weekEnd)),
    );
    if (
      !prepared.preserveExisting &&
      planConflicts(
        draft,
        week.docs.map((item) => item.data()),
      ).length
    )
      throw new Error(
        'Ya existe alguna de esas actividades en ese día. Revisa el borrador antes de guardarlo.',
      );
    const existingSlots = new Set(
      week.docs.map((item) => `${item.data().date}:${item.data().type}`),
    );
    const fresh = draft.sessions.filter((row) => !existingSlots.has(`${row.date}:${row.type}`));
    const refs = fresh.map((session) => doc(sessions, `week-${session.date}-${session.type}`));
    const existing = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (existing.some((snapshot) => snapshot.exists()))
      throw new Error('Ya existen sesiones de este plan. Revisa la semana.');
    if (!fresh.length) return { created: 0, preserved: draft.sessions.length };
    const ids = [
      ...new Set([...(plan.exists() ? plan.data().sessionIds : []), ...refs.map((ref) => ref.id)]),
    ];
    if (ids.length > 21)
      throw new Error('Esta semana ya contiene el máximo de actividades del plan.');
    tx.set(target, {
      version: 2,
      weekStart: draft.weekStart,
      weekEnd: draft.weekEnd,
      source: draft.source,
      sessionIds: ids,
      createdAt: plan.exists() ? plan.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    fresh.forEach((session, index) =>
      tx.set(refs[index], {
        ...session,
        origin: session.origin ?? {
          weekStart: draft.weekStart,
          templateId: '',
          title: '',
          focus: '',
          level: 0,
          edited: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    tx.update(parent, { updatedAt: serverTimestamp() });
    return { created: refs.length, preserved: draft.sessions.length - fresh.length };
  });
}
