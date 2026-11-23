import React, { useState } from 'react';
import { Trophy, Flag } from 'lucide-react';
import confetti from 'canvas-confetti';
import usePlayers from '../usePlayers';
import Button from '../../components/ui/Button';
import { GameSetup, GameHeader } from './GameFrame';

const HORSES = [
  { id: 0, s: '♠', name: 'Pique', color: 'text-white' },
  { id: 1, s: '♥', name: 'Cœur', color: 'text-red-500' },
  { id: 2, s: '♦', name: 'Carreau', color: 'text-red-500' },
  { id: 3, s: '♣', name: 'Trèfle', color: 'text-white' },
];
const TRACK = 8; // cases pour gagner
const TRAPS = [2, 4, 6]; // colonnes pièges : quand tous les chevaux les dépassent, un cheval recule
const SIPS = [1, 2, 3, 5];
const DEFAULT_SIPS = 2;

function makeDeck() {
  // 48 cartes (52 − les 4 As qui sont les chevaux)
  const d = [];
  for (let i = 0; i < 12; i++) for (const h of HORSES) d.push(h.id);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * PMU — course de chevaux aux cartes. Chacun parie sur une couleur et mise
 * des gorgées. On retourne une carte, le cheval de cette couleur avance.
 * Pièges : quand tous les chevaux ont passé une colonne piège, on retourne
 * une carte et ce cheval recule d'une case. Perdants boivent leur mise,
 * gagnants distribuent le double.
 */
export default function PMU() {
  const { players, setPlayers } = usePlayers(1);
  const [stage, setStage] = useState('setup');
  const [bets, setBets] = useState({}); // prénom -> { horse, sips }
  const [pos, setPos] = useState([0, 0, 0, 0]);
  const [deck, setDeck] = useState([]);
  const [last, setLast] = useState(null); // { horse, trap }
  const [trapsDone, setTrapsDone] = useState([]);
  const [winner, setWinner] = useState(null);

  const setBet = (name, patch) => setBets((b) => ({ ...b, [name]: { sips: DEFAULT_SIPS, ...b[name], ...patch } }));

  const missing = players.filter((p) => bets[p]?.horse == null);

  const start = () => {
    setPos([0, 0, 0, 0]);
    setDeck(makeDeck());
    setLast(null);
    setTrapsDone([]);
    setWinner(null);
    setStage('race');
  };

  const flip = () => {
    if (winner != null || deck.length === 0) return;
    const [h, ...rest] = deck;
    const nextPos = [...pos];
    nextPos[h] = Math.min(TRACK, nextPos[h] + 1);
    let trapHorse = null;
    let restDeck = rest;

    // Piège : tous les chevaux ont dépassé une colonne non encore jouée ?
    const minPos = Math.min(...nextPos);
    const trap = TRAPS.find((t) => !trapsDone.includes(t) && minPos >= t);
    if (trap != null && nextPos[h] < TRACK && restDeck.length > 0) {
      const [th, ...r2] = restDeck;
      restDeck = r2;
      trapHorse = th;
      nextPos[th] = Math.max(0, nextPos[th] - 1);
      setTrapsDone((d) => [...d, trap]);
    }

    setPos(nextPos);
    setDeck(restDeck);
    setLast({ horse: h, trap: trapHorse });
    try {
      navigator.vibrate?.(trapHorse != null ? [60, 40, 60] : 20);
    } catch {
      /* ignore */
    }
    const w = nextPos.findIndex((p) => p >= TRACK);
    if (w !== -1) {
      setWinner(w);
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.4 }, colors: ['#CEFF00', '#fff'] });
    }
  };

  if (stage === 'setup') {
    return (
      <GameSetup
        title="PMU"
        icon={Trophy}
        description="Chacun parie sur une couleur et mise des gorgées. Une carte retournée = ce cheval avance. Attention aux pièges. Les perdants boivent leur mise, les gagnants distribuent le double."
        players={players}
        setPlayers={setPlayers}
        min={1}
        withLevel={false}
        onStart={start}
        startLabel={missing.length ? `Il manque le pari de ${missing[0]}` : 'Départ !'}
        startDisabled={missing.length > 0}
      >
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Paris (cheval + gorgées)</p>
          {players.map((p) => (
            <div key={p} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold text-sm truncate">{p}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {SIPS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setBet(p, { sips: n })}
                      aria-label={`${p} mise ${n} gorgée${n > 1 ? 's' : ''}`}
                      aria-pressed={(bets[p]?.sips || DEFAULT_SIPS) === n}
                      className={`w-9 h-8 rounded-lg text-xs font-black ${
                        (bets[p]?.sips || DEFAULT_SIPS) === n ? 'bg-[#CEFF00] text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <span className="text-[10px] text-zinc-500 ml-1">gorg.</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {HORSES.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setBet(p, { horse: h.id })}
                    aria-label={`${p} parie sur ${h.name}`}
                    aria-pressed={bets[p]?.horse === h.id}
                    className={`py-2 rounded-lg text-xl font-black border ${
                      bets[p]?.horse === h.id ? 'bg-[#CEFF00]/15 border-[#CEFF00]' : 'bg-zinc-950 border-zinc-800'
                    } ${h.color}`}
                  >
                    {h.s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GameSetup>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <GameHeader label={`PMU · ${deck.length} cartes`} onSettings={() => setStage('setup')} />

      {/* Piste */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-3 space-y-2">
        {HORSES.map((h) => (
          <div key={h.id} className="relative h-9">
            <div className="absolute inset-0 flex">
              {Array.from({ length: TRACK + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r border-zinc-800/60 last:border-0 ${
                    TRAPS.includes(i) ? (trapsDone.includes(i) ? 'bg-zinc-900/40' : 'bg-red-500/10') : ''
                  } ${i === TRACK ? 'bg-[#CEFF00]/10' : ''}`}
                />
              ))}
            </div>
            <div
              className={`absolute top-0 h-9 w-9 flex items-center justify-center text-2xl font-black transition-all duration-500 ease-out ${h.color} ${
                winner === h.id ? 'scale-125' : ''
              }`}
              style={{ left: `calc(${(pos[h.id] / TRACK) * 100}% - ${(pos[h.id] / TRACK) * 36}px)` }}
            >
              {h.s}
            </div>
          </div>
        ))}
        <div className="flex justify-between text-[10px] text-zinc-600 px-1">
          <span>Départ</span>
          <span className="text-red-400/70">rouge = piège</span>
          <span className="flex items-center gap-1">
            <Flag size={10} /> Arrivée
          </span>
        </div>
      </div>

      {/* Dernière carte */}
      <div className="mt-3 text-center min-h-[60px]" role="status">
        {winner != null ? (
          <div className="animate-in">
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Vainqueur</p>
            <p className={`text-4xl font-black ${HORSES[winner].color}`}>
              {HORSES[winner].s} {HORSES[winner].name}
            </p>
          </div>
        ) : last ? (
          <div className="animate-in">
            <p className="text-sm">
              <span className={`text-2xl font-black ${HORSES[last.horse].color}`}>{HORSES[last.horse].s}</span> avance
              {last.trap != null && (
                <>
                  {' '}
                  · piège : <span className={`text-2xl font-black ${HORSES[last.trap].color}`}>{HORSES[last.trap].s}</span>{' '}
                  recule
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Retourne une carte pour lancer la course</p>
        )}
      </div>

      {/* Résultats */}
      {winner != null && (
        <div className="mt-2 rounded-xl bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
          {players.map((p) => {
            const b = { horse: 0, sips: DEFAULT_SIPS, ...bets[p] };
            const won = b.horse === winner;
            return (
              <p key={p} className="text-sm flex justify-between gap-3">
                <span className="font-semibold truncate">
                  {won ? '🏆' : '🍺'} {p} <span className={`${HORSES[b.horse].color} font-black`}>{HORSES[b.horse].s}</span>
                </span>
                <span className={`shrink-0 font-bold ${won ? 'text-[#CEFF00]' : 'text-red-400'}`}>
                  {won ? `distribue ${b.sips * 2}` : `boit ${b.sips}`}
                </span>
              </p>
            );
          })}
        </div>
      )}

      <div className="mt-auto pt-3">
        {winner != null ? (
          <Button className="w-full" onClick={() => setStage('setup')}>
            Nouvelle course
          </Button>
        ) : (
          <button
            onClick={flip}
            className="w-full py-5 rounded-2xl bg-[#CEFF00] text-black font-black text-xl uppercase active:scale-[0.98] transition-transform"
          >
            Retourner une carte
          </button>
        )}
      </div>
    </div>
  );
}
