import React, { lazy, Suspense, useState } from 'react';
import {
  Gamepad2,
  ChevronLeft,
  Flame,
  Beer,
  Scale,
  Hand,
  Timer,
  Brain,
  CircleDot,
  Star,
  Trophy,
  Coffee,
  Palette,
  VenetianMask,
  AlertOctagon,
  Disc3,
  Layers,
} from 'lucide-react';
import { DECK_CONFIGS } from '../games/party/deckConfigs';

// Chaque jeu est un chunk séparé : on ne télécharge que ce qu'on ouvre.
const DeckGame = lazy(() => import('../games/party/DeckGame'));
const ActionVerite = lazy(() => import('../games/party/ActionVerite'));
const SeptSecondes = lazy(() => import('../games/party/SeptSecondes'));
const Quiz = lazy(() => import('../games/party/Quiz'));
const Cercle = lazy(() => import('../games/party/Cercle'));
const PMU = lazy(() => import('../games/party/PMU'));
const Imposteur = lazy(() => import('../games/party/Imposteur'));
const Roulette = lazy(() => import('../games/Roulette'));
const Cartes = lazy(() => import('../games/Cartes'));

const GAMES = [
  { id: 'actionverite', title: 'Action ou Vérité', sub: 'Le classique, 3 niveaux', icon: Flame, hot: true },
  { id: 'jamais', title: "Je n'ai jamais", sub: 'Ceux qui l\'ont fait boivent', icon: Beer, deck: true },
  { id: 'prefere', title: 'Tu préfères', sub: 'La minorité boit', icon: Scale, deck: true },
  { id: 'quipourrait', title: 'Qui pourrait', sub: 'Pointez à 3', icon: Hand, deck: true },
  { id: 'sept', title: '7 secondes', sub: 'Un défi, 7 s, la table juge', icon: Timer },
  { id: 'quiz', title: 'Quiz', sub: 'Faux = tu bois', icon: Brain },
  { id: 'cercle', title: 'Le Cercle', sub: '52 cartes, 13 règles, 4 Rois', icon: CircleDot },
  { id: 'dixmais', title: "C'est un 10 mais…", sub: 'Note sur 10, le plus loin boit', icon: Star, deck: true },
  { id: 'pmu', title: 'PMU', sub: 'Course de chevaux, mises en gorgées', icon: Trophy },
  { id: 'briseglace', title: 'Brise-glace', sub: 'Pour commencer doucement', icon: Coffee, deck: true },
  { id: 'purple', title: 'Purple', sub: 'Rouge ou Bleu, unanimité = tous', icon: Palette, deck: true },
  { id: 'imposteur', title: 'Imposteur', sub: 'Un mot, un traître', icon: VenetianMask },
  { id: 'sansfiltre', title: 'Sans filtre', sub: 'Amitiés non garanties', icon: AlertOctagon, deck: true, hot: true },
  { id: 'roulette', title: 'Roulette', sub: 'La roue décide, défi inclus', icon: Disc3 },
  { id: 'cartes', title: 'Mix', sub: 'Gage / vérité / jamais mélangés', icon: Layers },
];

const Loader = () => <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Chargement…</div>;

function renderGame(id) {
  switch (id) {
    case 'actionverite':
      return <ActionVerite />;
    case 'sept':
      return <SeptSecondes />;
    case 'quiz':
      return <Quiz />;
    case 'cercle':
      return <Cercle />;
    case 'pmu':
      return <PMU />;
    case 'imposteur':
      return <Imposteur />;
    case 'roulette':
      return <Roulette />;
    case 'cartes':
      return <Cartes />;
    default:
      return DECK_CONFIGS[id] ? <DeckGame key={id} config={DECK_CONFIGS[id]} /> : null;
  }
}

export default function Jeux() {
  const [game, setGame] = useState(null);

  if (game) {
    return (
      <div className="flex flex-col flex-1 pt-3">
        <button onClick={() => setGame(null)} className="self-start flex items-center gap-1 text-xs text-zinc-400 font-bold uppercase tracking-widest h-9 -ml-1 pr-3">
          <ChevronLeft size={14} /> Jeux
        </button>
        <div className="flex-1 flex flex-col">
          <Suspense fallback={<Loader />}>{renderGame(game)}</Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 animate-in">
      <div className="flex items-center gap-2 mb-1">
        <Gamepad2 size={24} className="text-[#CEFF00]" />
        <h2 className="text-2xl font-black italic uppercase">Jeux</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Les modes chrono (Solo, Duel, Relais, Précision, Réflexe) sont dans l'onglet central.</p>

      <div className="grid grid-cols-2 gap-2.5">
        {GAMES.map(({ id, title, sub, icon: Icon, hot }) => (
          <button
            key={id}
            onClick={() => setGame(id)}
            className={`text-left rounded-2xl border p-3.5 active:scale-[0.97] transition-transform ${
              hot ? 'bg-[#CEFF00]/5 border-[#CEFF00]/40' : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <Icon size={22} className={hot ? 'text-[#CEFF00]' : 'text-zinc-300'} />
            <p className="font-black mt-2 leading-tight">{title}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{sub}</p>
          </button>
        ))}
      </div>

      <p className="pt-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
        L'abus d'alcool est dangereux pour la santé
      </p>
    </div>
  );
}
