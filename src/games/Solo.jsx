import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, Crosshair, MapPin, Share2, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  FORMATS,
  PERFORMANCE_THRESHOLDS,
  getPerformanceTier,
  getTierLabel,
  getTimerColor,
  isPlausible,
  formatSeconds,
  MIN_PLAUSIBLE_MS,
} from '../utils/performance';
import { computeDistance, GEOFENCE_RADIUS_M, REQUIRE_BAR_TO_START } from '../utils/geo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ChugButton from '../components/ChugButton';
import BarSheet from '../components/BarSheet';
import useGeolocation from '../hooks/useGeolocation';
import useChugTimer from '../hooks/useChugTimer';
import { useUser } from '../contexts/UserContext';
import { ensureBarsNear, formatDistance, nearestBars, subscribeToAllBars } from '../services/barService';
import { bestByFormat, recordPerformance } from '../services/performanceService';
import useMyPerformances from '../hooks/useMyPerformances';

const AutoChug = React.lazy(() => import('../chug/AutoChug'));

const TIMER_BASE_CLASS =
  'timer-xl font-black font-mono mb-8 short:mb-4 tabular-nums transition-colors duration-200 leading-none';

const fireConfetti = () =>
  confetti({
    particleCount: 160,
    spread: 75,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors: ['#CEFF00', '#ffffff', '#22c55e'],
  });

/**
 * SOLO — le chrono. Il part partout ; une perf ne compte pour le classement
 * que si elle est faite dans un bar de la liste, à moins de 100 m.
 * Le bar le plus proche à portée est choisi tout seul, on peut en choisir un
 * autre à la main.
 */
