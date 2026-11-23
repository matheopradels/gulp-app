/**
 * Moteur de détection automatique du cul sec.
 *
 * Il reçoit, image par image, les squelettes (MediaPipe Pose, 33 points)
 * de toutes les personnes visibles et décide quand le cul sec commence et
 * quand il finit. Aucun accès caméra ici : c'est du calcul pur, testable
 * avec des séquences simulées (voir scripts/test-chug-engine.mjs).
 *
 * Principe :
 *  1. VERROU — on se verrouille sur la personne la plus proche et centrée.
 *     Les mains appartiennent à un squelette : la main de quelqu'un qui passe
 *     derrière ne peut donc jamais être prise pour la tienne.
 *  2. PRÊT — il faut d'abord voir le verre loin de la bouche (≥ 0,5 s).
 *  3. DÉPART — une main monte à la bouche (au-dessus des épaules, près de la
 *     bouche) et y reste ≥ 0,3 s. Le chrono est daté au moment exact où la
 *     main a franchi le seuil (rétro-datage + interpolation entre 2 images).
 *  4. FIN — les deux mains sont loin de la bouche (ou repassées sous les
 *     épaules, ou sorties par le bas de l'image) pendant ≥ 0,25 s. Même
 *     rétro-datage. Poser le verre hors champ marche donc aussi.
 *  5. Une « gorgée » plus courte que le minimum du format est annulée sans
 *     bruit (geste devant la bouche, toux…) : on repart en PRÊT.
 */

// Indices MediaPipe Pose
const NOSE = 0;
const L_EAR = 7;
const R_EAR = 8;
const MOUTH_L = 9;
const MOUTH_R = 10;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const HANDS = [
  [15, 17, 19, 21], // gauche : poignet, auriculaire, index, pouce
  [16, 18, 20, 22], // droite
];

export const DEFAULTS = {
  aspect: 4 / 3, // largeur / hauteur de l'image (les coordonnées sont normalisées 0..1)
  // Verrou
  lockFrames: 6, // images consécutives pour se verrouiller
  lockMaxCenterJump: 0.6, // en largeurs d'épaules
  lockScaleRange: [0.65, 1.55],
  unlockIdleMs: 1500, // en attente : perdu plus longtemps → on cherche à nouveau
  // Seuils (distance main-bouche en largeurs d'épaules)
  near: 0.42,
  far: 0.62,
  aboveShoulder: 0.08, // la main doit être au moins à 0,08 largeur au-dessus des épaules
  readyMs: 500, // verre vu loin de la bouche avant d'armer
  startConfirmMs: 300,
  endConfirmMs: 250,
  glitchMs: 120, // trou toléré dans une série (1-2 images ratées)
  lostMs: 3000, // personne perdue pendant le cul sec → secours manuel
  maxDrinkMs: 60000,
  minDrinkMs: 500, // remplacé par le minimum plausible du format
  tiltDelta: 0.05, // tête basculée : le nez remonte d'au moins ça (largeurs d'épaules)
  plateauMargin: 0.05,
  minHandVis: 0.3, // une main presque invisible (devinée par le modèle) ne lance pas le chrono // tolérance autour de la position « verre à la bouche »
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Mesures utiles d'un squelette (coordonnées remises à l'échelle : x × aspect). */
export function measurePose(lm, aspect) {
  const p = (i) => ({ x: lm[i].x * aspect, y: lm[i].y, v: lm[i].visibility ?? 1 });
  const ls = p(L_SHOULDER);
  const rs = p(R_SHOULDER);
  const le = p(L_EAR);
  const re = p(R_EAR);
  const shoulderW = dist(ls, rs);
  const earW = dist(le, re);
  const scale = Math.max(shoulderW, earW * 2.1, 0.05);
  const shoulders = mid(ls, rs);
  const mouth = mid(p(MOUTH_L), p(MOUTH_R));
  const nose = p(NOSE);
  const ears = mid(le, re);

  const hands = HANDS.map((ids) => {
    let x = 0;
    let y = 0;
    let w = 0;
    let vis = 0;
    for (const i of ids) {
      const q = p(i);
      const weight = 0.25 + q.v; // les points cachés comptent quand même un peu
      x += q.x * weight;
      y += q.y * weight;
      w += weight;
      vis = Math.max(vis, q.v);
    }
    const h = { x: x / w, y: y / w, vis };
    h.toMouth = dist(h, mouth) / scale;
    h.aboveShoulders = (shoulders.y - h.y) / scale; // > 0 : main plus haute que les épaules
    const wr = lm[ids[0]];
    h.offBottom = wr.y > 1.02; // poignet sorti par le bas
    h.offFrame = h.offBottom || wr.x < -0.02 || wr.x > 1.02; // main hors de l'image (ex. bras qui tient le téléphone)
    return h;
  });

  return {
    scale,
    center: shoulders,
    mouth,
    hands,
    pitch: (ears.y - nose.y) / scale, // augmente quand la tête bascule en arrière
    faceVis: Math.min(nose.v, Math.max(le.v, re.v)),
  };
}

