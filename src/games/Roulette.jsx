import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Disc3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import usePlayers from './usePlayers';
import useLevel from './useLevel';
import PlayersEditor from './PlayersEditor';
import Button from '../components/ui/Button';
import { DEFIS, LEVELS, fillCard } from './content';
import useDeck from './useDeck';
import { GoldenRule, SettingsButton } from './party/GameFrame';

/**
 * ROULETTE — la roue décide qui passe (et avec quel défi si "Défi" est activé).
 * Roue dessinée en canvas, animation rAF avec décélération cubique, résultat
 * déterminé AVANT l'animation (angle cible) pour que l'aiguille tombe exactement
 * sur le segment annoncé. Haptique à chaque passage de segment.
 */
const PALETTE = ['#CEFF00', '#18181b', '#a3e635', '#27272a', '#84cc16', '#3f3f46', '#d9f99d', '#52525b'];
const DARK_TEXT = new Set(['#CEFF00', '#a3e635', '#84cc16', '#d9f99d']);

// Ce que la roue fait boire avec le défi. Volontairement plafonné au demi :
// une roue qui impose une pinte ou un litre cul sec, c'est non.
const DRINKS = ['1 gorgée', '2 gorgées', '3 gorgées', 'Un galopin', 'Un demi'];
const DRINK_WEIGHTS = [3, 4, 3, 2, 1];

