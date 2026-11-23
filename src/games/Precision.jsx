import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Target, Eye, EyeOff, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FORMATS, formatSeconds } from '../utils/performance';
import usePlayers from './usePlayers';
import PlayersEditor from './PlayersEditor';
import ChugButton from '../components/ChugButton';
import useChugTimer from '../hooks/useChugTimer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { SettingsButton } from './party/GameFrame';

/**
 * PRÉCISION — pas le plus rapide, le plus juste.
 * Tu choisis un intervalle (ex. 4 à 8 s), une machine à sous tire la cible
 * (ex. 6.2 s), chacun boit à son tour en essayant de finir pile dessus,
 * chrono caché par défaut. Le plus proche gagne, le plus loin boit.
 * Marche avec un format ou "à l'œil" (une quantité décidée à la table).
 */
const ALL_FORMATS = [...FORMATS, "À l'œil"];
const PRESETS = [
  [2, 4],
  [4, 8],
  [6, 12],
  [10, 20],
];
const TIMER_CLASS = 'timer-lg font-black font-mono tabular-nums leading-none mb-8 short:mb-4';

const vibrate = (p) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignore */
  }
};

const signed = (delta) => `${delta > 0 ? '+' : '−'}${formatSeconds(Math.abs(delta))} s`;

