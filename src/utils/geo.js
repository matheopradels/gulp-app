export function computeDistance(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rayon autour d'un bar dans lequel une perf compte pour le classement. */
export const GEOFENCE_RADIUS_M = Number(import.meta.env.VITE_GEOFENCE_RADIUS) || 100;

/**
 * true  : le chrono refuse de partir hors d'un bar de la liste.
 * false : le chrono est libre partout ; seule la perf CLASSÉE exige un bar à portée.
 * (Réglable aussi via VITE_REQUIRE_BAR=true dans .env.local.)
 */
export const REQUIRE_BAR_TO_START = import.meta.env.VITE_REQUIRE_BAR === 'true';

/** Nombre de perfs enregistrées avant de pouvoir ajouter un bar à la carte. */
export const MIN_PERFS_TO_ADD_BAR = 5;