export default function Solo({ selectedBar, setSelectedBar }) {
  const { user } = useUser();
  const { perfs: myPerfs } = useMyPerformances();
  const [bars, setBars] = useState([]);
  const [showBarPicker, setShowBarPicker] = useState(false);
  const [showBarSheet, setShowBarSheet] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('Pinte');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState(null); // null | { ok, text }
  const displayRef = useRef(null);

  const geo = useGeolocation();
  useEffect(() => subscribeToAllBars(setBars), []);

  // Charge la base de bars du coin (dès que la position est connue, ou Paris par défaut après 3 s).
  const hasPosition = geo.lat != null && geo.lng != null;
  useEffect(() => {
    if (hasPosition) {
      ensureBarsNear(geo.lat, geo.lng);
      return undefined;
    }
    const timer = setTimeout(() => ensureBarsNear(null, null), geo.error ? 0 : 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPosition, geo.error]);

  const near = useMemo(() => nearestBars(bars, geo.lat, geo.lng, 30), [bars, geo.lat, geo.lng]);

  // Sélection automatique du bar le plus proche à portée, tant que le joueur
  // n'a pas choisi lui-même.
  useEffect(() => {
    if (selectedBar?.manual) return;
    const closest = near[0] && near[0].distance <= GEOFENCE_RADIUS_M ? near[0] : null;
    if ((closest?.id || null) !== (selectedBar?.id || null)) setSelectedBar(closest);
  }, [near, selectedBar, setSelectedBar]);

  const distance = selectedBar ? computeDistance(geo.lat, geo.lng, selectedBar.lat, selectedBar.lng) : Infinity;
  const inZone = distance <= GEOFENCE_RADIUS_M;
  const canStart = !REQUIRE_BAR_TO_START || inZone;

  const getClassName = useCallback(
    (ms) => `${TIMER_BASE_CLASS} ${getTimerColor(ms, selectedFormat)}`,
    [selectedFormat]
  );

  const onStart = useCallback(() => setSaveState(null), []);
  const onStop = useCallback(
    ({ ms }) => {
      if (ms < PERFORMANCE_THRESHOLDS[selectedFormat].elite && isPlausible(ms, selectedFormat)) fireConfetti();
    },
    [selectedFormat]
  );

  const { phase, result, holdProgress, bind, reset, startAt, stop } = useChugTimer({ displayRef, getClassName, onStart, onStop });

  // Mode caméra : la détection pilote le même chrono, avec ses propres horodatages.
  const [camOpen, setCamOpen] = useState(false);
  const [method, setMethod] = useState('bouton');
  const camStart = useCallback(
    (ts) => {
      setSaveState(null);
      setMethod('camera');
      startAt(ts);
    },
    [startAt]
  );
  const camEnd = useCallback(
    (r) => {
      if (r.confidence === 'manuel') setMethod('bouton');
      stop(r.endT);
    },
    [stop]
  );
  const camCancel = useCallback(() => reset(), [reset]);
  const camClose = () => {
    setCamOpen(false);
    if (phase === 'running') reset();
  };

  const tier = result ? getPerformanceTier(result.ms, selectedFormat) : null;
  const plausible = result ? isPlausible(result.ms, selectedFormat) : false;
  // Record d'avant ce temps-ci (la liste se met à jour dès l'enregistrement).
  const previousBest = useMemo(
    () => (result ? bestByFormat(myPerfs)[selectedFormat]?.timeMs ?? null : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, selectedFormat]
  );
  const isRecord = plausible && previousBest != null && result.ms < previousBest;

  const handleSave = async () => {
    if (!user || !result || saving) return;
    try {
      setSaving(true);
      const { ranked, online, pending } = await recordPerformance({
        user,
        barId: selectedBar?.id,
        barName: selectedBar?.name,
        format: selectedFormat,
        timeMs: result.ms,
        distance,
        method,
      });
      let text;
      if (!online) text = 'Enregistré sur ce téléphone. Connecte-toi (Profil) pour le garder et entrer au classement.';
      else if (ranked) text = `Enregistré et classé chez ${selectedBar.name}.`;
      else text = 'Enregistré dans tes records (hors classement : pas dans un bar).';
      if (pending) text += ' Il partira dès que tu auras du réseau.';
      setSaveState({ ok: true, text });
      reset();
    } catch (err) {
      setSaveState({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const where = inZone && selectedBar ? ` chez ${selectedBar.name}` : '';
    const text = `🍺 ${formatSeconds(result.ms)} s sur ${selectedFormat === 'Pinte' ? 'une' : 'un'} ${selectedFormat}${where} — ${getTierLabel(tier)} #GULP`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setSaveState({ ok: true, text: 'Copié dans le presse-papiers.' });
      }
    } catch {
      /* annulé par l'utilisateur */
    }
  };

  const pickBar = (bar) => {
    setSelectedBar(bar ? { ...bar, manual: true } : { manual: true, id: null, none: true });
    setShowBarPicker(false);
  };
  const hasBar = Boolean(selectedBar?.id);

  let status;
  if (inZone)
    status = {
      cls: 'text-green-400',
      text: user?.online
        ? `Tu es chez ${selectedBar.name} : ta perf comptera pour le classement.`
        : `Tu es chez ${selectedBar.name} : ta perf sera enregistrée avec le bar.`,
    };
  else if (hasBar)
    status = {
      cls: 'text-zinc-400',
      text: Number.isFinite(distance)
        ? `${selectedBar.name} est à ${formatDistance(distance)}. Il faut être à moins de ${GEOFENCE_RADIUS_M} m pour y classer ta perf.`
        : `Position inconnue : impossible de vérifier que tu es chez ${selectedBar.name}.`,
    };
  else if (geo.error === 'denied')
    status = { cls: 'text-zinc-500', text: 'Localisation coupée : chrono libre, perfs gardées dans tes records.' };
  else if (bars.length === 0)
    status = { cls: 'text-zinc-500', text: 'Chrono libre : tes perfs sont gardées dans tes records.' };
  else
    status = {
      cls: 'text-zinc-500',
      text: "Chrono libre. Approche-toi à moins de 100 m d'un bar de la liste pour classer ta perf.",
    };

  return (
    <div className="flex flex-col flex-1 gap-3">
      <div className="relative">
        <button
          onClick={() => setShowBarPicker((v) => !v)}
          aria-expanded={showBarPicker}
          className="w-full flex justify-between items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl"
        >
          <span className="flex items-center gap-2 min-w-0">
            <MapPin size={15} className={hasBar ? 'text-[#CEFF00] shrink-0' : 'text-zinc-500 shrink-0'} />
            <span className={`font-bold truncate ${hasBar ? '' : 'text-zinc-400'}`}>
              {hasBar ? selectedBar.name : 'Choisir un bar'}
            </span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {hasBar && Number.isFinite(distance) && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  inZone ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <Crosshair size={11} />
                {formatDistance(distance)}
              </span>
            )}
            <ChevronDown size={16} className={`text-zinc-400 transition ${showBarPicker ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {showBarPicker && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden z-30 max-h-64 overflow-y-auto shadow-xl">
            {near.map((bar) => (
              <button
                key={bar.id}
                onClick={() => pickBar(bar)}
                className={`w-full text-left px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between gap-3 ${
                  selectedBar?.id === bar.id ? 'bg-[#CEFF00]/10 text-[#CEFF00]' : 'text-white'
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-sm truncate">{bar.name}</span>
                  <span className="block text-xs text-zinc-500 truncate">
                    {[bar.address, bar.city].filter(Boolean).join(', ')}
                  </span>
                </span>
                <span className="text-xs text-zinc-400 shrink-0">{formatDistance(bar.distance)}</span>
              </button>
            ))}
            {near.length === 0 && (
              <p className="px-4 py-3 text-zinc-500 text-sm text-center">Aucun bar dans la base pour l'instant.</p>
            )}
            {hasBar && (
              <button onClick={() => pickBar(null)} className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 border-b border-zinc-800/50">
                Aucun bar (chrono libre)
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {FORMATS.map((f) => (
          <button
            key={f}
            onClick={() => phase !== 'running' && setSelectedFormat(f)}
            aria-pressed={selectedFormat === f}
            className={`py-3 rounded-xl border font-bold text-sm transition-all ${
              selectedFormat === f
                ? 'bg-[#CEFF00] text-black border-[#CEFF00]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <p className={`text-xs text-center leading-snug min-h-[2rem] ${status.cls}`}>
        {status.text}
        {hasBar && phase !== 'running' && (
          <>
            {' '}
            <button onClick={() => setShowBarSheet(true)} className="underline font-bold text-zinc-300">
              Classement du bar
            </button>
          </>
        )}
      </p>

      <div className="flex-1 flex flex-col items-center justify-center py-2">
        <div ref={displayRef} className={`${TIMER_BASE_CLASS} text-white`}>
          0.00
        </div>

        <ChugButton
          bind={{
            ...bind,
            onPointerDown: (e) => {
              if (phase !== 'running') setMethod('bouton');
              bind.onPointerDown(e);
            },
          }}
          phase={phase}
          holdProgress={holdProgress}
          disabled={!canStart}
        />

        <p className="mt-5 short:mt-3 text-[11px] uppercase tracking-widest text-zinc-600 font-bold text-center">
          {!canStart
            ? "Approche-toi d'un des bars de la liste"
            : phase === 'running'
              ? 'Tape pour arrêter'
              : 'Maintiens ½ s pour partir'}
        </p>

        {phase !== 'running' && (
          <button
            onClick={() => setCamOpen(true)}
            disabled={!canStart}
            className="mt-4 short:mt-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-zinc-200 flex items-center gap-2 disabled:opacity-40"
          >
            <Camera size={16} className="text-[#CEFF00]" />
            Mode caméra : chrono automatique
            <span className="text-[10px] font-black uppercase tracking-wider text-[#CEFF00]">bêta</span>
          </button>
        )}
      </div>

      {saveState && phase !== 'stopped' && (
        <p className={`text-sm text-center font-bold ${saveState.ok ? 'text-green-400' : 'text-red-400'}`} role="status">
          {saveState.text}
        </p>
      )}

      {phase === 'stopped' && result && (
        <Card className="animate-in slide-in-from-bottom">
          {!plausible ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold">Faux départ ?</p>
                <p className="text-sm text-zinc-300">
                  {formatSeconds(result.ms)} s, c'est trop rapide pour {selectedFormat === 'Pinte' ? 'une' : 'un'}{' '}
                  {selectedFormat}. On recommence.
                </p>
              </div>
              <Button variant="secondary" className="!p-3 shrink-0" onClick={reset} ariaLabel="Effacer">
                <Trash2 size={20} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 uppercase font-bold">
                  {selectedFormat} · {getTierLabel(tier)}
                  {isRecord && <span className="text-[#CEFF00]"> · record perso</span>}
                </p>
                <p className={`text-3xl font-black tabular-nums ${getTimerColor(result.ms, selectedFormat)}`}>
                  {formatSeconds(result.ms, 3)} s
                </p>
                {saveState && !saveState.ok && <p className="text-xs text-red-400 mt-1">{saveState.text}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" className="!p-3" onClick={handleShare} ariaLabel="Partager">
                  <Share2 size={20} />
                </Button>
                <Button variant="danger" className="!p-3" onClick={reset} ariaLabel="Effacer">
                  <Trash2 size={20} />
                </Button>
                <Button variant="primary" className="!p-3" disabled={saving || !user} onClick={handleSave} ariaLabel="Enregistrer">
                  <CheckCircle2 size={20} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {camOpen && (
        <React.Suspense fallback={<div className="fixed inset-0 z-[5000] bg-black" />}>
          <AutoChug
            format={selectedFormat}
            minDrinkMs={MIN_PLAUSIBLE_MS[selectedFormat]}
            onStart={camStart}
            onEnd={camEnd}
            onCancel={camCancel}
            onClose={camClose}
          />
        </React.Suspense>
      )}

      <BarSheet bar={showBarSheet && hasBar ? { ...selectedBar, distance } : null} onClose={() => setShowBarSheet(false)} />
    </div>
  );
}
