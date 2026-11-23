import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Users, Flag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FORMATS, formatSeconds, getTimerColor } from '../utils/performance';
import usePlayers from './usePlayers';
import PlayersEditor from './PlayersEditor';
import ChugButton from '../components/ChugButton';
import useChugTimer from '../hooks/useChugTimer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { SettingsButton } from './party/GameFrame';

/**
 * RELAIS — l'équipe enchaîne, un verre chacun, un seul chrono.
 * Maintiens pour partir, tape à chaque passage de relais, le dernier tap
 * arrête tout. Chaque split est daté au timeStamp du tap.
 */
const TIMER_CLASS = 'timer-lg font-black font-mono tabular-nums leading-none mb-8 short:mb-4';

export default function Relais() {
  const { players, setPlayers } = usePlayers(2);
  const [format, setFormat] = useState('Pinte');
  const [stage, setStage] = useState('setup'); // setup | play | done
  const [laps, setLaps] = useState([]); // ms cumulés à chaque tap
  const lapsRef = useRef([]);
  const displayRef = useRef(null);

  // Couleur live = performance du relayeur EN COURS (son split), pas le total.
  const getClassName = useCallback(
    (ms) => {
      const l = lapsRef.current;
      const lastCum = l.length ? l[l.length - 1] : 0;
      return `${TIMER_CLASS} ${getTimerColor(ms - lastCum, format)}`;
    },
    [format]
  );

  const timer = useChugTimer({
    displayRef,
    getClassName,
    onLap: (ts, elapsed) => {
      const next = [...lapsRef.current, elapsed];
      lapsRef.current = next;
      setLaps(next);
      if (next.length >= players.length) {
        timer.stop(ts);
        setStage('done');
        confetti({ particleCount: 140, spread: 100, origin: { y: 0.5 }, colors: ['#CEFF00', '#fff'] });
      }
    },
  });

  const { phase, holdProgress, bind, reset, result } = timer;

  const splits = useMemo(
    () => laps.map((cum, i) => ({ name: players[i], ms: i === 0 ? cum : cum - laps[i - 1] })),
    [laps, players]
  );
  const best = splits.length ? splits.reduce((a, b) => (b.ms < a.ms ? b : a)) : null;
  const currentIdx = Math.min(laps.length, players.length - 1);

  const restart = () => {
    lapsRef.current = [];
    setLaps([]);
    reset();
    setStage('play');
  };

  if (stage === 'setup') {
    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-2 text-[#CEFF00]">
          <Users size={20} />
          <h2 className="font-black italic uppercase text-lg">Relais</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Un verre chacun, dans l'ordre. Tape au moment où le suivant attaque. Le split de chacun s'affiche à la fin.
        </p>
        <PlayersEditor players={players} setPlayers={setPlayers} min={2} title="Ordre de passage" />
        <div className="grid grid-cols-4 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`py-2.5 rounded-xl border text-sm font-bold ${
                format === f ? 'bg-[#CEFF00] text-black border-[#CEFF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button className="w-full" onClick={restart}>
          C'est parti
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex items-center justify-between mb-1 min-h-[36px]">
        <span className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
          {format} · {players.length} joueurs
        </span>
        <SettingsButton
          onClick={() => {
            reset();
            setStage('setup');
          }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-2">
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">
          {stage === 'done' ? 'Terminé' : phase === 'running' ? `Relayeur ${currentIdx + 1}/${players.length}` : 'Premier relayeur'}
        </p>
        <p className="text-2xl font-black text-[#CEFF00] mb-4">
          {stage === 'done' ? `Total ${formatSeconds(result?.ms ?? laps[laps.length - 1] ?? 0)} s` : players[currentIdx]}
        </p>
        <div ref={displayRef} className={`${TIMER_CLASS} text-white`}>
          0.00
        </div>
        {stage !== 'done' && (
          <ChugButton
            bind={bind}
            phase={phase}
            holdProgress={holdProgress}
            size={168}
            labels={{ idle: 'START', holding: 'TIENS…', running: laps.length + 1 >= players.length ? 'FINISH' : 'RELAIS', stopped: 'FINI' }}
          />
        )}
        {stage === 'done' && (
          <Button onClick={restart} className="flex items-center gap-2">
            <Flag size={16} /> Nouvelle manche
          </Button>
        )}
      </div>

      {splits.length > 0 && (
        <Card className="mt-3 space-y-1.5">
          {splits.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="font-semibold truncate">
                {i + 1}. {s.name}
                {best && s === best && splits.length > 1 && <span className="ml-2 text-[10px] text-[#CEFF00] font-black">MVP</span>}
              </span>
              <span className={`font-black tabular-nums ${getTimerColor(s.ms, format)}`}>{formatSeconds(s.ms)} s</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
