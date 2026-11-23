import React, { useEffect, useRef, useState } from 'react';
import { Timer, Check, X } from 'lucide-react';
import { SEPT_SECONDES } from './banks';
import { fillCard } from '../content';
import useDeck from '../useDeck';
import usePlayers from '../usePlayers';
import useLevel from '../useLevel';
import { GameSetup, GameHeader, ScoreRow } from './GameFrame';

const DURATION = 7000;

/**
 * 7 SECONDES — un défi, 7 secondes, la table juge.
 * Le compte à rebours est une barre pilotée par rAF (fluide, pas de re-render),
 * bip haptique à 3-2-1, buzz à zéro.
 */
export default function SeptSecondes() {
  const { players, setPlayers } = usePlayers(2);
  const [level, setLevel] = useLevel();
  const [stage, setStage] = useState('setup'); // setup | play | ready | running | judge
  const [turn, setTurn] = useState(0);
  const [card, setCard] = useState(null);
  const [scores, setScores] = useState({});
  const deck = useDeck('sept', SEPT_SECONDES, level);

  const barRef = useRef(null);
  const numRef = useRef(null);
  const rafRef = useRef(0);
  const lastSecRef = useRef(-1);

  const current = players[turn % players.length];

  const vibrate = (p) => {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* ignore */
    }
  };

  const drawCard = () => {
    const raw = deck.draw();
    setCard({ ...raw, t: fillCard(raw.t, players, current) });
    setStage('ready');
  };

  const start = () => {
    setStage('running');
    const t0 = performance.now();
    lastSecRef.current = -1;
    const frame = (now) => {
      const remaining = Math.max(0, DURATION - (now - t0));
      if (barRef.current) barRef.current.style.transform = `scaleX(${remaining / DURATION})`;
      const sec = Math.ceil(remaining / 1000);
      if (numRef.current) numRef.current.textContent = (remaining / 1000).toFixed(1);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        if (sec <= 3 && sec > 0) vibrate(30);
      }
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        vibrate([120, 60, 120]);
        setStage('judge');
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  const judge = (ok) => {
    cancelAnimationFrame(rafRef.current);
    if (ok) setScores((s) => ({ ...s, [current]: (s[current] || 0) + 1 }));
    setTurn((t) => t + 1);
    setCard(null);
    setStage('play');
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (stage === 'setup') {
    return (
      <GameSetup
        title="7 secondes"
        icon={Timer}
        description="Un défi, 7 secondes chrono, la table juge. Raté = tu bois. Réussi = tu distribues 2 gorgées."
        players={players}
        setPlayers={setPlayers}
        level={level}
        setLevel={setLevel}
        onStart={() => {
          setTurn(0);
          setScores({});
          setCard(null);
          setStage('play');
        }}
      >
        <p className="text-[11px] text-zinc-600">{deck.total} défis à ce niveau.</p>
      </GameSetup>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <GameHeader
        label={`7 secondes · niveau ${level}`}
        onSettings={() => {
          cancelAnimationFrame(rafRef.current);
          setStage('setup');
        }}
      />
      <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Au tour de</p>
      <p className="text-3xl font-black text-[#CEFF00] mb-3">{current}</p>

      <div className="flex-1 flex flex-col">
        {stage === 'play' && (
          <button
            onClick={drawCard}
            className="flex-1 min-h-[220px] rounded-3xl border-4 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 active:scale-[0.98] transition-transform"
          >
            <Timer size={36} className="mb-3" />
            <span className="font-bold uppercase tracking-widest text-sm">Tirer un défi</span>
          </button>
        )}

        {stage !== 'play' && card && (
          <div className="flex-1 min-h-[220px] rounded-3xl border-4 border-[#CEFF00] bg-zinc-950 p-5 flex flex-col animate-in">
            <p className="flex-1 flex items-center text-2xl font-black leading-snug py-2 text-center justify-center">{card.t}</p>

            {stage === 'ready' && (
              <>
                <button
                  onClick={start}
                  className="w-full py-4 rounded-2xl bg-[#CEFF00] text-black font-black text-xl uppercase active:scale-95"
                >
                  Go (7 s)
                </button>
                <button onClick={drawCard} className="mt-2 w-full py-2 text-xs text-zinc-500 underline">
                  Changer de défi
                </button>
              </>
            )}

            {stage === 'running' && (
              <div>
                <div ref={numRef} className="text-6xl font-black font-mono tabular-nums text-center mb-2">
                  7.0
                </div>
                <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                  <div ref={barRef} className="h-full bg-[#CEFF00] origin-left will-change-transform" style={{ transform: 'scaleX(1)' }} />
                </div>
                <button
                  onClick={() => {
                    cancelAnimationFrame(rafRef.current);
                    setStage('judge');
                  }}
                  className="mt-3 w-full py-2 text-xs text-zinc-500 underline"
                >
                  Fini avant la fin
                </button>
              </div>
            )}

            {stage === 'judge' && (
              <div>
                <p className="text-center text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">La table juge</p>
                <div className="flex gap-2">
                  <button onClick={() => judge(false)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95">
                    <X size={18} /> Raté
                  </button>
                  <button onClick={() => judge(true)} className="flex-1 py-3 rounded-xl bg-[#CEFF00] text-black font-bold flex items-center justify-center gap-2 active:scale-95">
                    <Check size={18} /> Réussi
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <ScoreRow players={players} scores={scores} current={current} />
    </div>
  );
}
