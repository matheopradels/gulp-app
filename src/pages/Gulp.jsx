import React, { lazy, Suspense, useState } from 'react';
import { Timer, Swords, Users, Zap, Target } from 'lucide-react';
import Solo from '../games/Solo';

// Les autres modes ne se chargent que quand on les ouvre : le mode Solo
// (celui qu'on utilise 90 % du temps) reste léger.
const Duel = lazy(() => import('../games/Duel'));
const Relais = lazy(() => import('../games/Relais'));
const Reflexe = lazy(() => import('../games/Reflexe'));
const Precision = lazy(() => import('../games/Precision'));

const MODES = [
  { id: 'solo', label: 'Solo', icon: Timer },
  { id: 'duel', label: 'Duel', icon: Swords },
  { id: 'relais', label: 'Relais', icon: Users },
  { id: 'precision', label: 'Précision', icon: Target },
  { id: 'reflexe', label: 'Réflexe', icon: Zap },
];

const Loader = () => (
  <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Chargement…</div>
);

export default function Gulp({ selectedBar, setSelectedBar }) {
  const [mode, setMode] = useState('solo');

  return (
    <div className="flex flex-col flex-1 animate-in">
      <div className="text-center pt-4 pb-3 short:pt-2 short:pb-2">
        <h1 className="text-3xl font-black italic tracking-tighter text-[#CEFF00] leading-none">GULP!</h1>
        <p className="text-zinc-500 text-[11px] italic uppercase tracking-widest font-bold mt-1 short:hidden">
          Chrono de compétition
        </p>
      </div>

      {/* Sélecteur de mode */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide transition-all ${
              mode === id
                ? 'bg-[#CEFF00] text-black border-[#CEFF00]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 active:scale-95'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {mode === 'solo' && <Solo selectedBar={selectedBar} setSelectedBar={setSelectedBar} />}
        <Suspense fallback={<Loader />}>
          {mode === 'duel' && <Duel />}
          {mode === 'relais' && <Relais />}
          {mode === 'precision' && <Precision />}
          {mode === 'reflexe' && <Reflexe />}
        </Suspense>
      </div>

      <p className="pt-3 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
        L'abus d'alcool est dangereux pour la santé
      </p>
    </div>
  );
}
