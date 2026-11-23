/**
 * Invitations aux clans par lien : https://…/?join=123456
 *
 * Le code est mis de côté dès l'ouverture du lien (avant l'écran d'âge et la
 * connexion) et n'est effacé qu'une fois l'entrée dans le clan réglée :
 * réussite, clan introuvable ou complet. Une erreur réseau le garde.
 */
const KEY = 'gulp_pending_join';
const TTL_MS = 7 * 24 * 3600 * 1000;

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/** Extrait un code à 6 chiffres, même si le lien a été abîmé (« ?join=123456. », espaces…). */
export const parseJoinCode = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 6 ? digits.slice(0, 6) : null;
};

/** À appeler au démarrage : lit ?join= (ou /join/123456) et nettoie l'adresse. */
export const captureInviteFromUrl = () =>
  safe(() => {
    const url = new URL(window.location.href);
    let raw = url.searchParams.get('join');
    const m = url.pathname.match(/^\/(?:join|j)\/([^/]+)/);
    if (!raw && m) raw = m[1];
    const code = parseJoinCode(raw);
    if (code) {
      const value = JSON.stringify({ code, at: Date.now() });
      localStorage.setItem(KEY, value);
      sessionStorage.setItem(KEY, value);
    }
    if (raw != null) {
      url.searchParams.delete('join');
      window.history.replaceState({}, '', (m ? '/' : url.pathname) + url.search + url.hash);
    }
    // On ouvre l'onglet Clans pour un lien tout juste ouvert (ou après le
    // retour de connexion Google dans le même onglet), pas à chaque lancement.
    return Boolean(code || (sessionStorage.getItem(KEY) && getPendingInvite()));
  }, false);

export const getPendingInvite = () =>
  safe(() => {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!raw) return null;
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch {
      entry = { code: parseJoinCode(raw), at: Date.now() }; // ancien format (code seul)
    }
    if (!entry?.code || Date.now() - (entry.at || 0) > TTL_MS) {
      clearPendingInvite();
      return null;
    }
    return entry.code;
  });

export const clearPendingInvite = () =>
  safe(() => {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  });

export const inviteUrl = (code) => `${window.location.origin}/${code ? `?join=${code}` : ''}`;

/**
 * Navigateur intégré d'une appli (Instagram, Snapchat, Messenger, TikTok…) :
 * Google y refuse la connexion (« disallowed_useragent »). On le détecte pour
 * proposer d'ouvrir le lien dans Safari ou Chrome.
 */
export const inAppBrowserName = (ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') => {
  const rules = [
    [/Instagram/i, 'Instagram'],
    [/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i, 'Facebook / Messenger'],
    [/Snapchat/i, 'Snapchat'],
    [/musical_ly|BytedanceWebview|TikTok|trill/i, 'TikTok'],
    [/LinkedInApp/i, 'LinkedIn'],
    [/Twitter|TwitterAndroid/i, 'X (Twitter)'],
    [/Line\//i, 'Line'],
    [/MicroMessenger/i, 'WeChat'],
    [/Pinterest/i, 'Pinterest'],
    [/; wv\)/i, 'une appli'], // WebView Android générique
  ];
  for (const [re, name] of rules) if (re.test(ua)) return name;
  return null;
};

export const isAndroid = () => safe(() => /Android/i.test(navigator.userAgent), false);

/** Lien qui force l'ouverture dans Chrome sur Android. */
export const chromeIntentUrl = (url) => {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
};
