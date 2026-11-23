import React, { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { fillCard } from '../content';
import useDeck from '../useDeck';
import usePlayers from '../usePlayers';
import useLevel from '../useLevel';
import Button from '../../components/ui/Button';
import { GameSetup, GameHeader } from './GameFrame';

/**
 * Moteur générique "je tire une carte, je la lis, suivant".
 * Sert à : Je n'ai jamais, Tu préfères, Qui pourrait, C'est un 10 mais…,
 * Brise-glace, Purple, Sans filtre. Chaque jeu = une config, pas un composant.
 *
 * variant :
 *  - 'text'   : une phrase (t)
 *  - 'ab'     : deux options (a / b) — Tu préfères
 *  - 'purple' : deux camps (r / b) — Purple
 */
export default function DeckGame({ config }) {
  const {
    key,
    title,
    icon,
    description,
    items,
    variant = 'text',
    withLevel = true,
    minLevel = 1,
    perPlayer = true,
    prefix = '',
    footer = '',
    nextLabel = 'Suivant',
    accent = 'border-[#CEFF00]',
    minPlayers = 2,
  } = config;

  const { players, setPlayers } = usePlayers(minPlayers);
  const [level, setLevel] = useLevel(minLevel);
  const [stage, setStage] = useState('setup');
  const [turn, setTurn] = useState(0);
  const [card, setCard] = useState(null);
  const deck = useDeck(key, items, withLevel ? level : 3);

  const current = players[turn % players.length];

  const draw = () => {
    const raw = deck.draw();
    const fill = (s) => fillCard(s, players, current);
    setCard({
      ...raw,
      t: raw.t ? fill(raw.t) : undefined,
      a: raw.a ? fill(raw.a) : undefined,
      b: raw.b ? fill(raw.b) : undefined,
      r: raw.r ? fill(raw.r) : undefined,
    });
  };

  const next = () => {
    setTurn((t) => t + 1);
    setCard(null);
  };

  if (stage === 'setup') {
    return (
      <GameSetup
        title={title}
        icon={icon}
        description={description}
        players={players}
        setPlayers={setPlayers}
        min={minPlayers}
        level={level}
        setLevel={setLevel}
        withLevel={withLevel}
        minLevel={minLevel}
        onStart={() => {
          setTurn(0);
          setCard(null);
          setStage('play');
        }}
      >
        <p className="text-[11px] text-zinc-600">{deck.total} cartes à ce niveau, aucune répétition avant la fin du paquet.</p>
      </GameSetup>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <GameHeader label={`${title}${withLevel ? ` · niveau ${level}` : ''}`} onSettings={() => setStage('setup')} />

      {perPlayer && (
        <>
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Au tour de</p>
          <p className="text-3xl font-black text-[#CEFF00] mb-3">{current}</p>
        </>
      )}

      <div className="flex-1 flex flex-col">
        {!card ? (
          <button
            onClick={draw}
            className="flex-1 min-h-[220px] rounded-3xl border-4 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 active:scale-[0.98] transition-transform"
          >
            <Shuffle size={36} className="mb-3" />
            <span className="font-bold uppercase tracking-widest text-sm">Tirer une carte</span>
          </button>
        ) : (
          <div className={`flex-1 min-h-[220px] rounded-3xl border-4 ${accent} bg-zinc-950 p-5 flex flex-col animate-in`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest uppercase text-zinc-400">{title}</span>
              <span className="text-[11px] text-zinc-600">{card.remaining} restantes</span>
            </div>

            {variant === 'text' && (
              <p className="flex-1 flex items-center text-xl font-bold leading-snug py-4">
                {prefix}
                {card.t}
              </p>
            )}

            {variant === 'ab' && (
              <div className="flex-1 flex flex-col justify-center gap-3 py-4">
                <div className="rounded-2xl bg-[#CEFF00]/10 border border-[#CEFF00]/40 p-4 text-center">
                  <p className="text-lg font-bold leading-snug">{card.a}</p>
                </div>
                <p className="text-center text-xs uppercase tracking-widest text-zinc-500 font-black">ou</p>
                <div className="rounded-2xl bg-fuchsia-500/10 border border-fuchsia-400/40 p-4 text-center">
                  <p className="text-lg font-bold leading-snug">{card.b}</p>
                </div>
              </div>
            )}

            {variant === 'purple' && (
              <div className="flex-1 flex flex-col justify-center gap-3 py-4">
                <div className="rounded-2xl bg-red-500/15 border-2 border-red-500 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-red-400 font-black">Rouge</p>
                  <p className="text-lg font-bold leading-snug">{card.r}</p>
                </div>
                <div className="rounded-2xl bg-blue-500/15 border-2 border-blue-500 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-blue-400 font-black">Bleu</p>
                  <p className="text-lg font-bold leading-snug">{card.b}</p>
                </div>
              </div>
            )}

            {footer && <p className="text-xs text-zinc-500 text-center mb-3">{footer}</p>}
            <Button onClick={next} className="w-full">
              {nextLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
