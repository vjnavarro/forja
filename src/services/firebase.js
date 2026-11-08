import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  connectFirestoreEmulator,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import {
  parseImport,
  validateProfile,
  validateWeight,
  validateSession,
} from '../domain/transformation.js';

import { cloudConfigured, useEmulators } from './config.js';
import { validateAppearance } from '../domain/avatars.js';
import { acceptWeeklyPlan } from './weekly-plans.js';
import { decodeProgram } from '../domain/training.js';
import {
  saveTrainingTemplate,
  saveTrainingProgram,
  saveTrainingReview,
  prepareTrainingProposal,
  acceptTrainingProposal,
} from './training-programs.js';
let instance;
let pending;
export function getCloud() {
  if (!pending)
    pending = initializeCloud().catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}
async function initializeCloud() {
  if (instance) return instance;
  if (!cloudConfigured) throw new Error('El acceso privado aún no está activado.');
  const existing = getApps().some((app) => app.name === '[DEFAULT]');
  const app = existing
    ? getApp()
    : initializeApp({
        apiKey: useEmulators ? 'demo-forja-key' : import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: useEmulators
          ? 'demo-forja.firebaseapp.com'
          : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: useEmulators ? 'demo-forja' : import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: useEmulators ? 'demo-forja-app' : import.meta.env.VITE_FIREBASE_APP_ID,
      });
  const auth = getAuth(app);
  const db = existing
    ? getFirestore(app)
    : initializeFirestore(app, { localCache: memoryLocalCache() });
  if (useEmulators && !existing) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  await setPersistence(auth, browserSessionPersistence);
  const root = (uid) => collection(db, 'users', uid, 'transformations');
  const trans = (uid, id) => doc(root(uid), id);
  const rows = (uid, id, type) => collection(trans(uid, id), type);
  async function create(uid, profile, weights, sessions = [], context = null) {
    profile = validateProfile(profile);
    const parent = doc(root(uid));
    const batch = writeBatch(db);
    batch.set(parent, {
      ...profile,
      ownerUid: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    for (const weight of weights)
      batch.set(doc(collection(parent, 'weights')), {
        ...validateWeight(weight),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    for (const session of sessions)
      batch.set(doc(collection(parent, 'sessions')), {
        ...validateSession(session),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    if (context)
      batch.set(doc(collection(parent, 'private'), 'context'), {
        ...context,
        updatedAt: serverTimestamp(),
      });
    await batch.commit();
    return parent.id;
  }
  instance = {
    auth,
    login: () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return signInWithPopup(auth, provider);
    },
    logout: () => signOut(auth),
    watchSession(callback) {
      let stopMember = () => {};
      const stopAuth = onAuthStateChanged(
        auth,
        (user) => {
          stopMember();
          callback({ status: user ? 'checking' : 'signed-out', user: null });
          if (!user) return;
          if (!user.email || !user.emailVerified) {
            callback({ status: 'denied', user: null });
            return;
          }
          stopMember = onSnapshot(
            doc(db, 'members', user.email.toLowerCase()),
            (snapshot) => {
              callback(
                snapshot.exists() && snapshot.data().enabled === true
                  ? { status: 'allowed', user }
                  : { status: 'denied', user: null },
              );
            },
            () => callback({ status: 'denied', user: null }),
          );
        },
        () => callback({ status: 'error', user: null }),
      );
      return () => {
        stopMember();
        stopAuth();
      };
    },
    watchTransformations(uid, next, error) {
      return onSnapshot(
        query(root(uid), orderBy('createdAt', 'desc')),
        (snap) => next(snap.docs.map((row) => ({ ...row.data(), id: row.id }))),
        error,
      );
    },
    watchRecords(uid, id, type, next, error) {
      return onSnapshot(
        query(rows(uid, id, type), orderBy('date', 'asc')),
        (snap) => next(snap.docs.map((row) => ({ ...row.data(), id: row.id }))),
        error,
      );
    },
    watchContext(uid, id, next, error) {
      return onSnapshot(
        doc(trans(uid, id), 'private', 'context'),
        (snap) => next(snap.exists() ? snap.data() : null),
        error,
      );
    },
    watchWeeklyPlan(uid, id, week, next, error) {
      return onSnapshot(
        doc(trans(uid, id), 'plans', week),
        (snap) => next(snap.exists() ? snap.data() : null),
        error,
      );
    },
    acceptWeeklyPlan(uid, id, draft) {
      return acceptWeeklyPlan(db, uid, id, draft);
    },
    watchTrainingProgram(uid, id, next, error) {
      return onSnapshot(
        doc(trans(uid, id), 'private', 'program'),
        (snap) => next(snap.exists() ? decodeProgram(snap.data()) : null),
        error,
      );
    },
    watchTrainingTemplates(uid, id, next, error) {
      return onSnapshot(
        query(rows(uid, id, 'templates'), orderBy('createdAt', 'asc')),
        (snap) => next(snap.docs.map((row) => ({ ...row.data(), id: row.id }))),
        error,
      );
    },
    watchTrainingReview(uid, id, start, next, error) {
      return onSnapshot(
        doc(trans(uid, id), 'reviews', start),
        (snap) => next(snap.exists() ? snap.data() : null),
        error,
      );
    },
    saveTrainingTemplate: (uid, id, value, original) =>
      saveTrainingTemplate(db, uid, id, value, original),
    saveTrainingProgram: (uid, id, value) => saveTrainingProgram(db, uid, id, value),
    saveTrainingReview: (uid, id, start, value) => saveTrainingReview(db, uid, id, start, value),
    prepareTrainingProposal: (uid, id, date) => prepareTrainingProposal(db, uid, id, date),
    acceptTrainingProposal: (uid, id, date, token) =>
      acceptTrainingProposal(db, uid, id, date, token),
    createTransformation(uid, profile) {
      return create(uid, profile, [
        {
          date: profile.startDate,
          kg: profile.initialWeight,
          status: 'confirmed',
          note: 'Peso inicial indicado al crear la transformación.',
        },
      ]);
    },
    importTransformation(user, input) {
      const value = parseImport(input, user.email);
      return create(user.uid, value.profile, value.weights, value.sessions, value.healthContext);
    },
    async addWeight(uid, id, value) {
      const batch = writeBatch(db);
      batch.set(doc(rows(uid, id, 'weights')), {
        ...validateWeight(value),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(trans(uid, id), { updatedAt: serverTimestamp() });
      await batch.commit();
    },
    async addSession(uid, id, value) {
      const batch = writeBatch(db);
      batch.set(doc(rows(uid, id, 'sessions')), {
        ...validateSession(value),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(trans(uid, id), { updatedAt: serverTimestamp() });
      await batch.commit();
    },
    toggleSession(uid, id, session) {
      const batch = writeBatch(db);
      batch.update(doc(rows(uid, id, 'sessions'), session.id), {
        completed: !session.completed,
        updatedAt: serverTimestamp(),
      });
      batch.update(trans(uid, id), { updatedAt: serverTimestamp() });
      return batch.commit();
    },
    editSession(uid, id, original, value) {
      const next = validateSession(value);
      const ref = doc(rows(uid, id, 'sessions'), original.id);
      return runTransaction(db, async (tx) => {
        const [current] = await Promise.all([tx.get(ref), tx.get(trans(uid, id))]);
        if (
          !current.exists() ||
          current.data().updatedAt?.toMillis() !== original.updatedAt?.toMillis()
        )
          throw new Error(
            'La sesión ha cambiado. Cierra y vuelve a abrir el formulario para revisarla.',
          );
        tx.update(ref, {
          ...next,
          ...(original.origin ? { origin: { ...original.origin, edited: true } } : {}),
          updatedAt: serverTimestamp(),
        });
        tx.update(trans(uid, id), { updatedAt: serverTimestamp() });
      });
    },
    saveAppearance(uid, id, value) {
      return updateDoc(trans(uid, id), {
        ...validateAppearance(value),
        updatedAt: serverTimestamp(),
      });
    },
    saveContext(uid, id, context) {
      return setDoc(doc(trans(uid, id), 'private', 'context'), {
        ...Object.fromEntries(
          ['activityNotes', 'treatmentNotes', 'lumbarNotes', 'medicalNotes', 'sourceNotes'].map(
            (key) => [key, String(context[key] ?? '').slice(0, 5000)],
          ),
        ),
        updatedAt: serverTimestamp(),
      });
    },
  };
  return instance;
}
export function friendlyError(error) {
  if (error?.code === 'auth/popup-closed-by-user')
    return 'Has cerrado el acceso con Google. Puedes intentarlo de nuevo.';
  if (error?.code === 'auth/popup-blocked')
    return 'Permite la ventana de acceso con Google en tu navegador y vuelve a intentarlo.';
  if (error?.code === 'auth/unauthorized-domain')
    return 'Este dominio aún no está autorizado para iniciar sesión.';
  if (error?.code === 'permission-denied')
    return 'No tienes permiso para esta operación. Comprueba que tu cuenta sigue autorizada.';
  if (['unavailable', 'auth/network-request-failed'].includes(error?.code))
    return 'No se ha podido conectar. Comprueba tu conexión; los cambios no guardados no se han confirmado.';
  if (error?.code) return 'No se pudo completar la operación. No se han confirmado cambios.';
  return error?.message || 'No se pudo completar la operación.';
}