/** Une main est « au verre » : près de la bouche et au-dessus des épaules. */
const handAtMouth = (h, o) => h.vis >= o.minHandVis && h.toMouth < o.near && h.aboveShoulders > o.aboveShoulder;
/** Une main est « repartie » : loin de la bouche, ou sous les épaules, ou sortie par le bas. */
const handAway = (h, o) => h.offFrame || h.toMouth > o.far || h.aboveShoulders < 0;

/** Interpole l'instant où une grandeur a franchi un seuil entre deux images. */
function crossing(prevT, prevV, t, v, threshold) {
  if (prevT == null || prevV == null || prevV === v) return t;
  const k = (threshold - prevV) / (v - prevV);
  if (!(k >= 0 && k <= 1)) return t;
  return prevT + k * (t - prevT);
}

/**
 * Affinage du départ : la main franchit le seuil un peu avant que le verre
 * touche les lèvres. On prend le moment où elle arrive sur son « plateau »
 * (la distance arrête de baisser), interpolé entre deux images.
 */
function refineStart(hist, crossT, now, margin) {
  const seg = hist.filter((h) => h.t >= crossT - 1 && h.t <= now);
  if (seg.length < 3) return crossT;
  const tail = seg.filter((h) => h.t >= now - 160).map((h) => h.d);
  const plateau = median(tail.length ? tail : seg.map((h) => h.d));
  const lim = plateau + margin;
  for (let i = 0; i < seg.length; i++) {
    if (seg[i].d <= lim) {
      if (i === 0) return seg[0].t;
      return crossing(seg[i - 1].t, seg[i - 1].d, seg[i].t, seg[i].d, lim);
    }
  }
  return crossT;
}

/**
 * Affinage de la fin : on remonte jusqu'à la dernière image où la main était
 * encore sur son plateau « en train de boire », juste avant de partir.
 */
function refineEnd(hist, awayT, margin) {
  const before = hist.filter((h) => h.t < awayT && h.t >= awayT - 700);
  const ref = before.filter((h) => h.t <= awayT - 200).map((h) => h.d);
  if (ref.length < 2) return awayT;
  const lim = median(ref) + margin;
  const seg = hist.filter((h) => h.t >= awayT - 700 && h.t <= awayT + 1);
  for (let i = seg.length - 1; i > 0; i--) {
    if (seg[i - 1].d <= lim) {
      return seg[i].d > lim ? crossing(seg[i - 1].t, seg[i - 1].d, seg[i].t, seg[i].d, lim) : seg[i].t;
    }
  }
  return awayT;
}

