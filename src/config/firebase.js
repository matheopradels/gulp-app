import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FIREBASE_CONFIG } from './firebaseConfig';

/**
 * Firebase est activé dès que la configuration est remplie (firebaseConfig.js
 * ou .env.local). Sans elle, l'app tourne en mode local : chrono, jeux et
 * records restent sur le téléphone, et la connexion Google est masquée.
 */
const env = import.meta.env;
const pick = (key, fallback) => (env[key] && String(env[key]).trim()) || fallback;

const firebaseConfig = {
  apiKey: pick('VITE_FIREBASE_API_KEY', FIREBASE_CONFIG.apiKey),
  authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN', FIREBASE_CONFIG.authDomain),
  projectId: pick('VITE_FIREBASE_PROJECT_ID', FIREBASE_CONFIG.projectId),
  storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET', FIREBASE_CONFIG.storageBucket),
  messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID', FIREBASE_CONFIG.messagingSenderId),
  appId: pick('VITE_FIREBASE_APP_ID', FIREBASE_CONFIG.appId),
};

// Quand l'app est servie par Firebase Hosting, la connexion Google passe par
// le même domaine que l'app : indispensable pour Safari (iPhone), qui bloque
// les cookies d'un autre domaine pendant la connexion.
if (typeof window !== 'undefined' && /\.(web\.app|firebaseapp\.com)$/.test(window.location.hostname)) {
  firebaseConfig.authDomain = window.location.host;
}

const looksReal = (v) => typeof v === 'string' && v.length > 5 && !/your_|placeholder/i.test(v);

export const isFirebaseConfigured =
  looksReal(firebaseConfig.apiKey) && looksReal(firebaseConfig.projectId) && looksReal(firebaseConfig.appId);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  // Cache hors-ligne partagé entre onglets : l'app reste utilisable au fond
  // d'un bar sans réseau, les écritures partent dès que la connexion revient.
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    db = getFirestore(app);
  }
  auth = getAuth(app);
  auth.languageCode = 'fr';
}

export { app, db, auth };
