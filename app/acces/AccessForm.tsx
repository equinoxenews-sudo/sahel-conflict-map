"use client";

import LoginForm from "@/components/auth/LoginForm";

// Après la connexion, rechargement complet vers la page demandée : la porte relit le cookie tout juste posé.
export default function AccessForm({ target }: { target: string }) {
  return <LoginForm submitLabel="Entrer" onSuccess={() => window.location.assign(target)} />;
}
