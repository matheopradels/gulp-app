import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bug, Check, Download, RotateCcw, SwitchCamera, UserX, X } from 'lucide-react';
import { createChugEngine } from './engine';
import { formatSeconds, getTimerColor } from '../utils/performance';

const TASKS_VERSION = '1.2.3';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Points gardés dans la trace de debug (tête, épaules, mains)
const TRACE_POINTS = [0, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20, 21, 22];
const TRACE_MAX_FRAMES = 900; // ~30 s

const landmarkers = {};
/** Charge MediaPipe une seule fois par mode (GPU si possible, sinon CPU). */
function loadLandmarker(delegate = 'GPU') {
  if (!landmarkers[delegate]) {
    landmarkers[delegate] = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const make = (d) =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: d },
          runningMode: 'VIDEO',
          numPoses: 3,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.4,
          minTrackingConfidence: 0.3, // tient mieux quand le verre cache le visage
        });
      try {
        return await make(delegate);
      } catch (err) {
        if (delegate === 'GPU') return make('CPU');
        throw err;
      }
    })().catch((err) => {
      delete landmarkers[delegate];
      throw err;
    });
  }
  return landmarkers[delegate];
}

const FACING_KEY = 'gulp_cam_facing';
const readFacing = () => {
  try {
    return localStorage.getItem(FACING_KEY) === 'environment' ? 'environment' : 'user';
  } catch {
    return 'user';
  }
};

const HINTS = {
  loading: 'Chargement de la détection…',
  searching: 'Mets-toi face caméra, tête et épaules dans le cadre, verre en main.',
  ready: 'Prêt. Bois quand tu veux : le chrono part tout seul.',
  drinking: '',
  lost: 'Je ne te vois plus. Tape l’écran pour arrêter le chrono.',
  done: '',
};

/**
 * Mode caméra : le chrono part quand le verre arrive à la bouche et s'arrête
 * quand il en repart. Tout tourne dans le téléphone, rien n'est envoyé.
 *
 * Secours : taper l'écran démarre (si prêt) ou arrête le chrono.
 */
