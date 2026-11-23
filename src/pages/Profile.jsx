import React, { useMemo, useState } from 'react';
import { Edit2, LogOut, TrendingUp, Trash2, Trophy, Upload, User, UserX } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SignInCard from '../components/SignInCard';
import { useUser } from '../contexts/UserContext';
import useMyPerformances from '../hooks/useMyPerformances';
import { FORMATS, formatSeconds, getTierLabel, getTimerColor, getPerformanceTier } from '../utils/performance';
import {
  bestByFormat,
  deletePerformance,
  dismissGuestImport,
  getGuestPerformances,
  importGuestPerformances,
  isGuestImportDismissed,
} from '../services/performanceService';
import { MAX_NAME } from '../services/userService';

const rankTitle = (n) => (n >= 50 ? 'Légende' : n >= 20 ? 'Habitué' : n >= 5 ? 'Rookie' : 'Nouveau');

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Avatar({ user }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="w-20 h-20 rounded-full bg-zinc-800 border-4 border-[#CEFF00] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(206,255,0,0.2)] overflow-hidden">
      {user.photoURL && !broken ? (
        <img
          src={user.photoURL}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <User size={40} className="text-zinc-500" />
      )}
    </div>
  );
}

/** Proposition de rattacher au compte les perfs faites en visiteur sur ce téléphone. */
function GuestImport({ user }) {
  const [state, setState] = useState(() =>
    isGuestImportDismissed() ? 'hidden' : getGuestPerformances().length ? 'offer' : 'hidden'
  );
  const [count] = useState(() => getGuestPerformances().length);
  if (state === 'hidden') return null;
  if (state === 'done') {
    return <p className="text-sm text-[#CEFF00] font-bold text-center">Tes anciennes perfs sont dans ton compte.</p>;
  }
  return (
    <Card className="space-y-3">
      <p className="text-sm text-zinc-300">
        <b className="text-white">
          {count} perf{count > 1 ? 's' : ''} faite{count > 1 ? 's' : ''} en visiteur
        </b>{' '}
        sur ce téléphone. Les ajouter à ton compte ? Elles comptent dans tes records et tes clans, pas au classement général.
      </p>
      {state === 'error' && <p className="text-xs text-red-400">Import impossible pour le moment. Réessaie avec du réseau.</p>}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            dismissGuestImport();
            setState('hidden');
          }}
        >
          Non merci
        </Button>
        <Button
          className="flex-1 flex items-center justify-center gap-2"
          disabled={state === 'busy'}
          onClick={async () => {
            setState('busy');
            try {
              await importGuestPerformances(user);
              setState('done');
            } catch (e) {
              console.warn(e);
              setState('error');
            }
          }}
        >
          <Upload size={16} /> {state === 'busy' ? 'Import…' : 'Ajouter'}
        </Button>
      </div>
    </Card>
  );
}

