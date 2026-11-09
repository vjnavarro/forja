import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { encodeCatalogReference } from '../domain/catalog-reference.js';
import { validateSession } from '../domain/transformation.js';
export async function addCatalogSession(db, uid, id, input) {
  const value = validateSession(input);
  if (
    !value.catalog ||
    value.completed ||
    value.discomfort !== 'not-reported' ||
    value.exercises.length ||
    value.minutes !== null ||
    value.distance !== null
  )
    throw new Error('Añade la referencia pendiente de concretar, sin registros realizados.');
  const parent = doc(db, 'users', uid, 'transformations', id);
  const ref = doc(
    parent,
    'sessions',
    `catalog-${value.date}-${value.catalog.sessionId}-${value.catalog.release.slice(0, 12)}`,
  );
  return runTransaction(db, async (tx) => {
    const [profile, existing] = await Promise.all([tx.get(parent), tx.get(ref)]);
    if (!profile.exists()) throw new Error('La transformación ya no está disponible.');
    if (existing.exists())
      throw new Error(
        'Ya has añadido esta referencia en ese día. Puedes editarla desde el calendario.',
      );
    tx.set(ref, {
      ...value,
      catalog: encodeCatalogReference(value.catalog),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    tx.update(parent, { updatedAt: serverTimestamp() });
    return ref.id;
  });
}
