"use client";

import { useState, type FormEvent } from "react";
import { login } from "@/lib/session";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  onSuccess: () => void;
  /** Texte sous le titre ; absent = rien. */
  hint?: string;
  submitLabel?: string;
}

// Identifiant + mot de passe. Pas de création de compte : les comptes sont créés à la main (scripts/create-account.ts).
export default function LoginForm({ onSuccess, hint, submitLabel = "Se connecter" }: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(identifier, password);
      setPassword("");
      onSuccess();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <input
        className={styles.input}
        type="text"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        placeholder="Identifiant"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        aria-label="Identifiant"
      />
      <input
        className={styles.input}
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Mot de passe"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-label="Mot de passe"
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.button} disabled={busy || !identifier.trim() || !password}>
        {busy ? "Vérification…" : submitLabel}
      </button>
    </form>
  );
}
