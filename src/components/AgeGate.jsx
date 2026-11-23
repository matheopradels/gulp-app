import React, { useState } from 'react';
import { MapPin, ShieldCheck, Hand } from 'lucide-react';

const KEY = 'gulp_adult_ok';

export const hasPassedAgeGate = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Écran d'accueil au premier lancement : majorité, règle du jeu, usage de la position. */
export default function AgeGate({ onAccept }) {
  const [refused, setRefused] = useState(false);

  const accept = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    onAccept();
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10 animate-in">
      <h1 className="text-5xl font-black italic tracking-tighter text-[#CEFF00] leading-none">GULP!</h1>
      {refused ? (
        <>
          <p className="mt-6 text-xl font-black">Reviens quand tu auras 18 ans.</p>
          <p className="mt-2 text-sm text-zinc-400">GULP est une app de soirée réservée aux adultes.</p>
          <button onClick={() => setRefused(false)} className="mt-8 text-xs text-zinc-500 underline self-start">
            Je me suis trompé de bouton
          </button>
        </>
      ) : (
        <>
          <p className="mt-6 text-xl font-black">Réservé aux 18 ans et plus.</p>
          <ul className="mt-5 space-y-4 text-sm text-zinc-300">
            <li className="flex gap-3">
              <Hand size={18} className="text-[#CEFF00] shrink-0 mt-0.5" />
              <span>
                <b className="text-white">Personne n'est obligé.</b> Boire, répondre ou faire un gage reste un choix. Un gage
                qui implique quelqu'un d'autre ne se fait que si cette personne est d'accord.
              </span>
            </li>
            <li className="flex gap-3">
              <MapPin size={18} className="text-[#CEFF00] shrink-0 mt-0.5" />
              <span>
                Ta position sert uniquement à vérifier que tu es dans un bar quand tu classes une perf. Elle n'est ni
                enregistrée ni partagée, et tout le reste marche sans.
              </span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck size={18} className="text-[#CEFF00] shrink-0 mt-0.5" />
              <span>L'abus d'alcool est dangereux pour la santé. Bois de l'eau, et ne prends pas le volant.</span>
            </li>
          </ul>
          <button
            onClick={accept}
            className="mt-8 w-full py-4 rounded-2xl bg-[#CEFF00] text-black font-black text-lg active:scale-[0.98] transition-transform"
          >
            J'ai 18 ans ou plus
          </button>
          <button onClick={() => setRefused(true)} className="mt-3 w-full py-3 text-sm text-zinc-500 font-bold">
            J'ai moins de 18 ans
          </button>
        </>
      )}
    </div>
  );
}
