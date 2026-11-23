import { collection, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { computeDistance } from '../utils/geo';
import { readJSON, subscribeKey } from './localStore';

/**
 * Trois sources de bars, fusionnées :
 *  1. src/data/bars/<zone>.json — base OpenStreetMap générée par `npm run fetch-bars`,
 *     un fichier par zone (Paris, Île-de-France, Lille…), chargé seulement
 *     quand le joueur est dans le coin
 *  2. les bars ajoutés sur ce téléphone (localStorage)
 *  3. la collection Firestore `bars` (bars ajoutés par les joueurs)
 */
const BARS_COLLECTION = 'bars';
const LOCAL_BARS_KEY = 'gulp_local_bars';
const ZONE_MARGIN_DEG = 0.25; // ~25 km autour d'une zone
const DEFAULT_ZONE = 'paris';

const normalize = (b) => {
  const lat = Number(b.lat);
  const lng = Number(b.lng ?? b.lon);
  if (!b.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const n = String(b.name).trim();
  if (String(b.id).startsWith('osm_') && (n.length < 3 || /^\d+$/.test(n) || /^(bar|pub|café|cafe|brasserie|bistrot?|buvette|tabac)$/i.test(n))) return null;
  return {
    id: String(b.id),
    name: String(b.name),
    address: b.address || '',
    city: b.city || '',
    lat,
    lng,
    happyHours: b.hh || '',
    isPartner: Boolean(b.isPartner),
    offer: b.offer || null,
  };
};

// ---------- Base OpenStreetMap, par zones ----------
const zoneFiles = import.meta.glob(['../data/bars/*.json', '!../data/bars/index.json']);
const zoneLoader = (id) => zoneFiles[`../data/bars/${id}.json`];

let staticBars = [];
const loadedZones = new Set();
const staticListeners = new Set();
let indexPromise = null;
const loadIndex = () => {
  if (!indexPromise) {
    indexPromise = import('../data/bars/index.json')
      .then((m) => (Array.isArray(m.default) ? m.default : []).filter((z) => zoneLoader(z.id)))
      .catch(() => []);
  }
  return indexPromise;
};

const loadZone = async (id) => {
  if (loadedZones.has(id) || !zoneLoader(id)) return;
  loadedZones.add(id);
  try {
    const mod = await zoneLoader(id)();
    const bars = (Array.isArray(mod.default) ? mod.default : []).map(normalize).filter(Boolean);
    staticBars = staticBars.concat(bars);
    staticListeners.forEach((fn) => fn());
  } catch {
    loadedZones.delete(id);
  }
};

/**
 * Charge les zones autour d'une position. Sans position connue (ou hors de
 * toute zone), on charge Paris par défaut pour que la carte ne soit pas vide.
 */
export const ensureBarsNear = async (lat, lng) => {
  const index = await loadIndex();
  if (index.length === 0) return;
  let zones = [];
  if (lat != null && lng != null) {
    zones = index.filter(
      ({ bbox: [s, w, n, e] }) =>
        lat >= s - ZONE_MARGIN_DEG && lat <= n + ZONE_MARGIN_DEG && lng >= w - ZONE_MARGIN_DEG && lng <= e + ZONE_MARGIN_DEG
    );
  }
  if (zones.length === 0 && loadedZones.size === 0) {
    zones = [index.find((z) => z.id === DEFAULT_ZONE) || index[0]];
  }
  await Promise.all(zones.map((z) => loadZone(z.id)));
};

const getLocalBars = () => readJSON(LOCAL_BARS_KEY, []).map(normalize).filter(Boolean);

/** Abonnement à la liste complète. Le callback est rappelé à chaque changement. */
export const subscribeToAllBars = (callback) => {
  let alive = true;
  let localBars = getLocalBars();
  let remoteBars = [];

  const emit = () => {
    if (!alive) return;
    const seen = new Set();
    const merged = [];
    for (const b of [...remoteBars, ...localBars, ...staticBars]) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      merged.push(b);
    }
    callback(merged);
  };

  // Premier envoi asynchrone : le composant a le temps de finir son montage.
  Promise.resolve().then(emit);
  staticListeners.add(emit);
  const offLocal = subscribeKey(LOCAL_BARS_KEY, () => {
    localBars = getLocalBars();
    emit();
  });
  let offRemote = () => {};
  if (isFirebaseConfigured) {
    offRemote = onSnapshot(
      collection(db, BARS_COLLECTION),
      (snap) => {
        remoteBars = snap.docs.map((d) => normalize({ id: d.id, ...d.data() })).filter(Boolean);
        emit();
      },
      (error) => console.warn('Bars en ligne indisponibles :', error?.code || error)
    );
  }

  return () => {
    alive = false;
    staticListeners.delete(emit);
    offLocal();
    offRemote();
  };
};

/** Les `count` bars les plus proches d'une position, avec leur distance en mètres. */
export const nearestBars = (bars, lat, lng, count = 30) => {
  if (lat == null || lng == null) return bars.slice(0, count).map((b) => ({ ...b, distance: Infinity }));
  return bars
    .map((b) => ({ ...b, distance: computeDistance(lat, lng, b.lat, b.lng) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
};

export const formatDistance = (m) =>
  !Number.isFinite(m) ? '' : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