function pickDrink() {
  const total = DRINK_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < DRINKS.length; i++) {
    r -= DRINK_WEIGHTS[i];
    if (r < 0) return DRINKS[i];
  }
  return DRINKS[0];
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function Roulette() {
  const { players, setPlayers } = usePlayers(2);
  const [stage, setStage] = useState('setup'); // setup | wheel
  const [withDefi, setWithDefi] = useState(true);
  const [level, setLevel] = useLevel();
  const deck = useDeck('roulette', DEFIS, level);
  const [spinning, setSpinning] = useState(false);
  const [resultIdx, setResultIdx] = useState(null);
  const [defi, setDefi] = useState(null);
  const [drink, setDrink] = useState(null);

  const canvasRef = useRef(null);
  const angleRef = useRef(0); // rotation courante en radians
  const rafRef = useRef(0);
  const lastSegRef = useRef(-1);

  const n = players.length;
  const seg = (2 * Math.PI) / n;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth;
    if (!size) return;
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 6;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRef.current);
    for (let i = 0; i < n; i++) {
      // Avec un nombre impair de joueurs, le dernier segment toucherait le
      // premier avec la même couleur : on décale sa teinte.
      const color = PALETTE[(i === n - 1 && n % PALETTE.length === 1 ? i + 1 : i) % PALETTE.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * seg, (i + 1) * seg);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.rotate(i * seg + seg / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = DARK_TEXT.has(color) ? '#000' : '#fff';
      ctx.font = `800 ${Math.max(11, Math.min(18, 160 / n + 6))}px system-ui, sans-serif`;
      ctx.fillText(players[i].slice(0, 12), r - 14, 0);
      ctx.restore();
    }
    ctx.restore();

    // Moyeu
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.strokeStyle = '#CEFF00';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Aiguille (en haut, pointe vers le bas)
    ctx.beginPath();
    ctx.moveTo(cx - 12, 2);
    ctx.lineTo(cx + 12, 2);
    ctx.lineTo(cx, 30);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [n, seg, players]);

  useEffect(() => {
    if (stage === 'wheel') draw();
  }, [stage, draw]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResultIdx(null);
    setDefi(null);
    setDrink(null);

    const target = Math.floor(Math.random() * n);
    // L'aiguille est à -PI/2 (en haut). Le segment `target` doit finir centré dessous.
    const segCenter = target * seg + seg / 2;
    const finalAngle = -Math.PI / 2 - segCenter;
    const turns = 5 + Math.floor(Math.random() * 3);
    const start = angleRef.current;
    const normalizedStart = ((start % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let delta = finalAngle - normalizedStart;
    delta = ((delta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const total = delta + turns * 2 * Math.PI;
    const duration = 3800 + Math.random() * 800;
    const t0 = performance.now();

    const frame = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      angleRef.current = normalizedStart + total * easeOutCubic(p);
      // Haptique quand l'aiguille change de segment
      const under = Math.floor(((((-Math.PI / 2 - angleRef.current) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / seg);
      if (under !== lastSegRef.current) {
        lastSegRef.current = under;
        try {
          navigator.vibrate?.(8);
        } catch {
          /* ignore */
        }
      }
      draw();
      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setSpinning(false);
        setResultIdx(target);
        if (withDefi) {
          const c = deck.draw();
          setDefi(fillCard(c.t, players, players[target]));
          setDrink(pickDrink());
        }
        try {
          navigator.vibrate?.([60, 40, 120]);
        } catch {
          /* ignore */
        }
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 }, colors: ['#CEFF00', '#fff'] });
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const backToSetup = () => {
    cancelAnimationFrame(rafRef.current);
    setSpinning(false);
    setResultIdx(null);
    setStage('setup');
  };

  if (stage === 'setup') {
    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-2 text-[#CEFF00]">
          <Disc3 size={20} />
          <h2 className="font-black italic uppercase text-lg">Roulette</h2>
        </div>
        <p className="text-sm text-zinc-400">
          La roue choisit qui passe. Active « Défi » pour qu'elle impose aussi un défi : réussi, tu distribues les
          gorgées ; raté ou refusé, tu les bois.
        </p>
        <PlayersEditor players={players} setPlayers={setPlayers} min={2} />
        <button
          onClick={() => setWithDefi((v) => !v)}
          role="switch"
          aria-checked={withDefi}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
        >
          <span className="font-bold text-sm">Mode Défi</span>
          <span className={`w-10 h-6 rounded-full relative transition ${withDefi ? 'bg-[#CEFF00]' : 'bg-zinc-700'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${withDefi ? 'left-5' : 'left-1'}`} />
          </span>
        </button>
        {withDefi && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv.id}
                  onClick={() => setLevel(lv.id)}
                  aria-pressed={level === lv.id}
                  className={`py-3 rounded-xl border text-sm font-bold ${
                    level === lv.id ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {lv.emoji} {lv.label}
                </button>
              ))}
            </div>
            <GoldenRule />
          </>
        )}
        <Button className="w-full" onClick={() => setStage('wheel')}>
          Voir la roue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center">
      <div className="w-full flex items-center justify-between mb-1 min-h-[36px]">
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
          {n} joueurs{withDefi ? ' · défi' : ''}
        </span>
        <SettingsButton onClick={backToSetup} />
      </div>

      <canvas
        ref={canvasRef}
        onClick={spin}
        role="button"
        aria-label="Lancer la roue"
        className="w-full max-w-[320px] aspect-square rounded-full shadow-[0_0_40px_rgba(206,255,0,0.15)] cursor-pointer"
      />

      <div className="mt-5 text-center min-h-[120px] w-full" role="status">
        {resultIdx != null ? (
          <div className="animate-in">
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">C'est pour</p>
            <p className="text-3xl font-black text-[#CEFF00]">{players[resultIdx]}</p>
            {withDefi && defi && (
              <>
                <p className="text-sm text-zinc-200 mt-1 leading-snug">{defi}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  En jeu : <span className="font-black text-white">{drink}</span> (réussi = tu distribues, raté = tu bois)
                </p>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{spinning ? 'Ça tourne…' : 'Tape la roue pour lancer'}</p>
        )}
      </div>

      <Button className="w-full mt-auto" onClick={spin} disabled={spinning}>
        {resultIdx != null ? 'Relancer' : 'Lancer'}
      </Button>
    </div>
  );
}
