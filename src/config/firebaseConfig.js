/**
 * Configuration Firebase de GULP!.
 * Ces clés ne sont pas secrètes : elles identifient le projet, la sécurité
 * est assurée par les règles Firestore (firestore.rules) et les domaines
 * autorisés dans la console Firebase. Les variables VITE_FIREBASE_* d'un
 * fichier .env.local, si elles existent, passent devant.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDB4uGJarcpfeapRkI9BqXsGlkqfE1ZgMc',
  authDomain: 'gulp-637e2.firebaseapp.com',
  projectId: 'gulp-637e2',
  storageBucket: 'gulp-637e2.firebasestorage.app',
  messagingSenderId: '418725047288',
  appId: '1:418725047288:web:5c7c3a19ef89d6eccdc40d',
};
