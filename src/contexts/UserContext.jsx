import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isFirebaseConfigured } from '../config/firebase';
import {
  completeRedirectSignIn,
  confirmIdentity,
  deleteAuthUser,
  getGuest,
  markOnboarded,
  setGuestName,
  signInWithGoogle,
  signOutUser,
  watchAuth,
} from '../services/authService';
import { cleanName, deleteUserData, ensureUserProfile, renameUser, subscribeToProfile } from '../services/userService';

const UserContext = createContext(null);

/**
 * `user` est toujours défini :
 *  - connecté : { id: uid, name, photoURL, online: true, isGuest: false }
 *  - visiteur : { id: 'local_…', name, online: false, isGuest: true }
 */
export function UserProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [guest, setGuest] = useState(getGuest);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  // Session Firebase (restaurée automatiquement au lancement).
  useEffect(() => {
    completeRedirectSignIn().catch((e) => !e.silent && setAuthError(e.message));
    return watchAuth((u) => {
      setAuthUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  // Profil en base : créé au premier passage, puis suivi en direct.
  useEffect(() => {
    if (!authUser) return undefined;
    let off = () => {};
    let alive = true;
    ensureUserProfile(authUser)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        markOnboarded();
        off = subscribeToProfile(authUser.uid, (live) => live && setProfile(live));
      })
      .catch((e) => {
        console.warn('Profil indisponible :', e?.code || e);
        // Hors ligne au premier lancement : on affiche quand même le compte Google.
        if (alive) setProfile({ id: authUser.uid, name: cleanName(authUser.displayName?.split(' ')[0]) || 'Gulpeur' });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      off();
    };
  }, [authUser]);

  const user = useMemo(() => {
    if (authUser) {
      return {
        id: authUser.uid,
        name: profile?.name || cleanName(authUser.displayName?.split(' ')[0]) || 'Gulpeur',
        photoURL: profile?.photoURL || authUser.photoURL || null,
        email: authUser.email || '',
        online: true,
        isGuest: false,
        isNew: Boolean(profile?.isNew),
      };
    }
    return { ...guest, photoURL: null, email: '', online: false, isGuest: true };
  }, [authUser, profile, guest]);

  const signIn = useCallback(async () => {
    setAuthError('');
    setBusy(true);
    try {
      await signInWithGoogle();
      return true;
    } catch (e) {
      if (!e.silent) setAuthError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const continueAsGuest = useCallback(() => markOnboarded(), []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setGuest(getGuest());
  }, []);

  const updateName = useCallback(
    async (newName) => {
      const clean = cleanName(newName);
      if (!clean) return;
      if (authUser) {
        setProfile((p) => ({ ...(p || {}), name: clean }));
        try {
          await renameUser(authUser.uid, clean);
        } catch (e) {
          setAuthError('Pseudo non enregistré, réessaie avec du réseau.');
        }
      } else {
        setGuestName(clean);
        setGuest((g) => ({ ...g, name: clean }));
      }
    },
    [authUser]
  );

  /** Supprime définitivement le compte et toutes ses données en ligne. */
  const deleteAccount = useCallback(async () => {
    if (!authUser) return false;
    setAuthError('');
    setBusy(true);
    try {
      await confirmIdentity();
      await deleteUserData(authUser.uid);
      await deleteAuthUser();
      setGuest(getGuest());
      return true;
    } catch (e) {
      if (!e.silent) setAuthError(e.message || 'Suppression impossible. Réessaie avec du réseau.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [authUser]);

  const value = {
    user,
    loading,
    busy,
    authError,
    clearAuthError: () => setAuthError(''),
    canSignIn: isFirebaseConfigured,
    signIn,
    signOut,
    continueAsGuest,
    updateName,
    deleteAccount,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
