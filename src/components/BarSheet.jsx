import React, { useEffect, useMemo, useState } from 'react';
import { Beer, Clock, MapPin, Navigation, Trophy, X } from 'lucide-react';
import Button from './ui/Button';
import { useUser } from '../contexts/UserContext';
import { formatDistance } from '../services/barService';
import { subscribeToBarRanking } from '../services/performanceService';
import { formatPrice, subscribeToBarPrices, summarizePrices } from '../services/priceService';
import { formatSeconds, getTimerColor } from '../utils/performance';

const ago = (ts) => {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1) return "aujourd'hui";
  if (days < 31) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  return months < 12 ? `il y a ${months} mois` : "il y a plus d'un an";
};

const medal = (i) =>
  i === 0 ? 'bg-[#CEFF00] text-black' : i === 1 ? 'bg-zinc-500 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400';

/** Fiche d'un bar : classement du bar, et prix de la pinte quand il est connu (lecture seule). */
export default function BarSheet({ bar, onClose }) {
  const { user } = useUser();
  const [reports, setReports] = useState([]);
  const [ranking, setRanking] = useState(null);

  const barId = bar?.id;
  useEffect(() => {
    if (!barId) return undefined;
    setReports([]);
    setRanking(null);
    const offPrices = subscribeToBarPrices(barId, setReports);
    const offRanking = subscribeToBarRanking(barId, setRanking);
    return () => {
      offPrices();
      offRanking();
    };
  }, [barId]);

  const price = useMemo(() => summarizePrices(reports, user.id), [reports, user.id]);

  if (!bar) return null;

  const directions = () =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${bar.lat},${bar.lng}&travelmode=walking`, '_blank', 'noopener');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Fiche de ${bar.name}`}
        className="w-full max-w-md max-h-[88dvh] overflow-y-auto bg-zinc-950 border-t-2 border-[#CEFF00] rounded-t-3xl p-5 pb-8 animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-black leading-tight break-words">{bar.name}</h2>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">
                {[bar.address, bar.city].filter(Boolean).join(', ') || 'Adresse non renseignée'}
                {Number.isFinite(bar.distance) && ` · ${formatDistance(bar.distance)}`}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 -mr-2 -mt-1 shrink-0 flex items-center justify-center text-zinc-400" aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        <div className={`grid gap-3 mt-4 ${price.pinte != null ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Prix (affiché seulement s'il est connu) */}
          {price.pinte != null && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1.5">
              <Beer size={13} className="text-[#CEFF00]" /> La pinte
            </p>
            <p className="text-2xl font-black tabular-nums mt-1 text-white">{formatPrice(price.pinte)}</p>
            {price.happy != null && (
              <p className="text-xs font-bold text-[#CEFF00] mt-0.5">Happy hour {formatPrice(price.happy)}</p>
            )}
            <p className="text-[10px] text-zinc-500 mt-1 leading-snug">Mis à jour {ago(price.lastUpdate)}</p>
          </div>
          )}

          {/* Classement */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3.5">
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1.5">
              <Trophy size={13} className="text-[#CEFF00]" /> Record du bar
            </p>
            {ranking && ranking.length > 0 ? (
              <>
                <p className={`text-2xl font-black tabular-nums mt-1 ${getTimerColor(ranking[0].timeMs, 'Pinte')}`}>
                  {formatSeconds(ranking[0].timeMs)} s
                </p>
                <p className="text-xs font-bold text-zinc-300 mt-0.5 truncate">{ranking[0].userName}</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {ranking.length} joueur{ranking.length > 1 ? 's' : ''} classé{ranking.length > 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-zinc-700 mt-1">—</p>
                <p className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  {ranking === null ? 'Chargement…' : 'Personne ici pour l’instant. Le record est à prendre.'}
                </p>
              </>
            )}
          </div>
        </div>

        {bar.happyHours && (
          <p className="text-xs text-zinc-400 mt-3 flex items-center gap-1.5">
            <Clock size={13} className="text-[#CEFF00] shrink-0" /> Happy hour : {bar.happyHours}
          </p>
        )}

        {/* Classement complet */}
        {ranking && ranking.length > 0 && (
          <div className="mt-5">
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Classement du bar · pinte</p>
            <div className="space-y-1.5">
              {ranking.slice(0, 10).map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900 border ${
                    r.userId === user.id ? 'border-[#CEFF00]' : 'border-zinc-800'
                  }`}
                >
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-black text-xs ${medal(i)}`}>{i + 1}</span>
                  <span className="flex-1 min-w-0 font-bold truncate">
                    {r.userName || 'Anonyme'}
                    {r.userId === user.id && <span className="text-[#CEFF00] text-xs"> · toi</span>}
                  </span>
                  <span className={`font-black tabular-nums ${getTimerColor(r.timeMs, 'Pinte')}`}>{formatSeconds(r.timeMs)} s</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full mt-5 flex items-center justify-center gap-2" onClick={directions}>
          <Navigation size={16} /> Y aller
        </Button>
      </div>
    </div>
  );
}
