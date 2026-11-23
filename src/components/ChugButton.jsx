import React, { memo } from 'react';

/**
 * Le gros bouton rond du chrono. Purement présentationnel : toute la logique
 * (hold, start, stop) vient de useChugTimer via `bind`.
 *
 * Mémoïsé : pendant la course, le hook n'émet aucun re-render, donc ce bouton
 * ne se repeint que sur changement de phase ou de progression du hold.
 */
function ChugButton({
  bind,
  phase,
  holdProgress,
  disabled = false,
  size = 192,
  labels = { idle: 'START', holding: 'TIENS…', running: 'STOP', stopped: 'ENCORE' },
  accent = '#CEFF00',
}) {
  const isRunning = phase === 'running';
  const isHolding = phase === 'holding';
  const label = labels[phase] || labels.idle;

  return (
    <div className="relative select-none chug-size shrink-0" style={{ '--chug-size': `${size}px` }}>
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${
          isRunning ? 'bg-red-500/25 scale-110' : ''
        }`}
        style={!isRunning ? { backgroundColor: `${accent}33` } : undefined}
      />
      <button
        {...bind}
        disabled={disabled}
        aria-label={label}
        className={`relative w-full h-full rounded-full flex items-center justify-center border-8 overflow-hidden bg-black transition-transform duration-150 disabled:opacity-40 ${
          isHolding ? 'scale-90 border-transparent' : isRunning ? 'border-red-500' : ''
        }`}
        style={!isHolding && !isRunning ? { borderColor: accent } : undefined}
      >
        {/* Remplissage du hold, piloté par la progression 0..1 */}
        <div
          className="absolute bottom-0 left-0 right-0 will-change-[height]"
          style={{
            height: `${Math.round(holdProgress * 100)}%`,
            backgroundColor: accent,
            transition: isHolding ? 'height 40ms linear' : 'none',
          }}
        />
        <span
          className={`relative z-10 font-black text-xl uppercase tracking-wider ${
            holdProgress > 0.5 ? 'text-black' : isRunning ? 'text-red-500' : 'text-white'
          }`}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

export default memo(ChugButton);
