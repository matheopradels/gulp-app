import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

/** Les clans n'existent qu'en ligne : sans Firebase, ces fonctions refusent proprement. */
const GROUPS_COLLECTION = 'groups';
export const MAX_GROUP_MEMBERS = 30;

const requireOnline = () => {
  if (!isFirebaseConfigured) throw new Error('Les clans ne sont pas disponibles hors ligne.');
};

const generateInviteCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const uniqueInviteCode = async () => {
  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    const taken = await getDocs(query(collection(db, GROUPS_COLLECTION), where('joinCode', '==', code)));
    if (taken.empty) return code;
  }
  return generateInviteCode();
};

export const createGroup = async (name, user) => {
  requireOnline();
  const group = {
    name: String(name).trim().slice(0, 30),
    joinCode: await uniqueInviteCode(),
    creatorId: user.id,
    memberIds: [user.id],
    members: [{ id: user.id, name: user.name, isCreator: true, joinedAt: Timestamp.now() }],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, GROUPS_COLLECTION), group);
  return { id: ref.id, ...group };
};

export const getGroupByJoinCode = async (joinCode) => {
  requireOnline();
  const snap = await getDocs(query(collection(db, GROUPS_COLLECTION), where('joinCode', '==', joinCode)));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const addMemberToGroup = async (groupId, member) => {
  requireOnline();
  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
    memberIds: arrayUnion(member.id),
    members: arrayUnion({ id: member.id, name: member.name, isCreator: false, joinedAt: Timestamp.now() }),
    updatedAt: Timestamp.now(),
  });
};

export const removeMemberFromGroup = async (groupId, memberId) => {
  requireOnline();
  const ref = doc(db, GROUPS_COLLECTION, groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  await updateDoc(ref, {
    members: (snap.data().members || []).filter((m) => m.id !== memberId),
    memberIds: arrayRemove(memberId),
    updatedAt: Timestamp.now(),
  });
};

export const deleteGroup = async (groupId) => {
  requireOnline();
  await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
};

export const subscribeToUserGroups = (userId, callback, onError) => {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, GROUPS_COLLECTION), where('memberIds', 'array-contains', userId)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.warn('Clans indisponibles :', error?.code || error);
      onError?.(error);
    }
  );
};
