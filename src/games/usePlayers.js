import { useCallback, useMemo, useState } from 'react';

const KEY = 'gulp_players';
export const MAX_PLAYERS = 12;
export const MAX_NAME_LENGTH = 16;

/** Prénoms propres : jamais vides, jamais en double (les scores sont indexés par prénom). */
export function normalizePlayers(list) {
  const seen = new Set();
  return list.map((raw, i) => {
    const base = String(raw ?? '').trim().slice(0, MAX_NAME_LENGTH) || `Joueur ${i + 1}`;
    let name = base;
    let n = 2;
    while (seen.has(name.toLowerCase())) name = `${base} ${n++}`;
    seen.add(name.toLowerCase());
    return name;
  });
}

const load = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(parsed)) return parsed.map(String).slice(0, MAX_PLAYERS);
  } catch {
    /* localStorage indisponible ou vide */
  }
  return [];
};

/**
 * Liste de joueurs partagée par tous les jeux et mémorisée sur le téléphone.
 * Un jeu qui prend moins de joueurs (le Duel : 2) ne voit que les premiers,
 * sans jamais effacer les suivants de la liste commune.
 */
export default function usePlayers(min = 2, max = MAX_PLAYERS) {
  const [all, setAll] = useState(load);

  const players = useMemo(() => {
    const view = all.slice(0, max);
    while (view.length < min) view.push('');
    return normalizePlayers(view);
  }, [all, min, max]);

  const setPlayers = useCallback(
    (next) => {
      setAll((prev) => {
        const view = normalizePlayers(next.slice(0, max));
        const merged = [...view, ...prev.slice(Math.max(max, view.length))].slice(0, MAX_PLAYERS);
        try {
          localStorage.setItem(KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return merged;
      });
    },
    [max]
  );

  return { players, setPlayers, min, max };
}
