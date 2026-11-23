import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { MAX_NAME_LENGTH, MAX_PLAYERS } from './usePlayers';

/**
 * Édition des prénoms. Le champ garde ce que tu tapes (même vide pendant que
 * tu corriges) ; la liste réelle, elle, est toujours propre : un champ vide
 * vaut « Joueur N » et reprend ce nom quand tu quittes le champ.
 */
export default function PlayersEditor({ players, setPlayers, min = 2, max = MAX_PLAYERS, title = 'Joueurs' }) {
  const [draft, setDraft] = useState(players);

  // Ajout / retrait (ici ou ailleurs) : on se recale sur la liste réelle.
  useEffect(() => {
    setDraft((d) => (d.length === players.length ? d : players));
  }, [players]);

  const update = (i, value) => {
    const next = draft.map((p, idx) => (idx === i ? value : p));
    setDraft(next);
    setPlayers(next);
  };
  const remove = (i) => {
    if (players.length <= min) return;
    const next = players.filter((_, idx) => idx !== i);
    setDraft(next);
    setPlayers(next);
  };
  const add = () => {
    if (players.length >= max) return;
    const next = [...players, ''];
    setDraft(next);
    setPlayers(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">
        {title} ({players.length}/{max})
      </p>
      {draft.map((p, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={p}
            maxLength={MAX_NAME_LENGTH}
            placeholder={`Joueur ${i + 1}`}
            aria-label={`Prénom du joueur ${i + 1}`}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            onChange={(e) => update(i, e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => setDraft(players)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 font-semibold outline-none focus:border-[#CEFF00] placeholder:text-zinc-600"
          />
          {max > min && (
            <button
              onClick={() => remove(i)}
              disabled={players.length <= min}
              className="w-11 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 disabled:opacity-30 flex items-center justify-center"
              aria-label={`Retirer ${players[i] || `le joueur ${i + 1}`}`}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {players.length < max && (
        <button
          onClick={add}
          className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-zinc-400 text-sm flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Ajouter un joueur
        </button>
      )}
    </div>
  );
}
