import React, { useState } from 'react';
import { Flame, Check, X, Beer, RefreshCw } from 'lucide-react';
import { DEFIS, VERITES, PENALITES, fillCard } from '../content';
import useDeck from '../useDeck';
import usePlayers from '../usePlayers';
import useLevel from '../useLevel';
import { GameSetup, GameHeader, ScoreRow } from './GameFrame';

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** ACTION OU VÉRITÉ — le joueur choisit, la carte tombe, il assume ou il boit. */
export default function ActionVerite() {
  const { players, setPlayers } = usePlayers(2);
  const [level, setLevel] = useLevel();
  const [stage, setStage] = useState('setup');
  const [turn, setTurn] = useState(0);
  const [card, setCard] = useState(null); // { kind, text, remaining }
  const [scores, setScores] = useState({});
  const [penalty, setPenalty] = useState(null);
  const actions = useDeck('av_action', DEFIS, level);
  const verites = useDeck('av_verite', VERITES, level);

  const current = players[turn % players.length];

  const pick = (kind) => {
    const raw = (kind === 'action' ? actions : verites).draw();
    setPenalty(null);
    setCard({ kind, text: fillCard(raw.t, players, current), remaining: raw.remaining });
  };
  const next = () => {
    setTurn((t) => t + 1);
    setCard(null);
    setPenalty(null);
  };
  const done = () => {
    setScores((s) => ({ ...s, [current]: (s[current] || 0) + 1 }));
    next();
  };
  const pass = () => setPenalty(fillCard(rand(PENALITES), players, current));

  if (stage === 'setup') {
    return (
      <GameSetup
        title="Action ou Vérité"
        icon={Flame}
        description="Le grand classique. Tu choisis, tu assumes. Passer = pénalité tirée au sort."
        players={players}
        setPlayers={setPlayers}
        level={level}
        setLevel={setLevel}
        onStart={() => {
          setTurn(0);
          setScores({});
          setCard(null);
          setPenalty(null);
          setStage('play');
        }}
      >
        <p className="text-[11px] text-zinc-600">
          {actions.total} actions · {verites.total} vérités à ce niveau.
        </p>
      </GameSetup>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <GameHeader label={`Action ou Vérité · niveau ${level}`} onSettings={() => setStage('setup')} />
      <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Au tour de</p>
      <p className="text-3xl font-black text-[#CEFF00] mb-3">{current}</p>

      <div className="flex-1 flex flex-col">
        {!card ? (
          <div className="flex-1 grid grid-rows-2 gap-3 min-h-[240px]">
            <button
              onClick={() => pick('action')}
              className="rounded-3xl bg-[#CEFF00] text-black font-black text-3xl uppercase italic active:scale-[0.98] transition-transform"
            >
              Action
            </button>
            <button
              onClick={() => pick('verite')}
              className="rounded-3xl bg-sky-400 text-black font-black text-3xl uppercase italic active:scale-[0.98] transition-transform"
            >
              Vérité
            </button>
          </div>
        ) : (
          <div
            className={`flex-1 min-h-[240px] rounded-3xl border-4 ${
              card.kind === 'action' ? 'border-[#CEFF00]' : 'border-sky-400'
            } bg-zinc-950 p-5 flex flex-col animate-in`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest uppercase text-zinc-400">
                {card.kind === 'action' ? 'ACTION' : 'VÉRITÉ'}
              </span>
              <span className="text-[11px] text-zinc-600">{card.remaining} restantes</span>
            </div>
            <p className="flex-1 flex items-center text-xl font-bold leading-snug py-4">{card.text}</p>
            {penalty ? (
              <div className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-center">
                <p className="text-[11px] uppercase tracking-widest text-red-400 font-bold">Pénalité</p>
                <p className="font-black text-lg flex items-center justify-center gap-2">
                  <Beer size={18} className="shrink-0" /> {current}, {penalty}
                </p>
                <button onClick={next} className="mt-2 px-4 py-2 text-sm font-bold underline text-zinc-300">
                  Joueur suivant
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => pick(card.kind)}
                  className="w-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center active:scale-95"
                  aria-label="Changer de carte, sans pénalité"
                >
                  <RefreshCw size={16} />
                </button>
                <button onClick={pass} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white font-bold flex items-center justify-center gap-2 active:scale-95">
                  <X size={18} /> Passe
                </button>
                <button onClick={done} className="flex-1 py-3 rounded-xl bg-[#CEFF00] text-black font-bold flex items-center justify-center gap-2 active:scale-95">
                  <Check size={18} /> Fait
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <ScoreRow players={players} scores={scores} current={current} />
    </div>
  );
}
