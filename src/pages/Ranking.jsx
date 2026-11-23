import React, { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { FORMATS, formatSeconds, getTimerColor } from '../utils/performance';
import Card from '../components/ui/Card';
import SignInCard from '../components/SignInCard';
import { useUser } from '../contexts/UserContext';
import useMyPerformances from '../hooks/useMyPerformances';
import { isFirebaseConfigured } from '../config/firebase';
import { RANKED_FORMAT, bestByFormat, subscribeToGlobalRanking } from '../services/performanceService';

const medal = (i) =>
  i === 0 ? 'bg-[#CEFF00] text-black' : i === 1 ? 'bg-zinc-500 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400';

/**
 * Classement général : uniquement les pintes chronométrées dans un bar,
 * une ligne par joueur. Visible par tous, y compris les visiteurs.
 */
export default function Ranking() {
  const { user } = useUser();
  const { perfs } = useMyPerformances();
  const [online, setOnline] = useState(isFirebaseConfigured ? null : false); // null = chargement, false = indisponible

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    setOnline(null);
    const off = subscribeToGlobalRanking(setOnline, () => setOnline(false));
    // Hors réseau, Firestore ne répond ni n'échoue : pas de « Chargement » sans fin.
    const timer = setTimeout(() => setOnline((v) => (v === null ? false : v)), 8000);
    return () => {
      clearTimeout(timer);
      off?.();
    };
  }, []);

  const myBest = useMemo(() => bestByFormat(perfs), [perfs]);
  const myRank = Array.isArray(online) && !user.isGuest ? online.findIndex((r) => r.userId === user.id) : -1;

  return (
    <div className="space-y-5 animate-in pt-4">
      <div>
        <div className="flex items-center gap-2">
          <Trophy size={24} className="text-[#CEFF00]" />
          <h2 className="text-2xl font-black italic uppercase">Classement</h2>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Meilleur temps de chaque joueur sur une {RANKED_FORMAT.toLowerCase()}, chronométrée dans un bar.
        </p>
      </div>

      {user.isGuest && isFirebaseConfigured && (
        <SignInCard title="Entre dans le classement" text="Connecte-toi avec Google : tes pintes chronométrées dans un bar y apparaîtront." />
      )}

      {online === null && <p className="text-center text-zinc-400 py-10">Chargement…</p>}

      {Array.isArray(online) && online.length === 0 && (
        <div className="text-center text-zinc-500 py-8">
          <p className="text-lg text-zinc-300 font-bold">Personne n'est encore classé</p>
          <p className="text-sm mt-1">La première pinte chronométrée dans un bar prend la tête.</p>
        </div>
      )}

      {Array.isArray(online) && online.length > 0 && (
        <div className="space-y-2">
          {myRank >= 0 && (
            <p className="text-xs text-[#CEFF00] font-bold">
              Tu es {myRank + 1}
              {myRank === 0 ? 'er' : 'e'} sur {online.length}.
            </p>
          )}
          {online.slice(0, 100).map((rank, i) => {
            const me = !user.isGuest && rank.userId === user.id;
            return (
              <Card key={rank.id} className={`flex items-center gap-3 !py-3 ${me ? '!border-[#CEFF00]' : ''}`}>
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-black text-sm ${medal(i)}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">
                    {rank.userName || 'Anonyme'}
                    {me && <span className="text-[#CEFF00] text-xs"> · toi</span>}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{rank.barName || ''}</p>
                </div>
                <div className={`font-black text-xl tabular-nums ${getTimerColor(rank.timeMs, rank.format)}`}>
                  {formatSeconds(rank.timeMs)} s
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {online === false && (
        <Card className="text-sm text-zinc-400">
          <p className="font-bold text-zinc-200">Classement en ligne indisponible</p>
          <p className="mt-1">
            {isFirebaseConfigured
              ? 'Pas de réseau pour le moment. Voilà tes records en attendant.'
              : 'Cette version tourne sans serveur. Tes temps sont gardés sur ton téléphone : voilà tes records.'}
          </p>
        </Card>
      )}

      <div>
        <h3 className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Mes records</h3>
        <div className="grid grid-cols-4 gap-2">
          {FORMATS.map((f) => (
            <Card key={f} className="text-center !p-2.5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">{f}</p>
              <p className={`font-black tabular-nums mt-0.5 ${myBest[f] ? getTimerColor(myBest[f].timeMs, f) : 'text-zinc-700'}`}>
                {myBest[f] ? formatSeconds(myBest[f].timeMs) : '—'}
              </p>
            </Card>
          ))}
        </div>
        {Object.keys(myBest).length === 0 && (
          <p className="text-xs text-zinc-600 mt-2">Lance le chrono et enregistre un temps pour remplir ce tableau.</p>
        )}
      </div>
    </div>
  );
}