export default function Profile() {
  const { user, loading, busy, authError, updateName, signOut, deleteAccount } = useUser();
  const { perfs } = useMyPerformances();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [confirm, setConfirm] = useState(null); // null | 'signout' | 'delete'

  const best = useMemo(() => bestByFormat(perfs), [perfs]);
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weeklyCount = perfs.filter((p) => p.createdAt >= weekAgo).length;
  const barsCount = new Set(perfs.filter((p) => p.barId).map((p) => p.barId)).size;

  const saveName = () => {
    updateName(nameInput);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-400">Chargement…</div>;
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex flex-col items-center pt-6">
        <Avatar user={user} />
        {isEditing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
          >
            <input
              type="text"
              value={nameInput}
              maxLength={MAX_NAME}
              onChange={(e) => setNameInput(e.target.value)}
              aria-label="Pseudo"
              className="w-44 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-[#CEFF00]"
              autoFocus
            />
            <Button type="submit" className="!px-4 !py-2" disabled={!nameInput.trim()}>
              OK
            </Button>
          </form>
        ) : (
          <button
            onClick={() => {
              setIsEditing(true);
              setNameInput(user.name);
            }}
            className="flex items-center gap-2 py-1"
            aria-label="Modifier mon pseudo"
          >
            <h2 className="text-xl font-black text-white">{user.name}</h2>
            <Edit2 size={14} className="text-zinc-500" />
          </button>
        )}
        <p className="text-[#CEFF00] font-bold text-xs mt-1 uppercase tracking-widest">{rankTitle(perfs.length)}</p>
        <p className="text-[11px] text-zinc-500 mt-2 text-center">
          {user.isGuest ? 'Visiteur : tes records restent sur ce téléphone.' : `Connecté avec Google · ${user.email}`}
        </p>
      </div>

      {user.isGuest ? (
        <SignInCard
          title="Crée ton compte en un clic"
          text="Avec ton compte Google, tes records sont sauvegardés, tu entres au classement et tu rejoins les clans de tes potes. Tes perfs de ce téléphone pourront y être ajoutées."
        />
      ) : (
        <GuestImport user={user} />
      )}

      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-[#CEFF00]" />
          Mes records
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {FORMATS.map((f) => {
            const p = best[f];
            return (
              <Card key={f} className="text-center">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{f}</p>
                <p className={`text-2xl font-black tabular-nums mt-1 ${p ? getTimerColor(p.timeMs, f) : 'text-zinc-700'}`}>
                  {p ? `${formatSeconds(p.timeMs)} s` : '—'}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                  {p ? `${getTierLabel(getPerformanceTier(p.timeMs, f))}${p.barName ? ` · ${p.barName}` : ''}` : 'Pas encore de temps'}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#CEFF00]" />
          En chiffres
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            [perfs.length, 'perfs'],
            [weeklyCount, 'cette semaine'],
            [barsCount, barsCount > 1 ? 'bars différents' : 'bar'],
          ].map(([value, label]) => (
            <Card key={label} className="text-center !p-3">
              <p className="text-2xl font-black text-white tabular-nums">{value}</p>
              <p className="text-[11px] text-zinc-500 leading-tight">{label}</p>
            </Card>
          ))}
        </div>
      </div>

      {perfs.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-3">Dernières perfs</h3>
          <Card className="!p-0 divide-y divide-zinc-800">
            {perfs.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {p.format} <span className="text-zinc-500 font-normal">· {p.barName || 'hors bar'}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatDate(p.createdAt)}
                    {p.ranked && <span className="text-[#CEFF00]"> · classée</span>}
                    {p.pending && <span> · en attente de réseau</span>}
                  </p>
                </div>
                <p className={`font-black tabular-nums ${getTimerColor(p.timeMs, p.format)}`}>{formatSeconds(p.timeMs)} s</p>
                <button
                  onClick={() => deletePerformance(user, p.id).catch(() => {})}
                  className="w-9 h-9 -mr-2 flex items-center justify-center text-zinc-600"
                  aria-label={`Supprimer cette perf (${p.format}, ${formatSeconds(p.timeMs)} s)`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {!user.isGuest && (
        <div className="pt-2 space-y-2">
          {authError && <p className="text-sm text-red-400 text-center">{authError}</p>}
          {confirm === 'delete' ? (
            <Card className="space-y-3 !border-red-900">
              <p className="text-sm text-zinc-300">
                Supprimer ton compte efface <b className="text-white">définitivement</b> tes perfs, ta place au classement
                et ta présence dans tes clans. Google va te redemander ton compte pour confirmer.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)} disabled={busy}>
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={busy}
                  onClick={async () => {
                    if (await deleteAccount()) setConfirm(null);
                  }}
                >
                  {busy ? 'Suppression…' : 'Supprimer'}
                </Button>
              </div>
            </Card>
          ) : confirm === 'signout' ? (
            <Card className="space-y-3">
              <p className="text-sm text-zinc-300">Te déconnecter ? Tout reste sauvegardé dans ton compte.</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setConfirm(null)}>
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    setConfirm(null);
                    await signOut();
                  }}
                >
                  Déconnexion
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => setConfirm('signout')}>
                <LogOut size={16} /> Se déconnecter
              </Button>
              <button
                onClick={() => setConfirm('delete')}
                className="w-full py-3 text-xs text-zinc-500 flex items-center justify-center gap-1.5"
              >
                <UserX size={14} /> Supprimer mon compte
              </button>
            </>
          )}
        </div>
      )}

      <p className="text-center text-[10px] text-zinc-600 uppercase tracking-widest">
        L'abus d'alcool est dangereux pour la santé
      </p>
    </div>
  );
}
