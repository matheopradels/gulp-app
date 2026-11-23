import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { QUIZ } from './banks';
import useDeck from '../useDeck';
import usePlayers from '../usePlayers';
import Button from '../../components/ui/Button';
import { GameSetup, GameHeader, ScoreRow } from './GameFrame';

// Hors composant : même référence à chaque render, sinon le deck se recalcule.
const QUIZ_ITEMS = QUIZ.map((x) => ({ ...x, l: 1 }));

function shuffledOrder(n) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** QUIZ — 4 choix, tu te trompes tu bois, tu as juste tu distribues. */
export default function Quiz() {
  const { players, setPlayers } = usePlayers(1);
  const [stage, setStage] = useState('setup');
  const [turn, setTurn] = useState(0);
  const [q, setQ] = useState(null); // { q, choices: [{ text, correct }] }
  const [chosen, setChosen] = useState(null);
  const [scores, setScores] = useState({});
  const deck = useDeck('quiz', QUIZ_ITEMS, 3);

  const current = players[turn % players.length];

  const draw = () => {
    const raw = deck.draw();
    // Réponses mélangées : sinon on retient « c'était la B » au lieu de la réponse.
    const choices = shuffledOrder(raw.c.length).map((i) => ({ text: raw.c[i], correct: i === raw.a }));
    setChosen(null);
    setQ({ q: raw.q, choices });
  };
  const answer = (i) => {
    if (chosen != null) return;
    setChosen(i);
    const ok = q.choices[i].correct;
    if (ok) setScores((s) => ({ ...s, [current]: (s[current] || 0) + 1 }));
    try {
      navigator.vibrate?.(ok ? 30 : [80, 40, 80]);
    } catch {
      /* ignore */
    }
  };
  const next = () => {
    setTurn((t) => t + 1);
    setQ(null);
    setChosen(null);
  };

  if (stage === 'setup') {
    return (
      <GameSetup
        title="Quiz"
        icon={Brain}
        description="Culture G et culture bar, 4 choix. Faux = tu bois 2 gorgées. Juste = tu en distribues 2."
        players={players}
        setPlayers={setPlayers}
        min={1}
        withLevel={false}
        onStart={() => {
          setTurn(0);
          setScores({});
          setQ(null);
          setChosen(null);
          setStage('play');
        }}
      >
        <p className="text-[11px] text-zinc-600">{deck.total} questions, jamais deux fois la même avant la fin.</p>
      </GameSetup>
    );
  }

  const right = chosen != null && q.choices[chosen].correct;

  return (
    <div className="flex flex-col flex-1">
      <GameHeader label="Quiz" onSettings={() => setStage('setup')} />
      <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Au tour de</p>
      <p className="text-3xl font-black text-[#CEFF00] mb-3">{current}</p>

      <div className="flex-1 flex flex-col">
        {!q ? (
          <button
            onClick={draw}
            className="flex-1 min-h-[220px] rounded-3xl border-4 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 active:scale-[0.98] transition-transform"
          >
            <Brain size={36} className="mb-3" />
            <span className="font-bold uppercase tracking-widest text-sm">Question</span>
          </button>
        ) : (
          <div className="flex-1 flex flex-col animate-in">
            <div className="rounded-3xl border-4 border-[#CEFF00] bg-zinc-950 p-5 mb-3">
              <p className="text-lg font-bold leading-snug">{q.q}</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {q.choices.map((c, i) => {
                let cls = 'bg-zinc-900 border-zinc-800 text-white';
                if (chosen != null) {
                  if (c.correct) cls = 'bg-[#CEFF00] border-[#CEFF00] text-black';
                  else if (i === chosen) cls = 'bg-red-600 border-red-600 text-white';
                  else cls = 'bg-zinc-900 border-zinc-800 text-zinc-500';
                }
                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    disabled={chosen != null}
                    className={`py-3 px-4 rounded-xl border font-bold text-left transition-colors ${cls}`}
                  >
                    <span className="opacity-50 mr-2">{'ABCD'[i]}</span>
                    {c.text}
                  </button>
                );
              })}
            </div>
            {chosen != null && (
              <div className="mt-3">
                <p className={`text-center font-black mb-2 ${right ? 'text-[#CEFF00]' : 'text-red-400'}`} role="status">
                  {right ? `Juste ! ${current} distribue 2 gorgées.` : `Raté. ${current} boit 2 gorgées.`}
                </p>
                <Button className="w-full" onClick={next}>
                  Suivant
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      <ScoreRow players={players} scores={scores} current={current} />
    </div>
  );
}
