import { useCallback, useState } from 'react';

const KEY = 'gulp_level';

/**
 * Niveau de contenu (1 Soft, 2 Hot, 3 Sans honte), mémorisé d'un jeu à l'autre.
 * Par défaut Soft : c'est le groupe qui choisit de monter, pas l'app.
 */
export default function useLevel(minLevel = 1) {
  const [level, setLevelState] = useState(() => {
    let stored = 1;
    try {
      stored = Number(localStorage.getItem(KEY)) || 1;
    } catch {
      /* ignore */
    }
    return Math.min(3, Math.max(minLevel, stored));
  });

  const setLevel = useCallback((lv) => {
    setLevelState(lv);
    try {
      localStorage.setItem(KEY, String(lv));
    } catch {
      /* ignore */
    }
  }, []);

  return [level, setLevel];
}
