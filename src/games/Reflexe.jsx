import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Zap, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * RÉFLEXE — test de temps de réaction, 5 manches.
 * Écran rouge "attends", délai aléatoire 1.5–4 s, flash néon, tape le plus
 * vite possible. Taper avant le flash = faux départ (manche perdue).
 * Mesure au timeStamp du pointerdown, flash daté au rAF qui l'a peint (on
 * mesure ce que l'humain voit, pas ce que le code a décidé).
 */
const ROUNDS = 5;
const KEY = 'gulp_reflexe_best';

const rate = (ms) => {
  if (ms < 180) return { label: 'INHUMAIN', cls: 'text-[#CEFF00]' };
  if (ms < 230) return { label: 'ÉLITE', cls: 'text-[#CEFF00]' };
  if (ms < 290) return { label: 'SOLIDE', cls: 'text-green-400' };
  if (ms < 380) return { label: 'MOYEN', cls: 'text-orange-500' };
  return { label: 'DÉJÀ 3 PINTES ?', cls: 'text-red-500' };
};

export default function Reflexe() {
  const [stage, setStage] = useState('idle'); // idle | waiting | go | result | done
  const [results, setResults] = useState([]);
  const [last, setLast] = useState(null); // { ms, falseStart }
  const [newRecord, setNewRecord] = useState(false);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  });

  const stageRef = useRef('idle');
  const timeoutRef = useRef(0);
  const goTsRef = useRef(0);

  const setStageBoth = (s) => {
    stageRef.current = s;
    setStage(s);
  };

  const vibrate = (p) => {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* ignore */
    }
  };

  const armRound = useCallback(() => {
    setLast(null);
    setStageBoth('waiting');
    const delay = 1500 + Math.random() * 2500;
    timeoutRef.current = setTimeout(() => {
      // Le flash est daté à la frame qui l'affiche réellement.
      requestAnimationFrame((ts) => {
        goTsRef.current = ts;
        setStageBoth('go');
        vibrate(20);
      });
    }, delay);
  }, []);

  const finishRound = (entry) => {
    const next = [...results, entry];
    setResults(next);
    setLast(entry);
    if (next.length >= ROUNDS) {
      setStageBoth('done');
      const valid = next.filter((r) => !r.falseStart).map((r) => r.ms);
      const bestRound = valid.length ? Math.min(...valid) : null;
      if (bestRound != null && (best == null || bestRound < best)) {
        setBest(bestRound);
        setNewRecord(true);
        try {
          localStorage.setItem(KEY, String(Math.round(bestRound)));
        } catch {
          /* ignore */
        }
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ['#CEFF00', '#fff'] });
      }
    } else {
      setStageBoth('result');
    }
  };

  const onPointerDown = (e) => {
    const ts = e.timeStamp || performance.now();
    const st = stageRef.current;
    if (st === 'idle' || st === 'result') {
      armRound();
    } else if (st === 'waiting') {
      clearTimeout(timeoutRef.current);
      vibrate([80, 40, 80]);
      finishRound({ ms: 0, falseStart: true });
    } else if (st === 'go') {
      const ms = Math.max(0, ts - goTsRef.current);
      vibrate(30);
      finishRound({ ms, falseStart: false });
    }
  };

  const restart = () => {
    clearTimeout(timeoutRef.current);
    setResults([]);
    setLast(null);
    setNewRecord(false);
    setStageBoth('idle');
  };

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const bg =
    stage === 'go' ? 'bg-[#CEFF00] text-black' : stage === 'waiting' ? 'bg-red-950 text-white' : 'bg-zinc-950 text-white';

  const validResults = results.filter((r) => !r.falseStart);
  const avg = validResults.length ? validResults.reduce((a, b) => a + b.ms, 0) / validResults.length : null;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-1 min-h-[36px]">
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1">
          <Zap size={12} className="text-[#CEFF00]" /> Réflexe · manche {Math.min(results.length + 1, ROUNDS)}/{ROUNDS}
        </span>
        <div className="flex items-center gap-1">
          {best != null && <span className="text-[11px] text-zinc-400">Record {Math.round(best)} ms</span>}
          <button onClick={restart} className="w-9 h-9 -mr-2 flex items-center justify-center text-zinc-400" aria-label="Recommencer">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div
        onPointerDown={stage === 'done' ? undefined : onPointerDown}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`flex-1 min-h-[240px] rounded-3xl border-4 border-zinc-800 flex flex-col items-center justify-center text-center px-6 select-none transition-colors duration-100 ${bg}`}
      >
        {stage === 'idle' && (
          <>
            <p className="text-3xl font-black uppercase">Tape pour commencer</p>
            <p className="text-sm opacity-60 mt-2">Attends le flash néon, puis tape le plus vite possible.</p>
          </>
        )}
        {stage === 'waiting' && <p className="text-3xl font-black uppercase animate-pulse">Attends…</p>}
        {stage === 'go' && <p className="text-5xl font-black uppercase">TAPE !</p>}
        {stage === 'result' && last && (
          <>
            {last.falseStart ? (
              <p className="text-3xl font-black uppercase text-red-500">Faux départ</p>
            ) : (
              <>
                <p className="text-6xl font-black font-mono tabular-nums">{Math.round(last.ms)}</p>
                <p className={`text-sm font-black tracking-widest mt-1 ${rate(last.ms).cls}`}>ms · {rate(last.ms).label}</p>
              </>
            )}
            <p className="text-xs opacity-60 mt-4">Tape pour la manche suivante</p>
          </>
        )}
        {stage === 'done' && (
          <>
            <p className="text-xs uppercase tracking-widest opacity-60 font-bold">
              {validResults.length > 0
                ? `Moyenne sur ${validResults.length} manche${validResults.length > 1 ? 's' : ''} valide${validResults.length > 1 ? 's' : ''}`
                : 'Cinq faux départs. Respire.'}
            </p>
            <p className="text-6xl font-black font-mono tabular-nums">{avg != null ? Math.round(avg) : '—'}</p>
            {avg != null && <p className={`text-sm font-black tracking-widest mt-1 ${rate(avg).cls}`}>ms · {rate(avg).label}</p>}
            {newRecord && <p className="text-sm font-black text-[#CEFF00] mt-2">Nouveau record : {Math.round(best)} ms</p>}
            <button onClick={restart} className="mt-6 px-6 py-3 rounded-xl bg-[#CEFF00] text-black font-bold active:scale-95">
              Rejouer
            </button>
          </>
        )}
      </div>

      <div className="flex gap-1.5 mt-3 justify-center min-h-[28px]">
        {results.map((r, i) => (
          <span
            key={i}
            className={`text-xs font-bold px-2 py-1 rounded-lg ${r.falseStart ? 'bg-red-500/20 text-red-400' : 'bg-zinc-900 text-zinc-300'}`}
          >
            {r.falseStart ? 'FD' : Math.round(r.ms)}
          </span>
        ))}
      </div>
    </div>
  );
}
