// Tests du moteur de cul sec sur des séquences simulées (node scripts/test-chug-engine.mjs)
import { createChugEngine } from '../src/chug/engine.js';

const ASPECT = 4 / 3;
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());

/** Fabrique un squelette 33 points. Coordonnées en « espace image » x∈[0,aspect], y∈[0,1]. */
function pose({ cx = 0.67, sy = 0.62, sw = 0.36, handL, handR, tilt = 0, noise = 0.006 }) {
  const lm = Array.from({ length: 33 }, () => ({ x: cx, y: sy, visibility: 0.9 }));
  const set = (i, x, y, v = 0.95) => {
    lm[i] = { x: (x + gauss() * noise) / ASPECT, y: y + gauss() * noise, visibility: v };
  };
  const headY = sy - sw * 0.9;
  set(11, cx + sw / 2, sy); set(12, cx - sw / 2, sy);
  set(7, cx + sw * 0.22, headY); set(8, cx - sw * 0.22, headY);
  set(0, cx, headY + sw * 0.12 - tilt); // le nez remonte quand la tête bascule
  set(9, cx + sw * 0.07, headY + sw * 0.3 - tilt * 0.6); set(10, cx - sw * 0.07, headY + sw * 0.3 - tilt * 0.6);
  for (const [ids, h] of [[[15, 17, 19, 21], handL], [[16, 18, 20, 22], handR]]) {
    ids.forEach((i, k) => set(i, h.x + (k ? 0.015 * k : 0), h.y - (k ? 0.02 : 0), h.v ?? 0.9));
  }
  return lm;
}
const mouthOf = (cx, sy, sw) => ({ x: cx + 0.02, y: sy - sw * 0.9 + sw * 0.3 + sw * 0.1 });
const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
const lerpP = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

/**
 * Script d'un cul sec : repos → montée → boit → descente → repos.
 * Renvoie une fonction t → position de la main droite + bascule de la tête.
 */
function chugScript({ restUntil, raiseMs = 450, drinkMs, lowerMs = 400, rest, cx = 0.67, sy = 0.62, sw = 0.36 }) {
  const m = mouthOf(cx, sy, sw);
  const mouth = { x: m.x + 0.03, y: m.y + 0.05 }; // main qui tient le verre aux lèvres
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  const tRaise = restUntil;
  const tDrink = tRaise + raiseMs;
  const tLower = tDrink + drinkMs;
  const tRest = tLower + lowerMs;
  return {
    // « vrai » départ = le verre touche la bouche ; « vraie » fin = le verre quitte la bouche
    truthStart: tDrink,
    truthEnd: tLower,
    at(t) {
      if (t < tRaise) return { hand: rest, tilt: 0 };
      if (t < tDrink) return { hand: lerpP(rest, mouth, ease((t - tRaise) / raiseMs)), tilt: 0 };
      if (t < tLower) return { hand: mouth, tilt: Math.min(0.06, (t - tDrink) / 8000) + 0.02 };
      if (t < tRest) return { hand: lerpP(mouth, rest, ease((t - tLower) / lowerMs)), tilt: 0 };
      return { hand: rest, tilt: 0 };
    },
  };
}

function run(name, { frames, minDrinkMs = 1200, expect }) {
  const eng = createChugEngine({ aspect: ASPECT, minDrinkMs });
  const log = [];
  let ended = null;
  for (const [t, poses] of frames) {
    const r = eng.update(t, poses);
    for (const e of r.events) {
      if (e.type !== 'state') log.push(`${Math.round(t)}ms ${e.type}${e.reason ? ':' + e.reason : ''}`);
      if (e.type === 'end') ended = e;
    }
    if (ended) break;
  }
  const res = expect(ended, log);
  console.log(`${res.ok ? 'OK ' : 'ÉCHEC'}  ${name}  ${res.msg}`);
  if (!res.ok) console.log('      ' + log.join(' | '));
  return res.ok;
}

