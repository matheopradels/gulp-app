import { useCallback, useMemo, useRef } from 'react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function useDeck(key, items, maxLevel = 3) {
  const eligible = useMemo(
    () => items.map((it, i) => (it.l <= maxLevel ? i : -1)).filter((i) => i >= 0),
    [items, maxLevel]
  );
  const storageKey = `gulp_deck_${key}_${maxLevel}`;
  const remainingRef = useRef(null);
  const keyRef = useRef(storageKey);
  if (keyRef.current !== storageKey) {
    keyRef.current = storageKey;
    remainingRef.current = null;
  }

  const load = useCallback(() => {
    if (remainingRef.current) return remainingRef.current;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((i) => eligible.includes(i));
        if (valid.length) {
          remainingRef.current = valid;
          return valid;
        }
      }
    } catch {
      /* ignore */
    }
    remainingRef.current = shuffle(eligible);
    return remainingRef.current;
  }, [storageKey, eligible]);

  const save = (rem) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rem));
    } catch {
      /* ignore */
    }
  };

  const draw = useCallback(() => {
    let rem = load();
    if (rem.length === 0) {
      rem = shuffle(eligible);
    }
    const idx = rem[0];
    remainingRef.current = rem.slice(1);
    save(remainingRef.current);
    return { ...items[idx], index: idx, remaining: remainingRef.current.length, total: eligible.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, eligible, items]);

  const reset = useCallback(() => {
    remainingRef.current = shuffle(eligible);
    save(remainingRef.current);
  }, [eligible]);

  return { draw, reset, total: eligible.length };
}
