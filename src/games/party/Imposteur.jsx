import React, { useState } from 'react';
import { VenetianMask, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';
import { IMPOSTEUR_PAIRS } from './banks';
import useDeck from '../useDeck';
import usePlayers from '../usePlayers';
import Button from '../../components/ui/Button';
import { GameSetup, GameHeader, ScoreRow } from './GameFrame';

const PAIR_ITEMS = IMPOSTEUR_PAIRS.map(([a, b]) => ({ a, b, l: 1 }));

/**
 * IMPOSTEUR — tout le monde reçoit le même mot, sauf l'imposteur qui reçoit
 * un mot proche. Chacun décrit son mot en UN mot, à tour de rôle, puis on
 * vote. L'imposteur démasqué boit cul sec ; sinon, tous les autres boivent.
 */
export default function Imposteur() {
  const { players, setPlayers } = usePlayers(3);
  const [stage, setStage] = useState('setup'); // setup | reveal | discuss | vote | result
  const [words, setWords] = useState(null); // { civil, impostor, impostorIdx }
  const [revealIdx, setRevealIdx] = useState(0);
  const [showing, setShowing] = useState(false);
  const [seen, setSeen] = useState(false);
  const [voted, setVoted] = useState(null);
  const [scores, setScores] = useState({});
  const deck = useDeck('imposteur', PAIR_ITEMS, 3);

  const start = () => {
    const pair = deck.draw();
    const swap = Math.random() < 0.5;
    setWords({
      civil: swap ? pair.b : pair.a,
      impostor: swap ? pair.a : pair.b,
      impostorIdx: Math.floor(Math.random() * players.length),
    });
    setRevealIdx(0);
    setShowing(false);
    setSeen(false);
    setVoted(null);
    setStage('reveal');
  };

  const nextReveal = () => {
    setShowing(false);
    setSeen(false);
    if (revealIdx + 1 >= players.length) setStage('discuss');
    else setRevealIdx(revealIdx + 1);
  };

  const vote = (i) => {
    setVoted(i);
    const found = i === words.impostorIdx;
    setScores((s) => {
      const n = { ...s };
      if (found) players.forEach((p, idx) => idx !== words.impostorIdx && (n[p] = (n[p] || 0) + 1));
      else n[players[words.impostorIdx]] = (n[players[words.impostorIdx]] || 0) + 2;
      return n;
    });
    if (!found) confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#a855f7', '#fff'] });
    setStage('result');
  };

  if (stage === 'setup' || !words) {
    return (
      <GameSetup
        title="Imposteur"
        icon={VenetianMask}
        description="Tout le monde reçoit le même mot, sauf l'imposteur qui en reçoit un proche. Chacun décrit son mot en un seul mot, à tour de rôle. Puis on vote. Démasqué = cul sec. Pas démasqué = tout le monde boit."
        players={players}
        setPlayers={setPlayers}
        min={3}
        withLevel={false}
        onStart={() => {
          setScores({});
          start();
        }}
        startLabel="Distribuer les mots"
      />
    );
  }

  const first = (words.impostorIdx + 1) % players.length;
  const impostorName = players[words.impostorIdx];

  return (
    <div className="flex flex-col flex-1">
      <GameHeader label="Imposteur" onSettings={() => setStage('setup')} />

      {stage === 'reveal' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
            Passe le téléphone à · {revealIdx + 1}/{players.length}
          </p>
          <p className="text-3xl font-black text-[#CEFF00] mb-6">{players[revealIdx]}</p>
          <button
            onPointerDown={() => {
              setShowing(true);
              setSeen(true);
            }}
            onPointerUp={() => setShowing(false)}
            onPointerLeave={() => setShowing(false)}
            onPointerCancel={() => setShowing(false)}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none' }}
            className={`w-full min-h-[180px] rounded-3xl border-4 flex flex-col items-center justify-center select-none transition-colors ${
              showing ? 'bg-zinc-950 border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            {showing ? (
              <>
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Ton mot</p>
                <p className="text-4xl font-black px-3">{revealIdx === words.impostorIdx ? words.impostor : words.civil}</p>
              </>
            ) : (
              <>
                <Eye size={28} className="text-zinc-500 mb-2" />
                <p className="text-sm font-bold text-zinc-400">Maintiens pour voir ton mot</p>
                <p className="text-[11px] text-zinc-600">Cache l'écran aux autres</p>
              </>
            )}
          </button>
          <Button className="w-full mt-4" onClick={nextReveal} disabled={!seen}>
            {!seen ? "Regarde d'abord ton mot" : revealIdx + 1 >= players.length ? 'Tout le monde a vu' : 'Vu, joueur suivant'}
          </Button>
        </div>
      )}

      {stage === 'discuss' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <VenetianMask size={40} className="text-[#CEFF00] mb-3" />
          <p className="text-xl font-black">Un mot chacun</p>
          <p className="text-sm text-zinc-400 mt-2">
            En commençant par <span className="text-[#CEFF00] font-bold">{players[first]}</span>, chacun décrit son mot
            en un seul mot. Faites 2 tours si besoin. Ni le mot, ni trop évident : l'imposteur écoute.
          </p>
          <Button className="w-full mt-6" onClick={() => setStage('vote')}>
            Passer au vote
          </Button>
        </div>
      )}

      {stage === 'vote' && (
        <div className="flex-1 flex flex-col">
          <p className="text-center text-sm text-zinc-400 mb-3">
            Qui est l'imposteur ? Votez à main levée, puis tapez le prénom le plus accusé.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p, i) => (
              <button key={p} onClick={() => vote(i)} className="py-4 px-2 rounded-2xl bg-zinc-900 border border-zinc-800 font-bold active:scale-95 truncate">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center animate-in">
          {voted === words.impostorIdx ? (
            <>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Démasqué</p>
              <p className="text-3xl font-black text-[#CEFF00]">{impostorName}</p>
              <p className="text-sm text-zinc-300 mt-2">était l'imposteur. Cul sec.</p>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Raté</p>
              <p className="text-3xl font-black text-purple-400">{impostorName}</p>
              <p className="text-sm text-zinc-300 mt-2">
                était l'imposteur, vous avez accusé {players[voted]}. Tout le monde boit sauf {impostorName}.
              </p>
            </>
          )}
          <p className="text-xs text-zinc-500 mt-4">
            Mot commun : <span className="text-white font-bold">{words.civil}</span> · Mot de l'imposteur :{' '}
            <span className="text-white font-bold">{words.impostor}</span>
          </p>
          <Button className="w-full mt-6" onClick={start}>
            Nouvelle manche
          </Button>
        </div>
      )}

      <ScoreRow players={players} scores={scores} />
    </div>
  );
}