const fps = (hz, ms) => Array.from({ length: Math.floor((ms * hz) / 1000) }, (_, i) => (i * 1000) / hz + gauss() * 2);
const restR = { x: 0.85, y: 0.95 };
const restL = { x: 0.45, y: 0.98 };

function expectTimes(script, tol = 120) {
  return (e) => {
    if (!e) return { ok: false, msg: 'pas de fin détectée' };
    const ds = e.startT - script.truthStart;
    const de = e.endT - script.truthEnd;
    const ok = Math.abs(ds) <= tol && Math.abs(de) <= tol;
    return {
      ok,
      msg: `durée ${(e.duration / 1000).toFixed(3)} s (vraie ${((script.truthEnd - script.truthStart) / 1000).toFixed(3)}), écart départ ${ds.toFixed(0)} ms, fin ${de.toFixed(0)} ms, confiance ${e.confidence}`,
    };
  };
}

let all = true;

for (const hz of [30, 15]) {
  // 1. Cul sec normal
  {
    const sc = chugScript({ restUntil: 2000, drinkMs: 4200, rest: restR });
    const frames = fps(hz, 9000).map((t) => {
      const { hand, tilt } = sc.at(t);
      return [t, [pose({ handR: hand, handL: restL, tilt })]];
    });
    all &= run(`Pinte normale (${hz} i/s)`, { frames, expect: expectTimes(sc, hz === 30 ? 120 : 150) });
  }
}

// 2. Quelqu'un passe derrière et lève la main pendant le cul sec
{
  const sc = chugScript({ restUntil: 1800, drinkMs: 3500, rest: restR });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = sc.at(t);
    const me = pose({ handR: hand, handL: restL, tilt });
    // passant : plus petit, traverse l'image, main à sa bouche puis en bas, en boucle
    const px = 0.1 + ((t / 4000) % 1) * 1.1;
    const pm = mouthOf(px, 0.45, 0.18);
    const phand = Math.floor(t / 700) % 2 ? { x: pm.x, y: pm.y + 0.02 } : { x: px + 0.1, y: 0.75 };
    const other = pose({ cx: px, sy: 0.45, sw: 0.18, handR: phand, handL: { x: px - 0.1, y: 0.8 } });
    return [t, t % 2 ? [other, me] : [me, other]];
  });
  all &= run('Passant derrière qui boit aussi', { frames, expect: expectTimes(sc) });
}

// 3. Verre posé hors champ (la main sort par le bas)
{
  const sc = chugScript({ restUntil: 1500, drinkMs: 5000, rest: { x: 0.9, y: 1.25 } });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = sc.at(t);
    return [t, [pose({ handR: { ...hand, v: hand.y > 1 ? 0.05 : 0.9 }, handL: { x: 0.45, y: 1.2, v: 0.05 }, tilt })]];
  });
  all &= run('Verre posé hors champ', { frames, expect: expectTimes(sc, 150) });
}

// 4. Visage masqué par le verre : images sans squelette pendant le cul sec
{
  const sc = chugScript({ restUntil: 1500, drinkMs: 4500, rest: restR });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = sc.at(t);
    const drinking = t > sc.truthStart + 300 && t < sc.truthEnd - 200;
    const drop = drinking && (rnd() < 0.35 || (t > sc.truthStart + 1500 && t < sc.truthStart + 2400));
    return [t, drop ? [] : [pose({ handR: hand, handL: restL, tilt })]];
  });
  all &= run('Trous de détection (verre devant le visage)', { frames, expect: expectTimes(sc) });
}

// 5. Faux départ (main à la bouche 0,5 s) puis vrai cul sec
{
  const fake = chugScript({ restUntil: 1500, raiseMs: 250, drinkMs: 500, lowerMs: 250, rest: restR });
  const sc = chugScript({ restUntil: 4500, drinkMs: 3800, rest: restR });
  const frames = fps(30, 11000).map((t) => {
    const { hand, tilt } = t < 4000 ? fake.at(t) : sc.at(t);
    return [t, [pose({ handR: hand, handL: restL, tilt })]];
  });
  all &= run('Geste devant la bouche puis vrai cul sec', { frames, expect: expectTimes(sc) });
}

