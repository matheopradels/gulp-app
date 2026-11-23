import {
  GoogleAuthProvider,
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { localId } from './localStore';

/**
 * Deux façons d'utiliser GULP! :
 *  - avec un compte Google : profil, records, clans et classement sont en ligne ;
 *  - en visiteur : tout reste sur ce téléphone (identifiant local `local_…`).
 */
const GUEST_ID_KEY = 'gulp_user_id';
const GUEST_NAME_KEY = 'gulp_user_name';
const ONBOARDED_KEY = 'gulp_onboarded';

const get = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* navigation privée : on continue en mémoire */
  }
};

// ---------- Visiteur ----------
export const getGuest = () => {
  let id = get(GUEST_ID_KEY);
  if (!id || !id.startsWith('local_')) {
    id = localId('local');
    set(GUEST_ID_KEY, id);
  }
  let name = get(GUEST_NAME_KEY);
  if (!name) {
    name = `Gulpeur_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    set(GUEST_NAME_KEY, name);
  }
  return { id, name };
};
export const setGuestName = (name) => set(GUEST_NAME_KEY, name);

/** Le premier écran (connexion ou visiteur) a-t-il déjà été passé ? */
export const hasOnboarded = () => get(ONBOARDED_KEY) === '1';
export const markOnboarded = () => set(ONBOARDED_KEY, '1');

// ---------- Google ----------
const provider = () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

// Application installée sur l'écran d'accueil (iPhone surtout) : les fenêtres
// popup y marchent mal, on passe par une redirection.
const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

const FRIENDLY_ERRORS = {
  'auth/network-request-failed': 'Pas de connexion internet. Réessaie avec du réseau.',
  'auth/unauthorized-domain': "Ce site n'est pas autorisé à se connecter (domaine à ajouter dans la console Firebase).",
  'auth/operation-not-allowed': "La connexion Google n'est pas activée dans la console Firebase.",
  'auth/too-many-requests': 'Trop de tentatives. Attends une minute et réessaie.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/internal-error': 'Erreur de connexion. Réessaie.',
  'auth/web-storage-unsupported':
    'Ce navigateur bloque la connexion (navigation privée ou navigateur d’une appli). Ouvre GULP dans Safari ou Chrome.',
  'auth/operation-not-supported-in-this-environment':
    'Connexion impossible dans ce navigateur. Ouvre GULP dans Safari ou Chrome.',
};
const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

export class AuthMessage extends Error {
  constructor(message, silent = false) {
    super(message);
    this.silent = silent;
  }
}

const toAuthMessage = (error) => {
  const code = error?.code || '';
  if (SILENT.has(code)) return new AuthMessage('', true);
  return new AuthMessage(FRIENDLY_ERRORS[code] || 'Connexion impossible. Réessaie.');
};

/** Doit être appelé directement dans un clic (sinon le navigateur bloque la fenêtre). */
export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured) throw new AuthMessage("La connexion n'est pas disponible dans cette version.");
  try {
    if (isStandalone()) {
      await signInWithRedirect(auth, provider());
      return null; // la page va être rechargée
    }
    const { user } = await signInWithPopup(auth, provider());
    return user;
  } catch (error) {
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider());
      return null;
    }
    throw toAuthMessage(error);
  }
};

/** Termine une connexion par redirection (au chargement de l'app). */
export const completeRedirectSignIn = async () => {
  if (!isFirebaseConfigured) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    throw toAuthMessage(error);
  }
};

export const watchAuth = (callback) => {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const signOutUser = async () => {
  if (auth) await signOut(auth);
};

/** Redemande le compte Google : obligatoire avant de supprimer un compte. */
export const confirmIdentity = async () => {
  try {
    await reauthenticateWithPopup(auth.currentUser, provider());
  } catch (error) {
    throw toAuthMessage(error);
  }
};

export const deleteAuthUser = async () => {
  await deleteUser(auth.currentUser);
};