export default function Precision() {
  const { players, setPlayers } = usePlayers(1);
  const [format, setFormat] = useState('Demi');
  const [minS, setMinS] = useState(4);
  const [maxS, setMaxS] = useState(8);
  const [hidden, setHidden] = useState(true);
  const [stage, setStage] = useState('setup'); // setup | draw | play | done
  const [target, setTarget] = useState(null); // ms
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]); // { name, ms, delta }
  const [spinning, setSpinning] = useState(false);

  const reelRef = useRef(null);
  const rafRef = useRef(0);
  const displayRef = useRef(null);

  const valid = minS >= 0.5 && maxS > minS && maxS <= 120;

  // ---- Tirage façon machine à sous ----
  const drawTarget = () => {
    const t = Math.round((minS + Math.random() * (maxS - minS)) * 10) / 10; // 1 décimale
    setTarget(t * 1000);
    setSpinning(true);
    const duration = 2600;
    const t0 = performance.now();
    let lastChange = 0;
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const el = reelRef.current;
      if (p < 1) {
        const interval = 35 + 450 * p * p; // ralentit progressivement
        if (now - lastChange > interval && el) {
          lastChange = now;
          el.textContent = (minS + Math.random() * (maxS - minS)).toFixed(1);
          vibrate(5);
        }
        rafRef.current = requestAnimationFrame(frame);
      } else {
        if (el) el.textContent = t.toFixed(1);
        vibrate([40, 30, 80]);
        setSpinning(false);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ---- Chrono du joueur courant ----
  const getClassName = useCallback(() => `${TIMER_CLASS} text-white`, []);
  const formatDisplay = useCallback((ms) => (hidden ? '?.??' : formatSeconds(ms)), [hidden]);
  const { phase, result, holdProgress, bind, reset } = useChugTimer({ displayRef, getClassName, formatDisplay });

  const startRound = () => {
    cancelAnimationFrame(rafRef.current);
    reset();
    setResults([]);
    setIdx(0);
    setTarget(null);
    setStage('draw');
    // Laisse le DOM monter le reel avant de lancer l'animation.
    requestAnimationFrame(() => requestAnimationFrame(drawTarget));
  };

  const backToSetup = () => {
    cancelAnimationFrame(rafRef.current);
    setSpinning(false);
    reset();
    setStage('setup');
  };

  const current = players[idx];

  const confirmPlayer = () => {
    if (!result) return;
    const next = [...results, { name: current, ms: result.ms, delta: result.ms - target }];
    setResults(next);
    reset();
    if (idx + 1 >= players.length) {
      setStage('done');
      confetti({ particleCount: 130, spread: 90, origin: { y: 0.5 }, colors: ['#CEFF00', '#fff'] });
    } else {
      setIdx(idx + 1);
    }
  };

  const ranking = [...results].sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta));

  if (stage === 'setup') {
    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-2 text-[#CEFF00]">
          <Target size={20} />
          <h2 className="font-black italic uppercase text-lg">Précision</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Pas le plus rapide : le plus juste. La machine tire une cible dans ton intervalle, chacun essaie de finir pile
          dessus, chrono caché. Le plus loin boit.
        </p>
        <PlayersEditor players={players} setPlayers={setPlayers} min={1} />

        <div>
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Intervalle (secondes)</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0.5"
              aria-label="Minimum en secondes"
              value={minS}
              onChange={(e) => setMinS(Number(e.target.value))}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-center font-black text-xl outline-none focus:border-[#CEFF00]"
            />
            <span className="text-zinc-500 font-bold">à</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="1"
              aria-label="Maximum en secondes"
              value={maxS}
              onChange={(e) => setMaxS(Number(e.target.value))}
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-center font-black text-xl outline-none focus:border-[#CEFF00]"
            />
          </div>
          <div className="flex gap-1.5 mt-2">
            {PRESETS.map(([a, b]) => (
              <button
                key={a}
                onClick={() => {
                  setMinS(a);
                  setMaxS(b);
                }}
                className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                  minS === a && maxS === b ? 'border-[#CEFF00] text-[#CEFF00] bg-[#CEFF00]/10' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {a}–{b} s
              </button>
            ))}
          </div>
          {!valid && <p className="text-xs text-red-400 mt-2">Le minimum doit être d'au moins 0,5 s et inférieur au maximum (120 s au plus).</p>}
        </div>

        <div>
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Quantité</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {ALL_FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                aria-pressed={format === f}
                className={`shrink-0 px-3 py-2 rounded-xl border text-sm font-bold ${
                  format === f ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setHidden((h) => !h)}
          role="switch"
          aria-checked={hidden}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
        >
          <span className="font-bold text-sm flex items-center gap-2">
            {hidden ? <EyeOff size={16} /> : <Eye size={16} />} Chrono {hidden ? 'caché (au feeling)' : 'visible (trop facile)'}
          </span>
          <span className={`w-10 h-6 rounded-full relative transition ${hidden ? 'bg-[#CEFF00]' : 'bg-zinc-700'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${hidden ? 'left-5' : 'left-1'}`} />
          </span>
        </button>

        <Button className="w-full" disabled={!valid} onClick={startRound}>
          Tirer la cible
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-1 min-h-[36px]">
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
          {format} · {minS}–{maxS} s · {hidden ? "à l'aveugle" : 'chrono visible'}
        </span>
        <SettingsButton onClick={backToSetup} />
      </div>

      {/* Cible */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 py-3 text-center mb-3">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Cible</p>
        <div ref={reelRef} className={`text-5xl font-black font-mono tabular-nums ${spinning ? 'text-zinc-300' : 'text-[#CEFF00]'}`}>
          {target != null && !spinning ? (target / 1000).toFixed(1) : '–.–'}
        </div>
        <p className="text-[11px] text-zinc-600">secondes</p>
      </div>

      {stage === 'draw' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
          <Button disabled={spinning} onClick={() => setStage('play')} className="flex items-center gap-2">
            {spinning ? 'Ça tourne…' : `${players[0]} commence`} <ArrowRight size={16} />
          </Button>
        </div>
      )}

      {stage === 'play' && (
        <div className="flex-1 flex flex-col items-center justify-center py-2">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
            Joueur {idx + 1}/{players.length}
          </p>
          <p className="text-2xl font-black text-[#CEFF00] mb-3">{current}</p>
          <div ref={displayRef} className={`${TIMER_CLASS} text-white`}>
            {hidden ? '?.??' : '0.00'}
          </div>
          {phase !== 'stopped' ? (
            <>
              <ChugButton bind={bind} phase={phase} holdProgress={holdProgress} size={168} />
              <p className="mt-4 text-[11px] uppercase tracking-widest text-zinc-600 font-bold">
                {phase === 'running' ? 'Tape quand tu penses y être' : 'Maintiens ½ s pour partir'}
              </p>
            </>
          ) : (
            <Card className="w-full text-center animate-in">
              <p className="text-xs text-zinc-500 uppercase font-bold">Ton temps</p>
              <p className="text-4xl font-black tabular-nums">{formatSeconds(result.ms)} s</p>
              <p
                className={`text-sm font-bold mt-1 ${
                  Math.abs(result.ms - target) < 300
                    ? 'text-[#CEFF00]'
                    : Math.abs(result.ms - target) < 1000
                      ? 'text-orange-400'
                      : 'text-red-400'
                }`}
              >
                {signed(result.ms - target)} par rapport à la cible
              </p>
              <Button className="w-full mt-3" onClick={confirmPlayer}>
                {idx + 1 >= players.length ? 'Voir le classement' : 'Joueur suivant'}
              </Button>
            </Card>
          )}
        </div>
      )}

      {stage === 'done' && (
        <div className="flex-1 flex flex-col">
          <Card className="space-y-2.5 flex-1">
            {ranking.map((r, i) => (
              <div key={r.name} className="flex items-center justify-between text-sm gap-3">
                <span className="font-semibold truncate">
                  {i === 0 ? '🏆' : i === ranking.length - 1 && ranking.length > 1 ? '🍺' : `${i + 1}.`} {r.name}
                </span>
                <span className="tabular-nums shrink-0">
                  <span className="text-zinc-400 mr-2">{formatSeconds(r.ms)} s</span>
                  <span className={`font-black ${i === 0 ? 'text-[#CEFF00]' : 'text-zinc-300'}`}>{signed(r.delta)}</span>
                </span>
              </div>
            ))}
            {ranking.length > 1 && (
              <p className="text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
                🍺 {ranking[ranking.length - 1].name} est le plus loin de la cible : à boire !
              </p>
            )}
          </Card>
          <Button className="w-full mt-3" onClick={startRound}>
            Nouvelle cible
          </Button>
        </div>
      )}
    </div>
  );
}
