import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Swords, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FORMATS, MIN_PLAUSIBLE_MS, formatSeconds } from '../utils/performance';
import usePlayers from './usePlayers';
import PlayersEditor from './PlayersEditor';
import Button from '../components/ui/Button';
import { SettingsButton } from './party/GameFrame';

/**
 * DUEL — 2 joueurs, 1 téléphone posé au milieu de la table.
 *
 * Écran coupé en deux, la moitié du haut est retournée pour le joueur d'en
 * face. Chacun pose son pouce sur sa zone : quand les deux sont posés, un
 * délai aléatoire (0.8–2 s, pour empêcher d'anticiper) puis GO. Le premier à
 * relever son pouce avant le GO fait un faux départ. Ensuite chacun tape sa
 * zone quand son verre est vide. Départ commun daté au même instant pour les
 * deux, arrêts datés au timeStamp du tap : la comparaison est équitable à la
 * milliseconde près. Un tap avant le temps minimum plausible est ignoré
 * (doigt qui retombe par réflexe), il ne peut ni gagner ni perdre la manche.
 */
const vibrate = (p) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* ignore */
  }
};

export default function Duel() {
  const { players, setPlayers } = usePlayers(2, 2);
  const [format, setFormat] = useState('Pinte');
  const [stage, setStage] = useState('setup'); // setup | ready | countdown | racing | done
  const [armed, setArmed] = useState([false, false]);
  const [times, setTimes] = useState([null, null]);
  const [winner, setWinner] = useState(null);
  const [wins, setWins] = useState([0, 0]);
  const [message, setMessage] = useState('');

  const stageRef = useRef('setup');
  const armedRef = useRef([false, false]);
  const timesRef = useRef([null, null]);
  const startTsRef = useRef(0);
  const goTimeoutRef = useRef(0);
  const rafRef = useRef(0);
  const displayRefs = [useRef(null), useRef(null)];
  const pointerIds = useRef([null, null]);

  const setStageBoth = (s) => {
    stageRef.current = s;
    setStage(s);
  };
  const setArmedBoth = (a) => {
    armedRef.current = a;
    setArmed(a);
  };
  const setTimesBoth = (t) => {
    timesRef.current = t;
    setTimes(t);
  };

  const cancelAll = () => {
    clearTimeout(goTimeoutRef.current);
    cancelAnimationFrame(rafRef.current);
  };

  const paint = useCallback(() => {
    const now = performance.now();
    for (let i = 0; i < 2; i++) {
      const el = displayRefs[i].current;
      if (!el) continue;
      const t = timesRef.current[i];
      el.textContent = formatSeconds(t != null ? t : now - startTsRef.current);
    }
    if (stageRef.current === 'racing') rafRef.current = requestAnimationFrame(paint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = () => {
    startTsRef.current = performance.now();
    setTimesBoth([null, null]);
    setStageBoth('racing');
    vibrate([60, 40, 60]);
    rafRef.current = requestAnimationFrame(paint);
  };

  const startCountdown = () => {
    setStageBoth('countdown');
    setMessage('');
    const delay = 800 + Math.random() * 1200;
    goTimeoutRef.current = setTimeout(go, delay);
  };

  const falseStart = (i) => {
    cancelAll();
    setArmedBoth([false, false]);
    setStageBoth('ready');
    setMessage(`Faux départ de ${players[i]} ! On repose les pouces.`);
    vibrate([100, 50, 100]);
  };

  const finish = (t) => {
    cancelAll();
    setStageBoth('done');
    const w = t[0] <= t[1] ? 0 : 1;
    setWinner(w);
    setWins((prev) => prev.map((n, i) => (i === w ? n + 1 : n)));
    setMessage(`${players[w]} gagne de ${formatSeconds(Math.abs(t[0] - t[1]), 3)} s !`);
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: w === 0 ? 0.25 : 0.75 },
      colors: ['#CEFF00', '#fff'],
    });
    // Repeindre une dernière fois avec les temps figés.
    requestAnimationFrame(paint);
  };

  const onDown = (i) => (e) => {
    if (pointerIds.current[i] != null) return;
    pointerIds.current[i] = e.pointerId;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    const ts = e.timeStamp || performance.now();
    const st = stageRef.current;

    if (st === 'ready') {
      const next = [...armedRef.current];
      next[i] = true;
      setArmedBoth(next);
      vibrate(15);
      if (next[0] && next[1]) startCountdown();
      return;
    }
    if (st === 'racing' && timesRef.current[i] == null) {
      const elapsed = ts - startTsRef.current;
      if (elapsed < MIN_PLAUSIBLE_MS[format]) {
        vibrate(10); // trop tôt pour être un verre vide : on ignore
        return;
      }
      const next = [...timesRef.current];
      next[i] = elapsed;
      setTimesBoth(next);
      vibrate(30);
      if (next[0] != null && next[1] != null) finish(next);
    }
  };

  const onUp = (i) => (e) => {
    if (pointerIds.current[i] !== e.pointerId) return;
    pointerIds.current[i] = null;
    const st = stageRef.current;
    if (st === 'ready') {
      const next = [...armedRef.current];
      next[i] = false;
      setArmedBoth(next);
    } else if (st === 'countdown') {
      falseStart(i);
    }
  };

  const resetRound = () => {
    cancelAll();
    pointerIds.current = [null, null];
    setArmedBoth([false, false]);
    setTimesBoth([null, null]);
    setWinner(null);
    setMessage('');
    setStageBoth('ready');
    displayRefs.forEach((r) => r.current && (r.current.textContent = '0.00'));
  };

  const backToSetup = () => {
    cancelAll();
    setStageBoth('setup');
  };

  useEffect(() => () => cancelAll(), []);

  if (stage === 'setup') {
    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-2 text-[#CEFF00]">
          <Swords size={20} />
          <h2 className="font-black italic uppercase text-lg">Duel</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Pose le téléphone au milieu. Chacun garde son pouce sur sa zone, GO surprise, on lève, on boit, et le premier
          verre vide qui tape gagne la manche.
        </p>
        <PlayersEditor players={players} setPlayers={setPlayers} min={2} max={2} />
        <div className="grid grid-cols-4 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              aria-pressed={format === f}
              className={`py-2.5 rounded-xl border text-sm font-bold ${
                format === f ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button
          className="w-full"
          onClick={() => {
            setWins([0, 0]);
            resetRound();
          }}
        >
          Lancer le duel
        </Button>
      </div>
    );
  }

  // Fonction de rendu (pas un composant) : un composant défini ici serait
  // remonté à chaque render et perdrait les refs d'affichage.
  const renderPad = (i, flipped) => {
    const isArmed = armed[i];
    const done = times[i] != null;
    const won = stage === 'done' && winner === i;
    const live = stage === 'racing' && !done;
    const bg =
      stage === 'countdown' ? 'bg-red-950' : live || won ? 'bg-[#CEFF00]' : isArmed ? 'bg-zinc-800' : 'bg-zinc-950';
    const fg = live || won ? 'text-black' : 'text-white';
    return (
      <div
        onPointerDown={onDown(i)}
        onPointerUp={onUp(i)}
        onPointerCancel={onUp(i)}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`flex-1 min-h-[140px] flex flex-col items-center justify-center rounded-3xl border-4 transition-colors duration-150 select-none ${bg} ${fg} ${
          isArmed && stage === 'ready' ? 'border-[#CEFF00]' : 'border-zinc-800'
        } ${flipped ? 'rotate-180' : ''}`}
      >
        <p className="text-xs uppercase tracking-widest font-bold opacity-70">
          {players[i]} · {wins[i]} {wins[i] > 1 ? 'manches' : 'manche'}
        </p>
        <div ref={displayRefs[i]} className="text-6xl font-black font-mono tabular-nums my-2">
          0.00
        </div>
        <p className="text-sm font-bold uppercase text-center px-3">
          {stage === 'ready' && (isArmed ? 'Prêt ✔' : 'Pose ton pouce')}
          {stage === 'countdown' && 'Attends…'}
          {stage === 'racing' && (done ? 'Fini' : 'GO ! Bois, puis tape')}
          {stage === 'done' && (won ? '🏆 Vainqueur' : `${formatSeconds(times[i], 3)} s`)}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 gap-2">
      {renderPad(0, true)}
      <div className="flex items-center justify-between gap-2 min-h-[36px]">
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold shrink-0">{format}</span>
        <span className="text-xs text-center flex-1 text-[#CEFF00] font-bold leading-tight" role="status">
          {message || (stage === 'ready' ? 'Les deux pouces posés = départ' : '')}
        </span>
        <SettingsButton onClick={backToSetup} />
      </div>
      {renderPad(1, false)}
      {stage === 'done' && (
        <Button className="w-full flex items-center justify-center gap-2" onClick={resetRound}>
          <RotateCcw size={16} /> Revanche
        </Button>
      )}
    </div>
  );
}
