/**
 * Petit stockage local (localStorage) avec abonnements.
 * Sert de base de données quand Firebase n'est pas configuré, et de
 * journal perso des perfs dans tous les cas.
 */
const listeners = new Map(); // key -> Set<fn>

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota plein ou navigation privée : on continue en mémoire */
  }
  listeners.get(key)?.forEach((fn) => fn(value));
}

export function subscribeKey(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

export const localId = (prefix = 'local') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
