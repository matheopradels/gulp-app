import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Profil public d'un joueur : users/{uid} = { name, photoURL, createdAt, updatedAt }.
 * L'adresse email n'est jamais stockée en base.
 */
export const MAX_NAME = 20;
const USERS = 'users';

export const cleanName = (name) =>
  String(name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);

const firstName = (displayName) => cleanName(String(displayName || '').split(' ')[0]) || 'Gulpeur';

/** Crée le profil au premier passage, ne touche à rien ensuite. */
export const ensureUserProfile = async (authUser) => {
  const ref = doc(db, USERS, authUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: authUser.uid, ...snap.data() };
  const profile = {
    name: firstName(authUser.displayName),
    photoURL: authUser.photoURL || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: authUser.uid, ...profile, isNew: true };
};

export const subscribeToProfile = (uid, callback) =>
  onSnapshot(
    doc(db, USERS, uid),
    (snap) => callback(snap.exists() ? { id: uid, ...snap.data() } : null),
    () => {}
  );

/**
 * Change le pseudo partout où il est affiché : profil, perfs (classements)
 * et fiches de membre des clans. Les perfs/clans sont mis à jour en tâche de
 * fond ; un échec là n'empêche pas le changement de pseudo.
 */
export const renameUser = async (uid, rawName) => {
  const name = cleanName(rawName);
  if (!name) throw new Error('Pseudo vide.');
  await updateDoc(doc(db, USERS, uid), { name, updatedAt: serverTimestamp() });

  (async () => {
    const perfs = await getDocs(query(collection(db, 'performances'), where('userId', '==', uid)));
    for (let i = 0; i < perfs.docs.length; i += 400) {
      const batch = writeBatch(db);
      perfs.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { userName: name }));
      await batch.commit();
    }
    const groups = await getDocs(query(collection(db, 'groups'), where('memberIds', 'array-contains', uid)));
    await Promise.all(
      groups.docs.map((g) =>
        updateDoc(g.ref, {
          members: (g.data().members || []).map((m) => (m.id === uid ? { ...m, name } : m)),
        })
      )
    );
  })().catch((e) => console.warn('Mise à jour du pseudo incomplète :', e?.code || e));

  return name;
};

/**
 * Efface toutes les données d'un joueur : perfs, présence dans les clans
 * (un clan dont il est chef passe au membre suivant, ou disparaît s'il était
 * seul), puis son profil. Le compte Google lui-même est supprimé ensuite par
 * l'appelant (Firebase Auth).
 */
export const deleteUserData = async (uid) => {
  const perfs = await getDocs(query(collection(db, 'performances'), where('userId', '==', uid)));
  for (let i = 0; i < perfs.docs.length; i += 400) {
    const batch = writeBatch(db);
    perfs.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  const prices = await getDocs(query(collection(db, 'prices'), where('userId', '==', uid)));
  await Promise.all(prices.docs.map((d) => deleteDoc(d.ref)));

  const groups = await getDocs(query(collection(db, 'groups'), where('memberIds', 'array-contains', uid)));
  for (const g of groups.docs) {
    const data = g.data();
    const others = (data.members || []).filter((m) => m.id !== uid);
    if (data.creatorId === uid) {
      if (others.length === 0) {
        await deleteDoc(g.ref);
      } else {
        const heir = others[0];
        await updateDoc(g.ref, {
          creatorId: heir.id,
          members: others.map((m) => ({ ...m, isCreator: m.id === heir.id })),
          memberIds: others.map((m) => m.id),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      await updateDoc(g.ref, {
        members: others,
        memberIds: others.map((m) => m.id),
        updatedAt: serverTimestamp(),
      });
    }
  }

  await deleteDoc(doc(db, USERS, uid));
};