const median = (arr) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function createChugEngine(options = {}) {
  const o = { ...DEFAULTS, ...options };
  const s = {
    state: 'searching', // searching | ready | drinking | lost | done
    lock: null, // { center, scale, lastSeen }
    lockCandidate: null,
    awaySince: null,
    atMouthSince: null,
    atMouthMissSince: null,
    awayDuringDrinkSince: null,
    awayMissSince: null,
    startT: null,
    endCandidateT: null,
    lastNearT: null,
    seenAtMouth: false,
    glassHands: [false, false], // mains vues au verre pendant ce cul sec (gauche, droite)
    hist: [], // [{ t, d }] des 2 dernières secondes
    prev: null, // { t, d } distance main-bouche la plus courte à l'image précédente
    pitchBase: [],
    maxTilt: 0,
    gaps: 0,
    longestGap: 0,
    lastSeen: null,
    frames: 0,
  };

  const events = [];
  const emit = (type, data = {}) => events.push({ type, ...data });

  function setState(st) {
    if (s.state !== st) {
      s.state = st;
      emit('state', { state: st });
    }
  }

  function resetToReady(t) {
    s.awaySince = t;
    s.atMouthSince = null;
    s.atMouthMissSince = null;
    s.awayDuringDrinkSince = null;
    s.awayMissSince = null;
    s.startT = null;
    s.seenAtMouth = false;
    s.glassHands = [false, false];
    s.maxTilt = 0;
    s.gaps = 0;
    s.longestGap = 0;
    setState('ready');
  }

  /** Choisit la personne suivie parmi les squelettes de l'image. */
  function pickPerson(measures, t) {
    if (!measures.length) return null;
    if (s.lock) {
      let best = null;
      let bestCost = Infinity;
      for (const m of measures) {
        const jump = dist(m.center, s.lock.center) / s.lock.scale;
        const ratio = m.scale / s.lock.scale;
        if (jump > o.lockMaxCenterJump || ratio < o.lockScaleRange[0] || ratio > o.lockScaleRange[1]) continue;
        const cost = jump + Math.abs(Math.log(ratio));
        if (cost < bestCost) {
          bestCost = cost;
          best = m;
        }
      }
      if (best) {
        // suit doucement les déplacements
        s.lock.center = {
          x: s.lock.center.x * 0.6 + best.center.x * 0.4,
          y: s.lock.center.y * 0.6 + best.center.y * 0.4,
        };
        s.lock.scale = s.lock.scale * 0.8 + best.scale * 0.2;
        s.lock.lastSeen = t;
      }
      return best;
    }

    // Pas encore verrouillé : la plus grande silhouette, pas collée au bord.
    const candidates = measures
      .filter((m) => m.center.x > 0.12 * o.aspect && m.center.x < 0.88 * o.aspect)
      .sort((a, b) => b.scale - a.scale);
    const m = candidates[0];
    if (!m) {
      s.lockCandidate = null;
      return null;
    }
    const c = s.lockCandidate;
    if (c && dist(c.center, m.center) / c.scale < 0.35) {
      c.count += 1;
      c.center = m.center;
      c.scale = m.scale;
    } else {
      s.lockCandidate = { center: m.center, scale: m.scale, count: 1 };
    }
    if (s.lockCandidate.count >= o.lockFrames) {
      s.lock = { center: m.center, scale: m.scale, lastSeen: t };
      s.lockCandidate = null;
      s.awaySince = null;
      emit('locked');
      return m;
    }
    return null;
  }

  /**
   * Avance d'une image.
   * @param {number} t   horodatage de l'image (ms, même base que performance.now)
   * @param {Array} poses squelettes MediaPipe (tableaux de 33 points normalisés)
   * @returns {{ state, events, debug }}
   */
  function update(t, poses = []) {
    events.length = 0;
    s.frames += 1;
    if (s.state === 'done') return out(null);

    const measures = poses.map((lm) => measurePose(lm, o.aspect));
    const me = pickPerson(measures, t);

    // --- Personne absente -------------------------------------------------
    if (!me) {
      if (s.state === 'drinking') {
        if (s.lastSeen != null && t - s.lastSeen > o.lostMs) {
          setState('lost');
          emit('lost', { startT: s.startT, lastNearT: s.lastNearT });
        }
      } else if (s.lock && t - s.lock.lastSeen > o.unlockIdleMs && s.state !== 'lost') {
        s.lock = null;
        s.awaySince = null;
        s.pitchBase = [];
        setState('searching');
        emit('unlocked');
      }
      s.prev = null;
      return out(null);
    }

    if (s.lastSeen != null && s.state === 'drinking') {
      const gap = t - s.lastSeen;
      if (gap > 200) s.gaps += 1;
      s.longestGap = Math.max(s.longestGap, gap);
    }
    s.lastSeen = t;

    const atMouth = me.hands.map((h) => handAtMouth(h, o));
    const anyAtMouth = atMouth.some(Boolean);
    if (s.state === 'drinking') atMouth.forEach((a, i) => a && (s.glassHands[i] = true));
    // Pendant le cul sec, seules les mains qui ont tenu le verre comptent pour
    // la fin : une main fantôme (bras qui tient le téléphone, hors champ) ne
    // peut pas bloquer l'arrêt.
    const tracked =
      s.state === 'drinking' && s.glassHands.some(Boolean)
        ? me.hands.filter((_, i) => s.glassHands[i])
        : s.state === 'drinking'
          ? me.hands
          : me.hands.filter((h) => h.vis >= o.minHandVis); // en attente : on ignore les mains invisibles
    const allAway = tracked.every((h) => handAway(h, o));
    const d = Math.min(...(tracked.length ? tracked : me.hands).map((h) => h.toMouth));
    s.hist.push({ t, d });
    while (s.hist.length && s.hist[0].t < t - 2500) s.hist.shift();

    // --- Machine à états ----------------------------------------------------
    if (s.state === 'searching') {
      s.awaySince = allAway ? s.awaySince ?? t : null;
      if (s.awaySince != null && t - s.awaySince >= o.readyMs) resetToReady(s.awaySince);
    } else if (s.state === 'lost') {
      // Re-trouvé : on reprend. Si le verre est déjà redescendu, la fin sera
      // datée à la première image où on le voit loin (jamais plus tôt que la
      // réalité) et la confiance est abaissée par le trou.
      setState('drinking');
    }

    if (s.state === 'ready') {
      if (allAway) s.pitchBase.push(me.pitch);
      if (s.pitchBase.length > 45) s.pitchBase.shift();

      if (anyAtMouth) {
        s.atMouthMissSince = null;
        if (s.atMouthSince == null) {
          s.atMouthSince = crossing(s.prev?.t, s.prev?.d, t, d, o.near);
        }
        if (t - s.atMouthSince >= o.startConfirmMs) {
          s.startT = refineStart(s.hist, s.atMouthSince, t, o.plateauMargin);
          s.seenAtMouth = true;
          s.glassHands = atMouth.slice();
          s.lastNearT = t;
          s.maxTilt = 0;
          s.awayDuringDrinkSince = null;
          setState('drinking');
          emit('start', { t: s.startT });
        }
      } else if (s.atMouthSince != null) {
        s.atMouthMissSince = s.atMouthMissSince ?? t;
        if (t - s.atMouthMissSince > o.glitchMs) {
          s.atMouthSince = null;
          s.atMouthMissSince = null;
        }
      }
    } else if (s.state === 'drinking') {
      const base = median(s.pitchBase);
      s.maxTilt = Math.max(s.maxTilt, me.pitch - base);
      if (!allAway) s.lastNearT = t;
      if (anyAtMouth) s.seenAtMouth = true;

      if (allAway && s.seenAtMouth) {
        s.awayMissSince = null;
        if (s.awayDuringDrinkSince == null) {
          s.awayDuringDrinkSince = crossing(s.prev?.t, s.prev?.d, t, d, o.far);
        }
        if (t - s.awayDuringDrinkSince >= o.endConfirmMs) {
          finish(Math.max(s.startT + 1, refineEnd(s.hist, s.awayDuringDrinkSince, o.plateauMargin)), t);
        }
      } else if (s.awayDuringDrinkSince != null) {
        s.awayMissSince = s.awayMissSince ?? t;
        if (t - s.awayMissSince > o.glitchMs) {
          s.awayDuringDrinkSince = null;
          s.awayMissSince = null;
        }
      }
      if (s.state === 'drinking' && t - s.startT > o.maxDrinkMs) {
        emit('cancel', { reason: 'trop-long' });
        resetToReady(t);
      }
    }

    s.prev = { t, d };
    return out(me);
  }

  function finish(endT, now) {
    const duration = endT - s.startT;
    if (duration < o.minDrinkMs) {
      emit('cancel', { reason: 'trop-court', duration });
      resetToReady(now);
      return;
    }
    const tilted = s.maxTilt >= o.tiltDelta;
    let confidence = 'haute';
    if (!tilted || s.longestGap > 600) confidence = 'moyenne';
    if (s.longestGap > 1500) confidence = 'basse';
    setState('done');
    emit('end', {
      startT: s.startT,
      endT,
      duration,
      tilted,
      maxTilt: s.maxTilt,
      longestGap: s.longestGap,
      confidence,
    });
  }

  function out(me) {
    return {
      state: s.state,
      events: [...events],
      debug: me
        ? {
            hands: me.hands,
            mouth: me.mouth,
            center: me.center,
            scale: me.scale,
            tilt: me.pitch - median(s.pitchBase),
            nearest: Math.min(...me.hands.map((h) => h.toMouth)),
          }
        : null,
    };
  }

  return {
    update,
    /** Arrêt manuel (secours) : utilise la dernière image où le verre était à la bouche. */
    manualStop(t) {
      if (s.state !== 'drinking' && s.state !== 'lost') return null;
      setState('done');
      return { startT: s.startT, endT: t, duration: t - s.startT, confidence: 'basse', manual: true };
    },
    /** Départ manuel (secours) : le moteur ne fera plus que la fin. */
    manualStart(t) {
      if (!s.lock) return false;
      s.startT = t;
      s.lastNearT = t;
      s.seenAtMouth = false;
      s.glassHands = [false, false];
      s.maxTilt = 0;
      s.awayDuringDrinkSince = null;
      s.prev = null;
      setState('drinking');
      return true;
    },
    /** Nouveau cul sec : on garde le verrou, il faut revoir le verre loin de la bouche. */
    reset(t = 0) {
      if (s.lock) s.lock.lastSeen = t;
      s.pitchBase = [];
      s.prev = null;
      s.awaySince = null;
      s.atMouthSince = null;
      s.startT = null;
      setState('searching');
    },
    /** Oublie la personne suivie (bouton « ce n'est pas moi »). */
    unlock() {
      s.lock = null;
      s.lockCandidate = null;
      s.awaySince = null;
      s.pitchBase = [];
      setState('searching');
    },
    setMinDrinkMs(ms) {
      o.minDrinkMs = ms;
    },
    get state() {
      return s.state;
    },
    get lock() {
      return s.lock;
    },
    options: o,
  };
}
