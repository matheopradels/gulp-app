import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { FORMATS, MIN_PLAUSIBLE_MS, MAX_PLAUSIBLE_MS, getPerformanceTier } from '../utils/performance';
import { GEOFENCE_RADIUS_M } from '../utils/geo';
import { localId, readJSON, subscribeKey, writeJSON } from './localStore';

/**
 * Où vont les perfs :
 *  - joueur connecté : toutes ses perfs vont dans Firestore (`performances`),
 *    avec `ranked: true` si elles sont faites dans un bar à portée. Seules
 *    celles-là comptent au classement général.
 *  - visiteur : journal local sur le téléphone (`gulp_perfs`).
 */
const PERFORMANCES = 'performances';
const LOCAL_PERFS_KEY = 'gulp_perfs';
const MAX_LOCAL_PERFS = 500;
const MY_PERFS_LIMIT = 500;

export const RANKED_FORMAT = 'Pinte'; // le classement général ne compare que des pintes

// ---------- Journal local (visiteur) ----------
export const getLocalPerformances = () => readJSON(LOCAL_PERFS_KEY, []);
const setLocalPerformances = (list) => writeJSON(LOCAL_PERFS_KEY, list);

/** Perfs faites en visiteur sur ce téléphone, qu'on peut rattacher à un compte. */
export const getGuestPerformances = () => getLocalPerformances().filter((p) => String(p.userId).startsWith('local_'));

const fromDoc = (d) => {
  const data = d.data({ serverTimestamps: 'estimate' });
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
    pending: d.metadata.hasPendingWrites,
  };
};

/** Mes perfs, en direct, les plus récentes d'abord. */
export const subscribeToMyPerformances = (user, callback) => {
  if (!user) {
    callback([]);
    return () => {};
  }
  if (!user.online || !isFirebaseConfigured) {
    const emit = (list) => callback(list.filter((p) => p.userId === user.id));
    emit(getLocalPerformances());
    return subscribeKey(LOCAL_PERFS_KEY, emit);
  }
  const q = query(
    collection(db, PERFORMANCES),
    where('userId', '==', user.id),
    orderBy('createdAt', 'desc'),
    limit(MY_PERFS_LIMIT)
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    (snap) => callback(snap.docs.map(fromDoc)),
    (error) => {
      console.warn('Mes perfs indisponibles :', error?.code || error);
      callback([]);
    }
  );
};

export const deletePerformance = async (user, id) => {
  if (user?.online && isFirebaseConfigured && !String(id).startsWith('perf_')) {
    await deleteDoc(doc(db, PERFORMANCES, id));
    return;
  }
  setLocalPerformances(getLocalPerformances().filter((p) => p.id !== id));
};

const validate = (format, ms) => {
  if (!FORMATS.includes(format)) throw new Error(`Format inconnu : ${format}`);
  const minMs = MIN_PLAUSIBLE_MS[format];
  if (!(ms >= minMs)) {
    throw new Error(`Trop rapide pour être plausible (min ${(minMs / 1000).toFixed(1)} s pour ${format}).`);
  }
  if (ms >= MAX_PLAUSIBLE_MS) throw new Error('Temps invalide (2 minutes ou plus).');
};

/**
 * Enregistre une perf.
 * @returns {{ ranked: boolean, online: boolean, pending: boolean }}
 *   ranked  : faite dans un bar à portée (compte au classement général)
 *   online  : enregistrée sur le compte (et non seulement sur le téléphone)
 *   pending : pas encore confirmée par le serveur (hors ligne) — elle partira toute seule
 */
export const recordPerformance = async ({ user, barId, barName, format, timeMs, distance, method = 'bouton' }) => {
  const ms = Math.round(timeMs);
  validate(format, ms);
  const ranked = Boolean(barId) && Number.isFinite(distance) && distance <= GEOFENCE_RADIUS_M;
  const base = {
    userId: user.id,
    userName: user.name,
    format,
    timeMs: ms,
    timeInSeconds: ms / 1000,
    color: getPerformanceTier(ms, format),
    ranked,
    barId: ranked ? String(barId) : null,
    barName: ranked ? String(barName || '').slice(0, 80) : null,
    distance: ranked ? Math.round(distance) : null,
    // 'bouton' (chrono à la main) ou 'camera' (détection automatique)
    method: method === 'camera' ? 'camera' : 'bouton',
  };

  if (user.online && isFirebaseConfigured) {
    const ref = doc(collection(db, PERFORMANCES));
    const write = setDoc(ref, { ...base, createdAt: serverTimestamp() });
    // Hors ligne, la promesse n'aboutit qu'au retour du réseau : on n'attend
    // pas indéfiniment, la perf est déjà dans le cache local et partira seule.
    const outcome = await Promise.race([
      write.then(() => 'ok'),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 4000)),
    ]).catch((error) => {
      console.warn('Perf refusée par le serveur :', error?.code || error);
      throw new Error("Le serveur a refusé ce temps. Il n'a pas été enregistré.");
    });
    write.catch(() => {});
    return { ranked, online: true, pending: outcome === 'pending' };
  }

  const entry = { id: localId('perf'), ...base, createdAt: Date.now() };
  setLocalPerformances([entry, ...getLocalPerformances()].slice(0, MAX_LOCAL_PERFS));
  return { ranked, online: false, pending: false };
};

