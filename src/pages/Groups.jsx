import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Copy, LogIn, LogOut, Plus, Share2, Trash2, Trophy, Users, WifiOff } from 'lucide-react';
import SignInCard from '../components/SignInCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useUser } from '../contexts/UserContext';
import { isFirebaseConfigured } from '../config/firebase';
import { FORMATS } from '../utils/performance';
import {
  MAX_GROUP_MEMBERS,
  addMemberToGroup,
  createGroup,
  deleteGroup,
  getGroupByJoinCode,
  removeMemberFromGroup,
  subscribeToUserGroups,
} from '../services/groupService';
import { groupLeaderboard, subscribeToGroupWeek } from '../services/performanceService';
import { clearPendingInvite, getPendingInvite, inviteUrl, parseJoinCode } from '../services/inviteService';

const inviteLink = (group) => inviteUrl(group.joinCode);

export default function Groups() {
  const { user } = useUser();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [weekPerfs, setWeekPerfs] = useState([]);
  const [format, setFormat] = useState('Pinte');
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState(false);

  const online = isFirebaseConfigured && user?.online;
  const selectedGroup = groups.find((g) => g.id === selectedId) || null;

  useEffect(() => {
    if (!online) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return subscribeToUserGroups(
      user.id,
      (list) => {
        setGroups(list);
        setLoading(false);
        setUnavailable(false);
      },
      () => {
        setLoading(false);
        setUnavailable(true);
      }
    );
  }, [online, user?.id]);

  const memberKey = selectedGroup ? (selectedGroup.memberIds || []).join(',') : '';
  useEffect(() => {
    if (!selectedGroup) return undefined;
    setWeekPerfs([]);
    return subscribeToGroupWeek(selectedGroup.memberIds, setWeekPerfs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, memberKey]);

  const leaderboard = useMemo(() => groupLeaderboard(weekPerfs, format), [weekPerfs, format]);

  const [pendingCode, setPendingCode] = useState(getPendingInvite);

  /** Entre dans un clan. Renvoie 'joined' | 'already' | 'notfound' | 'full' | 'error'. */
  const joinByCode = async (codeArg) => {
    const code = parseJoinCode(codeArg ?? joinCode);
    if (!code || !user || busy) return 'error';
    try {
      setBusy(true);
      setMessage(null);
      const group = await getGroupByJoinCode(code);
      if (!group) {
        setMessage({ ok: false, text: `Aucun clan avec le code ${code}. Vérifie-le avec ton pote (le clan a peut-être été supprimé).` });
        return 'notfound';
      }
      if (group.memberIds?.includes(user.id)) {
        setSelectedId(group.id);
        setMessage({ ok: true, text: `Tu es déjà dans ${group.name}.` });
        return 'already';
      }
      if ((group.memberIds?.length || 0) >= MAX_GROUP_MEMBERS) {
        setMessage({ ok: false, text: `${group.name} est complet (${MAX_GROUP_MEMBERS} membres).` });
        return 'full';
      }
      await addMemberToGroup(group.id, { id: user.id, name: user.name });
      setJoinCode('');
      setSelectedId(group.id);
      setMessage({ ok: true, text: `Bienvenue dans ${group.name} !` });
      return 'joined';
    } catch (err) {
      console.warn('Entrée dans le clan impossible :', err?.code || err);
      setMessage({
        ok: false,
        text:
          err?.code === 'unavailable' || (typeof navigator !== 'undefined' && navigator.onLine === false)
            ? 'Pas de réseau : impossible de rejoindre le clan. Réessaie dans un instant.'
            : 'Impossible de rejoindre ce clan pour le moment. Réessaie.',
        retry: code,
      });
      return 'error';
    } finally {
      setBusy(false);
    }
  };

  // Invitation reçue par lien : on rejoint dès qu'on est connecté. Le code
  // n'est oublié qu'une fois réglé (réussi, introuvable, complet) : une
  // erreur réseau le garde pour réessayer.
  useEffect(() => {
    if (!online) return;
    const code = getPendingInvite();
    if (!code) return;
    joinByCode(code).then((outcome) => {
      if (outcome !== 'error') {
        clearPendingInvite();
        setPendingCode(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const create = async () => {
    if (!newGroupName.trim() || !user || busy) return;
    try {
      setBusy(true);
      setMessage(null);
      const group = await createGroup(newGroupName, user);
      setNewGroupName('');
      setIsCreating(false);
      setSelectedId(group.id);
    } catch {
      setMessage({ ok: false, text: 'Création impossible pour le moment.' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papiers refusé */
    }
  };

  const share = async (group) => {
    const url = inviteLink(group);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Rejoins ${group.name} sur GULP!`, text: `Rejoins mon clan ${group.name} sur GULP! Code : ${group.joinCode}`, url });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    copy(url);
  };

  const leaveOrDelete = async () => {
    if (!selectedGroup || busy) return;
    const isCreator = selectedGroup.creatorId === user.id;
    try {
      setBusy(true);
      if (isCreator) await deleteGroup(selectedGroup.id);
      else await removeMemberFromGroup(selectedGroup.id, user.id);
      setSelectedId(null);
      setConfirmAction(false);
    } catch {
      setMessage({ ok: false, text: isCreator ? 'Suppression impossible.' : 'Impossible de quitter le clan.' });
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <div className="flex items-center gap-2 pt-4">
      <Users size={24} className="text-[#CEFF00]" />
      <h2 className="text-2xl font-black italic uppercase">Clans</h2>
    </div>
  );

  if (isFirebaseConfigured && user.isGuest) {
    return (
      <div className="space-y-5 animate-in">
        {header}
        {pendingCode ? (
          <SignInCard
            title="Un pote t'invite dans son clan"
            text={`Connecte-toi avec Google et tu entres directement dans le clan (code ${pendingCode}).`}
          />
        ) : (
          <SignInCard
            title="Les clans, c'est avec un compte"
            text="Connecte-toi avec Google pour créer ton clan, inviter tes potes avec un code et suivre votre classement de la semaine."
          />
        )}
      </div>
    );
  }

  if (!online || unavailable) {
    return (
      <div className="space-y-5 animate-in">
        {header}
        <Card className="text-center !py-8">
          <WifiOff size={28} className="mx-auto text-zinc-500 mb-3" />
          <p className="font-bold">Les clans ont besoin du serveur</p>
          <p className="text-sm text-zinc-400 mt-1">
            {isFirebaseConfigured
              ? 'Connexion impossible pour le moment. Réessaie quand tu as du réseau.'
              : "Cette version tourne en local, sans serveur. Le chrono, les jeux et tes records marchent normalement ; les clans s'activeront dès que le serveur sera branché."}
          </p>
        </Card>
      </div>
    );
  }

  if (selectedGroup) {
    const isCreator = selectedGroup.creatorId === user.id;
    return (
      <div className="space-y-4 animate-in pt-3">
        <button
          onClick={() => {
            setSelectedId(null);
            setConfirmAction(false);
            setMessage(null);
          }}
          className="flex items-center gap-1 text-xs text-zinc-400 font-bold uppercase tracking-widest h-9 -ml-1 pr-3"
        >
          <ChevronLeft size={14} /> Clans
        </button>
        <div>
          <h2 className="text-2xl font-black text-[#CEFF00] break-words">{selectedGroup.name}</h2>
          <p className="text-sm text-zinc-400">
            {selectedGroup.members?.length || 0} membre{(selectedGroup.members?.length || 0) > 1 ? 's' : ''} · code{' '}
            <span className="font-mono text-white tracking-widest">{selectedGroup.joinCode}</span>
          </p>
        </div>

        {message && <p className={`text-sm ${message.ok ? 'text-[#CEFF00]' : 'text-red-400'}`}>{message.text}</p>}

        <div className="flex gap-2">
          <Button className="flex-1 flex items-center justify-center gap-2" onClick={() => share(selectedGroup)}>
            <Share2 size={18} /> Inviter
          </Button>
          <Button variant="secondary" className="flex items-center justify-center gap-2" onClick={() => copy(selectedGroup.joinCode)}>
            <Copy size={16} /> {copied ? 'Copié' : 'Code'}
          </Button>
        </div>

        <Card>
          <h3 className="font-bold text-[#CEFF00] mb-3 flex items-center gap-2">
            <Trophy size={18} /> Classement de la semaine
          </h3>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                aria-pressed={format === f}
                className={`py-2 rounded-lg border text-xs font-bold ${
                  format === f ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-5">Aucun {format.toLowerCase()} chronométré en bar cette semaine.</p>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((row, i) => (
                <div
                  key={row.userId}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${
                    i === 0 ? 'bg-[#CEFF00]/15 border border-[#CEFF00]/60' : 'bg-zinc-800/60'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="font-black text-[#CEFF00] w-5">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block font-bold truncate">{row.userName || 'Anonyme'}</span>
                      <span className="block text-[11px] text-zinc-400">
                        {row.count} perf{row.count > 1 ? 's' : ''}
                      </span>
                    </span>
                  </span>
                  <span className="font-black text-[#CEFF00] tabular-nums shrink-0">{row.bestTime.toFixed(2)} s</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-[#CEFF00] mb-2">Membres</h3>
          <div className="divide-y divide-zinc-800">
            {(selectedGroup.members || []).map((m) => (
              <p key={m.id} className="py-2 text-sm truncate">
                {m.name}
                {m.id === user.id && <span className="text-zinc-500"> · toi</span>}
                {m.isCreator && <span className="ml-2 text-xs text-[#CEFF00]">chef</span>}
              </p>
            ))}
          </div>
        </Card>

        {confirmAction ? (
          <Card className="space-y-3">
            <p className="text-sm text-zinc-300">
              {isCreator
                ? `Supprimer « ${selectedGroup.name} » pour tous ses membres ? C'est définitif.`
                : `Quitter « ${selectedGroup.name} » ? Tu pourras revenir avec le code.`}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmAction(false)}>
                Annuler
              </Button>
              <Button variant="danger" className="flex-1" onClick={leaveOrDelete} disabled={busy}>
                {isCreator ? 'Supprimer' : 'Quitter'}
              </Button>
            </div>
          </Card>
        ) : (
          <button
            onClick={() => setConfirmAction(true)}
            className="w-full py-3 rounded-xl text-sm font-bold text-red-400 bg-red-950/40 flex items-center justify-center gap-2"
          >
            {isCreator ? <Trash2 size={16} /> : <LogOut size={16} />}
            {isCreator ? 'Supprimer le clan' : 'Quitter le clan'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-end justify-between">
        {header}
        <button
          onClick={() => setIsCreating((v) => !v)}
          className="w-11 h-11 bg-[#CEFF00] text-black rounded-xl flex items-center justify-center"
          aria-label="Créer un clan"
        >
          <Plus size={20} />
        </button>
      </div>
      <p className="text-xs text-zinc-500">Un clan = ta bande, avec son classement de la semaine par format.</p>

      {isCreating && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <input
            type="text"
            value={newGroupName}
            maxLength={30}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nom du clan"
            aria-label="Nom du clan"
            autoFocus
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#CEFF00]"
          />
          <Button type="submit" className="!px-4" disabled={!newGroupName.trim() || busy}>
            Créer
          </Button>
        </form>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          joinByCode();
        }}
      >
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Code à 6 chiffres"
          aria-label="Code du clan à rejoindre"
          className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-[#CEFF00]"
        />
        <Button type="submit" variant="secondary" className="!px-4 flex items-center gap-1.5" disabled={joinCode.length !== 6 || busy}>
          <LogIn size={16} /> Rejoindre
        </Button>
      </form>
      {message && (
        <p className={`text-sm ${message.ok ? 'text-[#CEFF00]' : 'text-red-400'}`} role="status">
          {message.text}
          {message.retry && (
            <>
              {' '}
              <button
                className="underline font-bold text-white"
                onClick={() =>
                  joinByCode(message.retry).then((o) => {
                    if (o !== 'error') {
                      clearPendingInvite();
                      setPendingCode(null);
                    }
                  })
                }
              >
                Réessayer
              </button>
            </>
          )}
        </p>
      )}

      {loading ? (
        <p className="text-center text-zinc-400 py-10">Chargement…</p>
      ) : groups.length === 0 ? (
        <div className="text-center text-zinc-500 py-10">
          <p className="text-lg text-zinc-300 font-bold">Pas encore de clan</p>
          <p className="text-sm mt-1">Crée le tien avec le +, ou rejoins celui d'un pote avec son code.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => {
                setSelectedId(group.id);
                setMessage(null);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left flex items-center justify-between gap-3 active:border-[#CEFF00]"
            >
              <span className="min-w-0">
                <span className="block text-lg font-bold truncate">{group.name}</span>
                <span className="block text-xs text-zinc-500">Code {group.joinCode}</span>
              </span>
              <span className="shrink-0 bg-[#CEFF00] text-black text-xs font-bold px-2 py-1 rounded">
                {group.members?.length || 0} membre{(group.members?.length || 0) > 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
