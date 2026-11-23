import React, { useMemo, useState } from 'react';
import { Layers, Shuffle, Check, X, Beer, RefreshCw } from 'lucide-react';
import { DEFIS, VERITES, JAMAIS, PENALITES, LEVELS, fillCard } from './content';
import useDeck from './useDeck';
import usePlayers from './usePlayers';
import useLevel from './useLevel';
import PlayersEditor from './PlayersEditor';
import Button from '../components/ui/Button';
import { GoldenRule, ScoreRow, SettingsButton } from './party/GameFrame';

const DECKS = [
  { id: 'gage', label: 'Gage', items: DEFIS },
  { id: 'verite', label: 'Vérité', items: VERITES },
  { id: 'jamais', label: 'Jamais', items: JAMAIS },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

export default function Cartes() {
  const { players, setPlayers } = usePlayers(2);
  const [stage, setStage] = useState('setup');
  const [level, setLevel] = useLevel();
  const [deckId, setDeckId] = useState('mix');
  const [turn, setTurn] = useState(0);
  const [card, setCard] = useState(null);
  const [scores, setScores] = useState({});
  const [penalty, setPenalty] = useState(null);

  const gages = useDeck('gage', DEFIS, level);
  const verites = useDeck('verite', VERITES, level);
  const jamais = useDeck('jamais', JAMAIS, level);
  const decks = useMemo(() => ({ gage: gages, verite: verites, jamais }), [gages, verites, jamais]);

  const current = players[turn % players.length];

  const drawCard = () => {
    const kind = deckId === 'mix' ? rand(['gage', 'gage', 'verite', 'jamais']) : deckId;
    const raw = decks[kind].draw();
    setPenalty(null);
    setCard({
      kind,
      level: raw.l,
      text: fillCard(raw.t, players, current),
      remaining: raw.remaining,
      total: raw.total,
    });
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

  const pass = () => {
    setPenalty(fillCard(rand(PENALITES), players, current));
  };

  const kindLabel = { gage: 'GAGE', verite: 'VÉRITÉ', jamais: "JE N'AI JAMAIS" };
  const kindColor = { gage: 'border-[#CEFF00]', verite: 'border-sky-400', jamais: 'border-fuchsia-400' };

  if (stage === 'setup') {
    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-2 text-[#CEFF00]">
          <Layers size={20} />
          <h2 className="font-black italic uppercase text-lg">Mix</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Gages, vérités et « je n'ai jamais ». Aucune carte ne revient avant que tout le paquet soit passé. Choisis le niveau, personne ne pourra dire qu'il ne savait pas.
        </p>
        <PlayersEditor players={players} setPlayers={setPlayers} min={2} />

        <div>
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Niveau max</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.id}
                onClick={() => setLevel(lv.id)}
                className={`py-3 rounded-xl border text-sm font-bold ${
                  level === lv.id ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {lv.emoji} {lv.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Paquet</p>
          <div className="grid grid-cols-4 gap-2">
            {[{ id: 'mix', label: 'Mix' }, ...DECKS].map((d) => (
              <button
                key={d.id}
                onClick={() => setDeckId(d.id)}
                className={`py-2 rounded-xl border text-xs font-bold ${
                  deckId === d.id ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-2">
            {gages.total} gages · {verites.total} vérités · {jamais.total} "jamais" à ce niveau
          </p>
        </div>

        <GoldenRule />
        <Button className="w-full" onClick={() => { setTurn(0); setScores({}); setCard(null); setPenalty(null); setStage('play'); }}>
          Distribuer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-1 min-h-[36px]">
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
          {LEVELS.find((l) => l.id === level)?.emoji} {deckId === 'mix' ? 'Mix' : DECKS.find((d) => d.id === deckId)?.label}
        </span>
        <SettingsButton onClick={() => setStage('setup')} />
      </div>
      <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Au tour de</p>
      <p className="text-3xl font-black text-[#CEFF00] mb-3">{current}</p>

      <div className="flex-1 flex flex-col">
        {!card ? (
          <button
            onClick={drawCard}
            className="flex-1 min-h-[220px] rounded-3xl border-4 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 active:scale-[0.98] transition-transform"
          >
            <Shuffle size={36} className="mb-3" />
            <span className="font-bold uppercase tracking-widest text-sm">Tirer une carte</span>
          </button>
        ) : (
          <div className={`flex-1 min-h-[220px] rounded-3xl border-4 ${kindColor[card.kind]} bg-zinc-950 p-5 flex flex-col animate-in`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest uppercase text-zinc-400">{kindLabel[card.kind]}</span>
              <span className="text-[11px] text-zinc-600">
                {LEVELS.find((l) => l.id === card.level)?.emoji} · {card.remaining} restantes
              </span>
            </div>
            <p className="flex-1 flex items-center text-xl font-bold leading-snug py-4">
              {card.kind === 'jamais' ? `Je n'ai jamais ${card.text}` : card.text}
            </p>
            {penalty ? (
              <div className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-center">
                <p className="text-[11px] uppercase tracking-widest text-red-400 font-bold">Pénalité</p>
                <p className="font-black text-lg flex items-center justify-center gap-2">
                  <Beer size={18} /> {current}, {penalty}
                </p>
                <button onClick={next} className="mt-2 text-xs underline text-zinc-400">
                  Joueur suivant
                </button>
              </div>
            ) : card.kind === 'jamais' ? (
              <Button onClick={next} className="w-full">
                Ceux qui l'ont fait boivent → suivant
              </Button>
            ) : (
              <div className="flex gap-2">
                <button onClick={drawCard} className="w-12 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center active:scale-95" aria-label="Changer de carte, sans pénalité">
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