/**
 * Rattache au compte les perfs faites en visiteur sur ce téléphone.
 * Elles gardent leur date mais n'entrent jamais au classement général
 * (aucune preuve qu'elles ont été faites dans un bar).
 */
export const importGuestPerformances = async (user) => {
  const guestPerfs = getGuestPerformances().filter((p) => {
    try {
      validate(p.format, Math.round(p.timeMs));
      return true;
    } catch {
      return false;
    }
  });
  for (let i = 0; i < guestPerfs.length; i += 400) {
    const batch = writeBatch(db);
    guestPerfs.slice(i, i + 400).forEach((p) => {
      const ms = Math.round(p.timeMs);
      batch.set(doc(collection(db, PERFORMANCES)), {
        userId: user.id,
        userName: user.name,
        format: p.format,
        timeMs: ms,
        timeInSeconds: ms / 1000,
        color: getPerformanceTier(ms, p.format),
        ranked: false,
        imported: true,
        barId: p.barId || null,
        barName: p.barName || null,
        distance: null,
        // Une minute de marge : l'horloge du téléphone peut avancer sur celle du serveur.
        createdAt: Timestamp.fromMillis(Math.min(Number(p.createdAt) || 0, Date.now() - 60000) || Date.now() - 60000),
      });
    });
    await batch.commit();
  }
  setLocalPerformances(getLocalPerformances().filter((p) => !String(p.userId).startsWith('local_')));
  return guestPerfs.length;
};

/** On garde les perfs visiteur sur le téléphone, mais on ne propose plus l'import. */
export const dismissGuestImport = () => {
  try {
    localStorage.setItem('gulp_import_dismissed', '1');
  } catch {
    /* ignore */
  }
};
export const isGuestImportDismissed = () => {
  try {
    return localStorage.getItem('gulp_import_dismissed') === '1';
  } catch {
    return false;
  }
};

/** Meilleur temps par format à partir d'une liste de perfs. */
export const bestByFormat = (perfs) => {
  const best = {};
  for (const p of perfs) {
    if (!best[p.format] || p.timeMs < best[p.format].timeMs) best[p.format] = p;
  }
  return best;
};

const keepBestPerUser = (perfs) => {
  const best = new Map();
  for (const p of perfs) {
    const cur = best.get(p.userId);
    if (!cur || p.timeInSeconds < cur.timeInSeconds) best.set(p.userId, p);
  }
  return [...best.values()].sort((a, b) => a.timeInSeconds - b.timeInSeconds);
};

/**
 * Classement général : meilleure pinte classée (faite dans un bar) de chaque
 * joueur. Lisible par tout le monde, y compris les visiteurs.
 * Renvoie `null` si Firebase n'est pas configuré.
 */
export const subscribeToGlobalRanking = (callback, onError) => {
  if (!isFirebaseConfigured) return null;
  const q = query(
    collection(db, PERFORMANCES),
    where('format', '==', RANKED_FORMAT),
    where('ranked', '==', true),
    orderBy('timeInSeconds', 'asc'),
    limit(300)
  );
  return onSnapshot(
    q,
    (snap) => callback(keepBestPerUser(snap.docs.map(fromDoc))),
    (error) => {
      console.warn('Classement indisponible :', error?.code || error);
      onError?.(error);
    }
  );
};

/** Classement d'un bar : meilleure pinte classée de chaque joueur dans ce bar. */
export const subscribeToBarRanking = (barId, callback) => {
  if (!isFirebaseConfigured || !barId) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, PERFORMANCES),
    where('barId', '==', String(barId)),
    where('format', '==', RANKED_FORMAT),
    where('ranked', '==', true),
    orderBy('timeInSeconds', 'asc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => callback(keepBestPerUser(snap.docs.map(fromDoc))),
    (error) => {
      console.warn('Classement du bar indisponible :', error?.code || error);
      callback([]);
    }
  );
};

/** Perfs de la semaine des membres d'un clan (30 membres max). */
export const subscribeToGroupWeek = (memberIds, callback, onError) => {
  const ids = (memberIds || []).slice(0, 30);
  if (!isFirebaseConfigured || ids.length === 0) {
    callback([]);
    return () => {};
  }
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const q = query(
    collection(db, PERFORMANCES),
    where('userId', 'in', ids),
    where('createdAt', '>=', Timestamp.fromDate(weekAgo)),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(fromDoc)),
    (error) => {
      console.warn('Classement du clan indisponible :', error?.code || error);
      onError?.(error);
    }
  );
};

/** Classement d'un clan pour un format : meilleur temps + nombre de perfs par membre. */
export const groupLeaderboard = (perfs, format) => {
  const rows = new Map();
  for (const p of perfs) {
    if (p.format !== format) continue;
    const row = rows.get(p.userId) || { userId: p.userId, userName: p.userName, count: 0, bestTime: Infinity };
    row.count += 1;
    row.bestTime = Math.min(row.bestTime, p.timeInSeconds);
    row.userName = row.userName || p.userName;
    rows.set(p.userId, row);
  }
  return [...rows.values()].sort((a, b) => a.bestTime - b.bestTime);
};
