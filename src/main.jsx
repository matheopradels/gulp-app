import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);

// PWA : installable et utilisable hors ligne une fois chargée (prod uniquement).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    // Une fois l'app affichée, on précharge tous les écrans : ils seront là
    // même sans réseau au fond du bar.
    setTimeout(() => {
      [
        () => import('./pages/Jeux'),
        () => import('./pages/Profile'),
        () => import('./pages/Ranking'),
        () => import('./pages/Groups'),
        () => import('./pages/Discover'),
        () => import('./games/Duel'),
        () => import('./games/Relais'),
        () => import('./games/Precision'),
        () => import('./games/Reflexe'),
        () => import('./games/Roulette'),
        () => import('./games/Cartes'),
        () => import('./games/party/DeckGame'),
        () => import('./games/party/ActionVerite'),
        () => import('./games/party/SeptSecondes'),
        () => import('./games/party/Quiz'),
        () => import('./games/party/Cercle'),
        () => import('./games/party/PMU'),
        () => import('./games/party/Imposteur'),
      ].forEach((load) => load().catch(() => {}));
    }, 2500);
  });
}
