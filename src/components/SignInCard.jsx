import React from 'react';
import Card from './ui/Card';
import GoogleButton from './GoogleButton';
import { useUser } from '../contexts/UserContext';

/** Encart d'invitation à se connecter, affiché aux visiteurs là où un compte est utile. */
export default function SignInCard({ title, text }) {
  const { canSignIn } = useUser();
  return (
    <Card className="!py-5">
      <p className="font-bold text-white">{title}</p>
      <p className="text-sm text-zinc-400 mt-1">{text}</p>
      {canSignIn ? (
        <GoogleButton className="mt-4" />
      ) : (
        <p className="text-xs text-zinc-500 mt-3">La connexion n'est pas disponible dans cette version.</p>
      )}
    </Card>
  );
}
