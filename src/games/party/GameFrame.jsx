import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import PlayersEditor from '../PlayersEditor';
import { MAX_PLAYERS } from '../usePlayers';
import Button from '../../components/ui/Button';
import { LEVELS } from '../content';

/** Écran de réglages commun à tous les jeux de soirée. */
export function GameSetup({
  title,
  icon: Icon,
  description,
  players,
  setPlayers,
  min = 2,
  max = MAX_PLAYERS,
  withPlayers = true,
  level,
  setLevel,
  withLevel = true,
  minLevel = 1,
  children,
  onStart,
  startLabel = 'Jouer',
  startDisabled = false,
}) {
  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-2 text-[#CEFF00]">
        {Icon && <Icon size={20} />}
        <h2 className="font-black italic uppercase text-lg">{title}</h2>
      </div>
      {description && <p className="text-sm text-zinc-400">{description}</p>}
      {withPlayers && <PlayersEditor players={players} setPlayers={setPlayers} min={min} max={max} />}
      {withLevel && (
        <div>
          <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Niveau max</p>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.filter((lv) => lv.id >= minLevel).map((lv) => (
              <button
                key={lv.id}
                onClick={() => setLevel(lv.id)}
                className={`py-3 rounded-xl border text-sm font-bold ${
                  level === lv.id ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {lv.emoji} {lv.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {children}
      {withLevel && <GoldenRule />}
      <Button className="w-full" onClick={onStart} disabled={startDisabled}>
        {startLabel}
      </Button>
    </div>
  );
}

/** Rappel affiché avant chaque partie : le consentement passe avant le jeu. */
export function GoldenRule() {
  return (
    <p className="text-[11px] leading-snug text-zinc-500">
      <span className="text-zinc-300 font-bold">Règle d'or :</span> personne n'est obligé de boire, de répondre ou de faire
      un gage. Une carte qui implique quelqu'un d'autre ne se joue que s'il ou elle est d'accord. Sinon, carte suivante.
    </p>
  );
}

/** Bouton « retour aux réglages » commun à tous les jeux. */
export function SettingsButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 -mr-2 flex items-center justify-center text-zinc-400"
      aria-label="Réglages de la partie"
    >
      <SlidersHorizontal size={17} />
    </button>
  );
}

/** Bandeau du haut pendant la partie. */
export function GameHeader({ label, onSettings, right }) {
  return (
    <div className="flex items-center justify-between mb-1 min-h-[36px]">
      <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold truncate">{label}</span>
      <div className="flex items-center gap-3">
        {right}
        {onSettings && <SettingsButton onClick={onSettings} />}
      </div>
    </div>
  );
}

/** Ligne de scores compacte. */
export function ScoreRow({ players, scores, current }) {
  return (
    <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
      {players.map((p) => (
        <span
          key={p}
          className={`shrink-0 text-xs px-2.5 py-1 rounded-lg font-bold ${
            p === current ? 'bg-[#CEFF00]/15 text-[#CEFF00]' : 'bg-zinc-900 text-zinc-400'
          }`}
        >
          {p} · {scores?.[p] || 0}
        </span>
      ))}
    </div>
  );
}
