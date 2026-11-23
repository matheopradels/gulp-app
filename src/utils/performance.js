export const FORMATS = ['Galopin', 'Demi', 'Pinte', 'Litre'];

export const FORMAT_VOLUME_CL = {
  Galopin: 12.5,
  Demi: 25,
  Pinte: 50,
  Litre: 100,
};

export const PERFORMANCE_THRESHOLDS = {
  Galopin: { elite: 1700, good: 2200, fair: 2800 },
  Demi: { elite: 2800, good: 3400, fair: 4100 },
  Pinte: { elite: 4500, good: 5300, fair: 6400 },
  Litre: { elite: 8000, good: 9200, fair: 11400 },
};

export const MIN_PLAUSIBLE_MS = {
  Galopin: 500,
  Demi: 800,
  Pinte: 1200,
  Litre: 2000,
};

export const MAX_PLAUSIBLE_MS = 120000;

export function getPerformanceTier(ms, format) {
  const t = PERFORMANCE_THRESHOLDS[format];
  if (!t) return 'unknown';
  if (ms < t.elite) return 'elite';
  if (ms < t.good) return 'vert';
  if (ms < t.fair) return 'orange';
  return 'rouge';
}

const TIER_TEXT_CLASS = {
  elite: 'text-[#CEFF00]',
  vert: 'text-green-400',
  orange: 'text-orange-500',
  rouge: 'text-red-500',
  unknown: 'text-white',
};

export function getTimerColor(ms, format) {
  return TIER_TEXT_CLASS[getPerformanceTier(ms, format)];
}

export function getTierLabel(tier) {
  return { elite: 'ÉLITE', vert: 'SOLIDE', orange: 'MOYEN', rouge: 'À REVOIR' }[tier] || '';
}

export function isPlausible(ms, format) {
  const min = MIN_PLAUSIBLE_MS[format];
  if (min == null) return false;
  return ms >= min && ms < MAX_PLAUSIBLE_MS;
}

export function formatSeconds(ms, decimals = 2) {
  return (Math.max(0, ms) / 1000).toFixed(decimals);
}
