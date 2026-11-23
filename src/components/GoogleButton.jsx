import React, { useState } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { chromeIntentUrl, getPendingInvite, inAppBrowserName, inviteUrl, isAndroid } from '../services/inviteService';

/**
 * Dans le navigateur intégré d'Instagram, Snapchat, Messenger… Google refuse
 * la connexion. On l'explique et on aide à rouvrir le lien (avec le code
 * d'invitation) dans Safari ou Chrome.
 */
function InAppWarning({ app }) {
  const [copied, setCopied] = useState(false);
  const url = inviteUrl(getPendingInvite());
  const android = isAndroid();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copie ce lien :', url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="mb-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 text-sm text-orange-100">
      <p className="font-bold">Tu as ouvert le lien dans {app}.</p>
      <p className="mt-1 text-orange-100/80">
        Google bloque la connexion dans le navigateur de cette appli. Ouvre GULP dans {android ? 'Chrome' : 'Safari'} :{' '}
        {android ? 'touche le bouton ci-dessous.' : 'touche ••• (ou l’icône de partage) puis « Ouvrir dans Safari », ou copie le lien et colle-le dans Safari.'}
      </p>
      <div className="mt-3 flex gap-2">
        {android && (
          <a href={chromeIntentUrl(url)} className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2">
            <ExternalLink size={16} /> Ouvrir dans Chrome
          </a>
        )}
        <button onClick={copy} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-white font-bold flex items-center justify-center gap-2">
          <Copy size={16} /> {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
      </div>
    </div>
  );
}

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** Bouton « Continuer avec Google », avec le message d'erreur éventuel. */
export default function GoogleButton({ label = 'Continuer avec Google', className = '', onSignedIn }) {
  const { signIn, busy, authError } = useUser();
  const app = inAppBrowserName();
  return (
    <div className={className}>
      {app && <InAppWarning app={app} />}
      <button
        onClick={async () => {
          const ok = await signIn();
          if (ok) onSignedIn?.();
        }}
        disabled={busy}
        className="w-full py-3.5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        <GoogleLogo />
        {busy ? 'Connexion…' : label}
      </button>
      {authError && (
        <p className="text-xs text-red-400 mt-2 text-center" role="alert">
          {authError}
        </p>
      )}
    </div>
  );
}
