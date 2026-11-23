import { useCallback, useEffect, useRef, useState } from 'react';

export default function useChugTimer({
  holdMs = 500,
  displayRef = null,
  formatDisplay = (ms) => (ms / 1000).toFixed(2),
  getClassName = null,
  onStart,
  onStop,
  onLap = null,
  onArmProgress,
  haptics = true,
} = {}) {
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [holdProgress, setHoldProgress] = useState(0);

  const phaseRef = useRef('idle');
  const startTsRef = useRef(0);
  const holdStartRef = useRef(0);
  const rafRef = useRef(0);
  const pointerIdRef = useRef(null);
  const lastProgressBucket = useRef(-1);

  const setPhaseBoth = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const vibrate = useCallback(
    (pattern) => {
      if (!haptics) return;
      try {
        navigator.vibrate?.(pattern);
      } catch {
        /* pas supporté */
      }
    },
    [haptics]
  );

  const cancelRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  const paint = useCallback(
    (ms) => {
      const el = displayRef?.current;
      if (!el) return;
      el.textContent = formatDisplay(ms);
      if (getClassName) {
        const cls = getClassName(ms);
        if (el.className !== cls) el.className = cls;
      }
    },
    [displayRef, formatDisplay, getClassName]
  );

  const runLoop = useCallback(() => {
    const tick = () => {
      if (phaseRef.current !== 'running') return;
      paint(performance.now() - startTsRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [paint]);

  const startRunning = useCallback(
    (startTs) => {
      startTsRef.current = startTs;
      setHoldProgress(0);
      lastProgressBucket.current = -1;
      setPhaseBoth('running');
      vibrate(40);
      onStart?.(startTs);
      runLoop();
    },
    [onStart, runLoop, vibrate]
  );

  const holdLoop = useCallback(() => {
    const tick = () => {
      if (phaseRef.current !== 'holding') return;
      const elapsed = performance.now() - holdStartRef.current;
      if (elapsed >= holdMs) {
        cancelRaf();
        startRunning(holdStartRef.current + holdMs);
        return;
      }
      const progress = elapsed / holdMs;
      const bucket = Math.floor(progress * 20);
      if (bucket !== lastProgressBucket.current) {
        lastProgressBucket.current = bucket;
        setHoldProgress(progress);
        onArmProgress?.(progress);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [holdMs, onArmProgress, startRunning]);

  const stop = useCallback(
    (stopTs = performance.now()) => {
      if (phaseRef.current !== 'running') return null;
      cancelRaf();
      const ms = stopTs - startTsRef.current;
      paint(ms);
      const r = { ms, startTs: startTsRef.current, stopTs };
      setResult(r);
      setPhaseBoth('stopped');
      vibrate([30, 40, 30]);
      onStop?.(r);
      return r;
    },
    [onStop, paint, vibrate]
  );

  const reset = useCallback(() => {
    cancelRaf();
    pointerIdRef.current = null;
    setResult(null);
    setHoldProgress(0);
    setPhaseBoth('idle');
    paint(0);
  }, [paint]);

  const onPointerDown = useCallback(
    (e) => {
      if (pointerIdRef.current != null && pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* certains navigateurs refusent */
      }
      const ts = e.timeStamp || performance.now();

      if (phaseRef.current === 'running') {
        if (onLap) {
          vibrate(20);
          onLap(ts, ts - startTsRef.current);
        } else {
          stop(ts);
        }
        return;
      }
      if (phaseRef.current === 'idle' || phaseRef.current === 'stopped') {
        holdStartRef.current = ts;
        setResult(null);
        setPhaseBoth('holding');
        vibrate(10);
        holdLoop();
      }
    },
    [holdLoop, onLap, stop, vibrate]
  );

  const onPointerUp = useCallback((e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    if (phaseRef.current === 'holding') {
      cancelRaf();
      setHoldProgress(0);
      lastProgressBucket.current = -1;
      setPhaseBoth('idle');
    }
  }, []);

  const onPointerCancel = onPointerUp;

  const onContextMenu = useCallback((e) => e.preventDefault(), []);

  useEffect(() => () => cancelRaf(), []);

  return {
    phase,
    result,
    holdProgress,
    isRunning: phase === 'running',
    isHolding: phase === 'holding',
    /** Départ piloté de l'extérieur (détection caméra), daté à `ts`. */
    startAt: (ts) => {
      if (phaseRef.current === 'running') return;
      cancelRaf();
      setResult(null);
      startRunning(ts);
    },
    stop,
    reset,
    bind: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
      style: { touchAction: 'none' },
    },
  };
}