// 6. Verre déjà à la bouche à l'ouverture de la caméra : ne doit pas partir au milieu
{
  const sc = chugScript({ restUntil: 3500, drinkMs: 3000, rest: restR });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = t < 1500 ? { hand: mouthOf(0.67, 0.62, 0.36), tilt: 0.05 } : sc.at(t);
    return [t, [pose({ handR: hand, handL: restL, tilt })]];
  });
  all &= run("Verre à la bouche dès l'ouverture", { frames, expect: expectTimes(sc) });
}

// 7. Téléphone posé bas (épaules en bas de l'image, ancien bug « fin immédiate »)
{
  const sc = chugScript({ restUntil: 1500, drinkMs: 4000, rest: { x: 0.95, y: 1.15 }, sy: 0.92, sw: 0.42 });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = sc.at(t);
    return [t, [pose({ sy: 0.92, sw: 0.42, handR: hand, handL: { x: 0.4, y: 1.2, v: 0.05 }, tilt })]];
  });
  all &= run('Téléphone posé bas', { frames, expect: expectTimes(sc, 150) });
}

// 8. Deux mains sur le litre
{
  const sc = chugScript({ restUntil: 1500, drinkMs: 8000, rest: restR });
  const frames = fps(30, 13000).map((t) => {
    const { hand, tilt } = sc.at(t);
    return [t, [pose({ handR: hand, handL: { x: hand.x - 0.12, y: hand.y + 0.02 }, tilt })]];
  });
  all &= run('Litre à deux mains', { frames, minDrinkMs: 2000, expect: expectTimes(sc) });
}

// 9. Personne ne boit : aucun départ en 15 s de gesticulation sous les épaules
{
  const frames = fps(30, 15000).map((t) => [
    t,
    [pose({ handR: { x: 0.8 + Math.sin(t / 300) * 0.1, y: 0.7 + Math.sin(t / 500) * 0.08 }, handL: restL })],
  ]);
  all &= run('Pas de faux départ en discutant', {
    frames,
    expect: (e, log) => ({ ok: !e && !log.some((l) => l.includes('start')), msg: log.join(', ') || 'rien déclenché' }),
  });
}

// 10. Selfie : le bras qui tient le téléphone est hors champ, mais le modèle
//     « devine » sa main près du visage (visibilité quasi nulle)
{
  const sc = chugScript({ restUntil: 1500, drinkMs: 4000, rest: restR });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = sc.at(t);
    const ghost = { ...mouthOf(0.67, 0.62, 0.36), v: 0.04 };
    ghost.x -= 0.08;
    return [t, [pose({ handR: hand, handL: ghost, tilt })]];
  });
  all &= run('Selfie : main fantôme près du visage', { frames, expect: expectTimes(sc) });
}

// 11. Ami très proche à côté (plus grand dans l'image) qui arrive pendant le cul sec
{
  const sc = chugScript({ restUntil: 1500, drinkMs: 4000, rest: restR });
  const frames = fps(30, 9000).map((t) => {
    const { hand, tilt } = sc.at(t);
    const me = pose({ handR: hand, handL: restL, tilt });
    if (t < 2500) return [t, [me]];
    const pal = pose({ cx: 1.2, sy: 0.55, sw: 0.5, handR: { x: 1.15, y: 0.45 }, handL: { x: 1.05, y: 0.95 } });
    return [t, [pal, me]];
  });
  all &= run('Pote collé à côté pendant le cul sec', { frames, expect: expectTimes(sc) });
}

console.log(all ? '\nTous les scénarios passent.' : '\nDes scénarios échouent.');
process.exit(all ? 0 : 1);
