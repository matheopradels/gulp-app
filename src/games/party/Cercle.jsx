import React, { useState } from 'react';
import { CircleDot, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CERCLE_RULES } from './banks';
import usePlayers from '../usePlayers';
import Button from '../../components/ui/Button';
import { GameSetup, GameHeader } from './GameFrame';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
  { s: '♠', red: false },
  { s: '♥', red: true },
  { s: '♦', red: true },
  { s: '♣', red: false },
];

function shuffledDeck() {
  const cards = [];
  for (const r of RANKS) for (const su of SUITS) cards.push({ r, ...su });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * LE CERCLE — un jeu de 52 cartes virtuel, chaque valeur a sa règle.
 * Le 4e Roi boit le verre du centre et termine la partie.
 * L'app retient ce que la table oublie toujours : les règles inventées
 * (Valet) et les binômes de « potes » (8).
 */
export default function Cercle() {
  const { players, setPlayers } = usePlayers(2);
  const [stage, setStage] = useState('setup');
  const [deck, setDeck] = useState([]);
  const [turn, setTurn] = useState(0);
  const [card, setCard] = useState(null);
  const [kings, setKings] = useState(0);
  const [rules, setRules] = useState([]); // règles inventées (valets) + potes (8)
  const [ruleDraft, setRuleDraft] = useState('');
  const [buddy, setBuddy] = useState(null);

  const current = players[turn % players.length];
  const rule = card ? CERCLE_RULES[card.r] : null;

  const start = () => {
    setDeck(shuffledDeck());
    setTurn(0);
    setCard(null);
    setKings(0);
    setRules([]);
    setRuleDraft('');
    setBuddy(null);
    setStage('play');
  };

  const draw = () => {
    if (deck.length === 0) return;
    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);
    setRuleDraft('');
    setBuddy(null);
    try {
      navigator.vibrate?.(20);
    } catch {
      /* ignore */
    }
    if (c.r === 'K') {
      const k = kings + 1;
      setKings(k);
      if (k === 4) {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#CEFF00', '#fff', '#ef4444'] });
        try {
          navigator.vibrate?.([200, 80, 200]);
        } catch {
          /* ignore */
        }
      }
    }
  };

  const next = () => {
    const extra = [];
    if (card?.r === 'J' && ruleDraft.trim()) extra.push(`Règle de ${current} : ${ruleDraft.trim()}`);
    if (card?.r === '8' && buddy) extra.push(`${buddy} boit à chaque fois que ${current} boit`);
    if (extra.length) setRules((r) => [...r, ...extra]);
    setTurn((t) => t + 1);
    setCard(null);
  };

  const finished = kings >= 4 || (deck.length === 0 && !card);

  if (stage === 'setup') {
    return (
      <GameSetup
        title="Le Cercle"
        icon={CircleDot}
        description="Un verre au centre de la table (le Roi). Chacun tire une carte, chaque valeur a sa règle. Le 4e Roi boit le verre du centre."
        players={players}
        setPlayers={setPlayers}
        withLevel={false}
        onStart={start}
        startLabel="Mélanger"
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-400">
          {RANKS.map((r) => (
            <p key={r}>
              <span className="font-black text-white w-6 inline-block">{r}</span> {CERCLE_RULES[r].title}
            </p>
          ))}
        </div>
      </GameSetup>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <GameHeader
        label={`Le Cercle · ${deck.length} cartes`}
        onSettings={() => setStage('setup')}
        right={
          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
            <Crown size={12} /> {kings}/4
          </span>
        }
      />
      <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Au tour de</p>
      <p className="text-3xl font-black text-[#CEFF00] mb-3">{current}</p>

      <div className="flex-1 flex flex-col">
        {finished && !card ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center min-h-[220px]">
            <p className="text-2xl font-black">Partie terminée</p>
            <p className="text-sm text-zinc-400 mt-1">{kings >= 4 ? 'Le 4e Roi a bu le centre.' : 'Plus de cartes.'}</p>
            <Button className="mt-4" onClick={start}>
              Nouvelle partie
            </Button>
          </div>
        ) : !card ? (
          <button
            onClick={draw}
            className="flex-1 min-h-[220px] rounded-3xl border-4 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 active:scale-[0.98] transition-transform"
          >
            <div className="w-16 h-24 rounded-lg bg-zinc-900 border-2 border-zinc-700 mb-3 flex items-center justify-center text-2xl">🍺</div>
            <span className="font-bold uppercase tracking-widest text-sm">Tirer</span>
          </button>
        ) : (
          <div className="flex-1 min-h-[220px] rounded-3xl border-4 border-zinc-700 bg-zinc-950 p-5 flex flex-col animate-in">
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-16 h-24 shrink-0 rounded-lg bg-white flex flex-col items-center justify-center font-black text-3xl ${card.red ? 'text-red-600' : 'text-black'}`}>
                {card.r}
                <span className="text-xl">{card.s}</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Règle</p>
                <p className="text-2xl font-black text-[#CEFF00]">{rule.title}</p>
                {card.r === 'K' && (
                  <p className="text-xs text-amber-400 font-bold">
                    Roi n°{kings}
                    {kings === 4 ? ' — cul sec le centre !' : ''}
                  </p>
                )}
              </div>
            </div>
            <p className="flex-1 text-lg font-bold leading-snug mb-3">{rule.text}</p>
            {card.r === 'J' && (
              <input
                value={ruleDraft}
                onChange={(e) => setRuleDraft(e.target.value)}
                maxLength={80}
                placeholder="Écris la règle pour que personne ne l'oublie"
                aria-label="Nouvelle règle"
                enterKeyHint="done"
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="mb-3 w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 outline-none focus:border-[#CEFF00] placeholder:text-zinc-600"
              />
            )}
            {card.r === '8' && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {players
                  .filter((p) => p !== current)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setBuddy(buddy === p ? null : p)}
                      aria-pressed={buddy === p}
                      className={`px-3 py-2 rounded-xl border text-sm font-bold ${
                        buddy === p ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>
            )}
            <Button className="w-full" onClick={next}>
              {kings >= 4 ? 'Terminer' : 'Suivant'}
            </Button>
          </div>
        )}
      </div>

      {rules.length > 0 && (
        <div className="mt-3 rounded-xl bg-zinc-900 border border-zinc-800 p-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">En vigueur jusqu'à la fin</p>
          {rules.map((r, i) => (
            <p key={i} className="text-xs text-zinc-300">
              • {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
