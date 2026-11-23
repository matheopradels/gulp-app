import React, { lazy, Suspense, useEffect, useState } from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import Navbar from './components/Navbar';
import AgeGate, { hasPassedAgeGate } from './components/AgeGate';
import Welcome from './components/Welcome';
import { hasOnboarded } from './services/authService';
import { captureInviteFromUrl } from './services/inviteService';
import Gulp from './pages/Gulp';
import './index.css';

// Le chrono (onglet par défaut) est chargé immédiatement ; les autres pages
// arrivent à la demande. Discover embarque Leaflet (~150 Ko) : inutile de le
// faire télécharger à quelqu'un qui ouvre l'app pour lancer un chrono.
const Discover = lazy(() => import('./pages/Discover'));
const Groups = lazy(() => import('./pages/Groups'));
const Ranking = lazy(() => import('./pages/Ranking'));
const Profile = lazy(() => import('./pages/Profile'));
const Jeux = lazy(() => import('./pages/Jeux'));

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Chargement…</div>
);

/**
 * Mise en page : colonne pleine hauteur, le contenu défile, la barre de
 * navigation est DANS le flux (jamais par-dessus un bouton).
 */
function Shell() {
  const { user, loading, canSignIn } = useUser();
  const [activeTab, setActiveTab] = useState(() => (captureInviteFromUrl() ? 'groups' : 'gulp'));
  const [selectedBar, setSelectedBar] = useState(null);
  const [adult, setAdult] = useState(hasPassedAgeGate);
  const [welcomed, setWelcomed] = useState(hasOnboarded);

  // Connexion terminée (popup ou retour de redirection) : plus d'écran d'accueil.
  useEffect(() => {
    if (!user.isGuest) setWelcomed(true);
  }, [user.isGuest]);

  let screen = null;
  if (!adult) screen = <AgeGate onAccept={() => setAdult(true)} />;
  else if (canSignIn && !welcomed && user.isGuest) {
    screen = loading ? <PageLoader /> : <Welcome onDone={() => setWelcomed(true)} />;
  }

  return (
    <div className="app-shell max-w-md mx-auto bg-black text-white flex flex-col font-sans selection:bg-[#CEFF00] selection:text-black">
      {screen || (
        <>
          <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="min-h-full flex flex-col px-4 pb-9">
              <Suspense fallback={<PageLoader />}>
                {activeTab === 'discover' && <Discover />}
                {activeTab === 'groups' && <Groups />}
                {activeTab === 'gulp' && <Gulp selectedBar={selectedBar} setSelectedBar={setSelectedBar} />}
                {activeTab === 'jeux' && <Jeux />}
                {activeTab === 'ranking' && <Ranking />}
                {activeTab === 'profile' && <Profile />}
              </Suspense>
            </div>
          </main>
          <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Shell />
    </UserProvider>
  );
}
