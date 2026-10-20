"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/equinoxe/Header";
import LoginForm from "@/components/auth/LoginForm";
import styles from "./InvestigationLogin.module.css";

interface InvestigationLoginProps {
  /** Faux : aucun mot de passe n'est configuré sur le serveur (accès fermé). */
  configured: boolean;
  /** Nom de l'espace protégé. */
  title?: string;
}

// Écran d'accès à un espace privé (Investigation, Mon espace) : identifiant et mot de passe, puis la page se recharge ouverte.
export default function InvestigationLogin({ configured, title = "Investigation" }: InvestigationLoginProps) {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>{title}</h1>
          {configured ? (
            <LoginForm hint="Espace privé. Entre ton identifiant et ton mot de passe pour continuer." onSuccess={() => router.refresh()} submitLabel="Entrer" />
          ) : (
            <p className={styles.error}>
              Accès fermé : aucun mot de passe n&apos;est configuré sur le serveur (variable ADMIN_PASSWORD, à définir dans les réglages de
              Vercel).
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