export default function AutoChug({ format, minDrinkMs, onStart, onEnd, onCancel, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const engineRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);
  const lastTsRef = useRef(0);
  const startTRef = useRef(null);
  const traceRef = useRef([]);
  const fpsRef = useRef({ n: 0, t0: 0, fps: 0 });
  const debugInfoRef = useRef(null);
  const errorsRef = useRef(0);
  const switchingRef = useRef(false);
  const lastPersonRef = useRef(0);

  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [flash, setFlash] = useState(null);
  const [debug, setDebug] = useState(false);
  const [facing, setFacing] = useState(readFacing);
  const [slow, setSlow] = useState(false);
  const [nobody, setNobody] = useState(false);
  const mirror = facing === 'user';
  const debugRef = useRef(false);
  debugRef.current = debug;

  const formatRef = useRef(format);
  formatRef.current = format;
  const minRef = useRef(minDrinkMs);
  minRef.current = minDrinkMs;
  const callbacks = useRef({ onStart, onEnd, onCancel });
  callbacks.current = { onStart, onEnd, onCancel };

  const vibrate = (p) => {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* pas supporté */
    }
  };

  const showFlash = (text) => {
    setFlash(text);
    setTimeout(() => aliveRef.current && setFlash(null), 1800);
  };

  const paintFinal = (ms) => {
    const el = timerRef.current;
    if (!el) return;
    el.textContent = formatSeconds(ms);
    el.className = `text-[2.75rem] font-black font-mono tabular-nums leading-none ${getTimerColor(ms, formatRef.current)}`;
  };

  /** Événements du moteur → UI + chrono principal. */
  const handleEvents = useCallback((events) => {
    for (const e of events) {
      if (e.type === 'state') setState(e.state);
      if (e.type === 'start') {
        startTRef.current = e.t;
        vibrate(40);
        callbacks.current.onStart?.(e.t);
      }
      if (e.type === 'cancel') {
        startTRef.current = null;
        if (timerRef.current) timerRef.current.textContent = '0.00';
        callbacks.current.onCancel?.();
        showFlash(e.reason === 'trop-court' ? 'Trop court pour un cul sec, on reprend.' : 'Annulé.');
      }
      if (e.type === 'end') {
        vibrate([30, 40, 30]);
        const r = { ms: e.duration, startT: e.startT, endT: e.endT, confidence: e.confidence, tilted: e.tilted };
        startTRef.current = null;
        paintFinal(e.duration);
        setResult(r);
        callbacks.current.onEnd?.(r);
      }
    }
  }, []);

  /** Dessin : la personne suivie en couleur, les autres en gris. */
  const draw = useCallback((poses, dbg, aspect) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;
    const W = video.videoWidth;
    const H = video.videoHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const engine = engineRef.current;
    const lock = engine?.lock;
    const st = engine?.state;

    // Autres personnes : petits points gris (pour comprendre qui est ignoré)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (const lm of poses) {
      for (const i of [0, 11, 12, 15, 16]) {
        ctx.beginPath();
        ctx.arc(lm[i].x * W, lm[i].y * H, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (!dbg || !lock) return;

    const px = (p) => (p.x / aspect) * W;
    const py = (p) => p.y * H;
    const accent = st === 'drinking' ? '#22c55e' : '#CEFF00';

    // Zone « bouche » : le verre doit y entrer pour lancer le chrono
    const r = engine.options.near * dbg.scale * H;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.setLineDash(st === 'drinking' ? [] : [10, 8]);
    ctx.beginPath();
    ctx.arc(px(dbg.mouth), py(dbg.mouth), r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ligne des épaules
    const half = (dbg.scale * H) / 2;
    ctx.strokeStyle = 'rgba(206,255,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(dbg.center) - half, py(dbg.center));
    ctx.lineTo(px(dbg.center) + half, py(dbg.center));
    ctx.stroke();

    // Mains
    for (const h of dbg.hands) {
      const at = h.toMouth < engine.options.near && h.aboveShoulders > engine.options.aboveShoulder;
      ctx.fillStyle = at ? '#22c55e' : 'rgba(206,255,0,0.9)';
      ctx.beginPath();
      ctx.arc(px(h), py(h), at ? 14 : 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // --- Caméra + boucle de détection ---------------------------------------
  useEffect(() => {
    aliveRef.current = true;
    let active = true; // propre à cette caméra (changement avant/arrière)
    engineRef.current = null; // nouvelle caméra : nouveau cadrage, on se re-verrouille
    startTRef.current = null;
    lastPersonRef.current = performance.now();
    let frameHandle = null;
    let timeoutHandle = null;
    let landmarker = null;

    const loop = (now, meta) => {
      if (!active) return;
      const video = videoRef.current;
      if (video && landmarker && video.readyState >= 2) {
        let ts = meta?.captureTime || meta?.expectedDisplayTime || now || performance.now();
        if (ts <= lastTsRef.current) ts = lastTsRef.current + 1;
        lastTsRef.current = ts;
        try {
          const res = landmarker.detectForVideo(video, ts);
          const poses = res.landmarks || [];
          const aspect = video.videoWidth / video.videoHeight;
          if (!engineRef.current) {
            engineRef.current = createChugEngine({ aspect, minDrinkMs: minRef.current });
          }
          const out = engineRef.current.update(ts, poses);
          if (out.debug) lastPersonRef.current = ts;
          handleEvents(out.events);
          debugInfoRef.current = out.debug;
          draw(poses, out.debug, aspect);

          // fps
          const f = fpsRef.current;
          f.n += 1;
          if (!f.t0) f.t0 = ts;
          if (ts - f.t0 > 1000) {
            f.fps = Math.round((f.n * 1000) / (ts - f.t0));
            f.n = 0;
            f.t0 = ts;
          }
          // trace (pour comprendre un raté)
          const tr = traceRef.current;
          tr.push({
            t: Math.round(ts),
            p: poses.map((lm) =>
              TRACE_POINTS.map((i) => [+lm[i].x.toFixed(3), +lm[i].y.toFixed(3), +(lm[i].visibility ?? 0).toFixed(2)])
            ),
            e: out.events.filter((e) => e.type !== 'state').map((e) => e.type),
          });
          if (tr.length > TRACE_MAX_FRAMES) tr.shift();
          errorsRef.current = 0;
        } catch (err) {
          console.warn('Détection :', err);
          // Certains téléphones refusent le mode GPU en cours de route : on passe en CPU.
          errorsRef.current += 1;
          if (errorsRef.current === 5 && !switchingRef.current) {
            switchingRef.current = true;
            loadLandmarker('CPU')
              .then((cpu) => {
                landmarker = cpu;
              })
              .catch(() => {})
              .finally(() => {
                switchingRef.current = false;
              });
          }
        }
      }
      schedule();
    };

    const schedule = () => {
      const video = videoRef.current;
      if (!active || !video) return;
      if (typeof video.requestVideoFrameCallback === 'function') {
        frameHandle = video.requestVideoFrameCallback(loop);
      } else {
        timeoutHandle = setTimeout(() => loop(performance.now()), 33);
      }
    };

    (async () => {
      try {
        const [stream, lm] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          }),
          loadLandmarker(),
        ]);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        landmarker = lm;
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute('playsinline', '');
        await video.play();
        setState('searching');
        schedule();
      } catch (err) {
        if (!active) return;
        const name = err?.name || '';
        setError(
          name === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Autorise-la dans les réglages du navigateur, ou utilise le bouton.'
            : name === 'NotFoundError'
              ? 'Aucune caméra trouvée sur cet appareil.'
              : 'Impossible de lancer la détection (connexion ?). Le bouton marche toujours.'
        );
        setState('error');
      }
    })();

    // Chrono affiché, mis à jour hors React
    let raf = 0;
    const paint = () => {
      const el = timerRef.current;
      if (el) {
        if (startTRef.current != null) {
          const ms = performance.now() - startTRef.current;
          el.textContent = formatSeconds(ms);
          el.className = `text-[2.75rem] font-black font-mono tabular-nums leading-none ${getTimerColor(ms, formatRef.current)}`;
        }
      }
      const f = fpsRef.current.fps;
      const isSlow = f > 0 && f < 10;
      setSlow((v) => (v !== isSlow ? isSlow : v));
      const st = engineRef.current?.state;
      const lostLong = (st === 'searching' || !st) && engineRef.current && performance.now() - lastPersonRef.current > 5000;
      setNobody((v) => (v !== lostLong ? lostLong : v));
      const dbgEl = document.getElementById('autochug-debug');
      if (dbgEl && debugRef.current) {
        const d = debugInfoRef.current;
        dbgEl.textContent = `${fpsRef.current.fps} i/s · ${engineRef.current?.state || '…'}${
          d ? ` · bouche ${d.nearest.toFixed(2)} · tête ${d.tilt >= 0 ? '+' : ''}${d.tilt.toFixed(2)}` : ' · personne'
        }`;
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    return () => {
      active = false;
      aliveRef.current = false;
      cancelAnimationFrame(raf);
      clearTimeout(timeoutHandle);
      const video = videoRef.current;
      if (video && frameHandle != null && typeof video.cancelVideoFrameCallback === 'function') {
        try {
          video.cancelVideoFrameCallback(frameHandle);
        } catch {
          /* rien */
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [draw, handleEvents, facing]);

  useEffect(() => {
    if (timerRef.current) timerRef.current.textContent = '0.00';
  }, []);

  useEffect(() => {
    engineRef.current?.setMinDrinkMs(minDrinkMs);
  }, [minDrinkMs]);

  // --- Actions ----------------------------------------------------------------
  const onTap = (e) => {
    const engine = engineRef.current;
    if (!engine || result) return;
    // heure du toucher (pas celle du traitement, qui peut attendre la fin d'une détection)
    const now = e?.timeStamp > 0 ? e.timeStamp : performance.now();
    if (engine.state === 'ready' || engine.state === 'searching') {
      if (engine.manualStart(now)) {
        startTRef.current = now;
        setState('drinking');
        vibrate(40);
        callbacks.current.onStart?.(now);
      }
    } else if (engine.state === 'drinking' || engine.state === 'lost') {
      const r = engine.manualStop(now);
      if (r) {
        startTRef.current = null;
        vibrate([30, 40, 30]);
        const res = { ms: r.duration, startT: r.startT, endT: r.endT, confidence: 'manuel' };
        paintFinal(r.duration);
        setResult(res);
        setState('done');
        callbacks.current.onEnd?.(res);
      }
    }
  };

  const again = () => {
    setResult(null);
    if (timerRef.current) {
      timerRef.current.textContent = '0.00';
      timerRef.current.className = 'text-[2.75rem] font-black font-mono tabular-nums leading-none text-white';
    }
    engineRef.current?.reset(performance.now());
    callbacks.current.onCancel?.();
  };

  const notMe = (e) => {
    e.stopPropagation();
    engineRef.current?.unlock();
    startTRef.current = null;
    callbacks.current.onCancel?.();
  };

  const exportTrace = async (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    const data = JSON.stringify({
      v: 1,
      format,
      ua: navigator.userAgent,
      size: video ? [video.videoWidth, video.videoHeight] : null,
      points: TRACE_POINTS,
      frames: traceRef.current,
    });
    const file = new File([data], `gulp-trace-${Date.now()}.json`, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Trace GULP' });
        return;
      }
    } catch {
      /* annulé */
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  let hint = error || HINTS[state] || '';
  if (!error && state === 'searching' && facing === 'environment')
    hint = 'Filme le buveur de face : tête et épaules dans le cadre, verre en main.';
  if (!error && nobody && state === 'searching')
    hint = 'Personne détectée. Recule un peu, mets plus de lumière, ou tape l’écran pour lancer le chrono à la main.';
  if (!error && slow && (state === 'ready' || state === 'searching'))
    hint += ' (Téléphone lent : détection moins précise.)';
  const conf = result?.confidence;

  return (
    <div className="fixed inset-0 z-[5000] bg-black flex flex-col" role="dialog" aria-label="Chrono caméra">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] shrink-0">
        <div className="min-w-0">
          <p className="font-black text-[#CEFF00] uppercase tracking-widest text-sm">Mode caméra · {format}</p>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Bêta</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (startTRef.current != null || result) return;
              const next = facing === 'user' ? 'environment' : 'user';
              try {
                localStorage.setItem(FACING_KEY, next);
              } catch {
                /* rien */
              }
              setState('loading');
              setFacing(next);
            }}
            disabled={state === 'drinking' || Boolean(result)}
            aria-label={facing === 'user' ? 'Passer à la caméra arrière (un pote filme)' : 'Passer à la caméra avant (selfie)'}
            className="h-9 px-3 rounded-full bg-zinc-800 flex items-center gap-1.5 text-xs font-bold text-zinc-200 disabled:opacity-40"
          >
            <SwitchCamera size={16} /> {facing === 'user' ? 'Selfie' : 'Un pote filme'}
          </button>
          <button
            onClick={() => setDebug((v) => !v)}
            aria-pressed={debug}
            aria-label="Afficher la détection"
            className={`w-9 h-9 rounded-full flex items-center justify-center ${debug ? 'bg-[#CEFF00] text-black' : 'bg-zinc-800 text-zinc-400'}`}
          >
            <Bug size={16} />
          </button>
          <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden bg-zinc-950" onPointerDown={onTap} style={{ touchAction: 'manipulation' }}>
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" style={mirror ? { transform: 'scaleX(-1)' } : undefined} />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={mirror ? { transform: 'scaleX(-1)' } : undefined} />

        {state === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <div className="w-10 h-10 border-4 border-[#CEFF00] border-t-transparent rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm text-center px-8">
              Chargement de la détection… (≈ 10 Mo la première fois, ensuite c'est instantané)
            </p>
          </div>
        )}

        {flash && (
          <div className="absolute inset-x-6 top-4 text-center pointer-events-none">
            <span className="inline-block px-4 py-2 rounded-xl bg-black/70 text-orange-300 text-sm font-bold">{flash}</span>
          </div>
        )}

        {debug && (
          <div className="absolute left-2 right-2 bottom-2 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <p id="autochug-debug" className="flex-1 text-[11px] font-mono text-[#CEFF00] bg-black/70 rounded-lg px-2 py-1.5 truncate" />
            <button onClick={exportTrace} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-black/70 text-[11px] font-bold text-zinc-200 flex items-center gap-1">
              <Download size={13} /> Trace
            </button>
          </div>
        )}

        {result && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 px-6" onPointerDown={(e) => e.stopPropagation()}>
            <p className={`text-6xl font-black tabular-nums ${getTimerColor(result.ms, format)}`}>{formatSeconds(result.ms, 3)} s</p>
            <p className="text-xs uppercase tracking-widest font-bold text-zinc-400 text-center">
              {conf === 'haute' && 'Détection nette'}
              {conf === 'moyenne' && 'Détection correcte (tête peu basculée ou image perdue un instant)'}
              {conf === 'basse' && 'Détection incertaine : vérifie le temps'}
              {conf === 'manuel' && 'Arrêté à la main'}
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={again} className="flex-1 py-3 rounded-xl bg-zinc-800 font-bold flex items-center justify-center gap-2">
                <RotateCcw size={18} /> Refaire
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#CEFF00] text-black font-black flex items-center justify-center gap-2">
                <Check size={18} /> Garder
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3 min-h-[4.5rem]">
        <div className="shrink-0 flex flex-col items-center gap-1 min-w-[7.5rem]">
          {/* contenu écrit directement (hors React) pour ne pas re-rendre à 60 i/s */}
          <div ref={timerRef} className="text-[2.75rem] font-black font-mono tabular-nums leading-none text-white" />
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              state === 'ready'
                ? 'bg-[#CEFF00] text-black'
                : state === 'drinking'
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {{ loading: 'Chargement', searching: 'Je te cherche', ready: 'Prêt', drinking: 'Glou glou', lost: 'Perdu', done: 'Fini', error: 'Erreur' }[state]}
          </span>
        </div>
        <p className={`flex-1 text-sm leading-snug ${error ? 'text-red-400' : 'text-zinc-300'}`}>
          {state === 'drinking' ? 'Cul sec en cours… pose le verre pour arrêter (ou tape l’écran).' : hint}
        </p>
        {engineRef.current?.lock && !result && state !== 'drinking' && (
          <button onClick={notMe} className="shrink-0 px-3 py-2 rounded-xl bg-zinc-800 text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <UserX size={14} /> Pas moi
          </button>
        )}
      </div>
    </div>
  );
}
