import React from 'react';
import { Cloud, Trophy, Users } from 'lucide-react';
import GoogleButton from './GoogleButton';
import { useUser } from '../contexts/UserContext';
import { getPendingInvite } from '../services/inviteService';

/** Deuxième écran du premier lancement : compte Google ou visiteur. */
export default function Welcome({ onDone }) {
  const { continueAsGuest } = useUser();
  const invite = getPendingInvite();
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10 animate-in">
      <h1 className="text-5xl font-black italic tracking-tighter text-[#CEFF00] leading-none">GULP!</h1>
      {invite && (
        <div className="mt-6 rounded-2xl bg-[#CEFF00] text-black px-4 py-3">
          <p className="font-black">Un pote t'invite dans son clan 🍻</p>
          <p className="text-sm font-medium">Connecte-toi avec Google : tu y entres directement.</p>
        </div>
      )}
      <p className="mt-6 text-xl font-black">Ton compte, en un clic.</p>
      <ul className="mt-5 space-y-4 text-sm text-zinc-300">
        <li className="flex gap-3">
          <Cloud size={18} className="text-[#CEFF00] shrink-0 mt-0.5" />
          <span>Tes records sont sauvegardés, même si tu changes de téléphone.</span>
        </li>
        <li className="flex gap-3">
          <Trophy size={18} className="text-[#CEFF00] shrink-0 mt-0.5" />
          <span>Tes pintes chronométrées dans un bar entrent au classement général.</span>
        </li>
        <li className="flex gap-3">
          <Users size={18} className="text-[#CEFF00] shrink-0 mt-0.5" />
          <span>Tu crées ton clan et tu invites tes potes avec un code.</span>
        </li>
      </ul>
      <GoogleButton className="mt-8" onSignedIn={onDone} />
      <button
        onClick={() => {
          continueAsGuest();
          onDone();
        }}
        className="mt-3 w-full py-3 text-sm text-zinc-400 font-bold"
      >
        Continuer en visiteur
      </button>
      <p className="text-[11px] text-zinc-600 text-center">
        En visiteur, tout marche, mais tes records restent sur ce téléphone. Tu pourras te connecter plus tard depuis ton
        profil.
      </p>
    </div>
  );
}
