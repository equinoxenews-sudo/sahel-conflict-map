"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Header from "@/components/equinoxe/Header";
import { unlockCloud } from "@/lib/investigation/cloudSync";
import styles from "./InvestigationLogin.module.css";

interface InvestigationLoginProps {
  /** Faux : aucun mot de passe n'est configuré sur le serveur (accès fermé). */
  configured: boolean;
}

// Écran d'accès à l'espace Investigation : un mot de passe, puis la page se recharge ouverte.
export default function InvestigationLogin({ configured }: InvestigationLoginProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) return;
    setBusy(true);
    setError(null);
    try {
      await unlockCloud(password);
      setPassword("");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <form className={styles.card} onSubmit={submit}>
          <h1 className={styles.title}>Investigation</h1>
          <p className={styles.text}>Espace de travail privé. Entre le mot de passe pour continuer.</p>
          {configured ? (
            <>
              <input
                className={styles.input}
                type="password"
                autoComplete="current-password"
                autoFocus
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-label="Mot de passe"
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <button type="submit" className={styles.button} disabled={busy || !password}>
                {busy ? "Vérification…" : "Entrer"}
              </button>
            </>
          ) : (
            <p className={styles.error}>
              Accès fermé : aucun mot de passe n&apos;est configuré sur le serveur (variable ADMIN_PASSWORD, à définir dans les réglages de
              Vercel).
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
