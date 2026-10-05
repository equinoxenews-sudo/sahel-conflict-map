"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Admin.module.css";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Connexion impossible.");
        return;
      }
      router.refresh();
    } catch {
      setError("Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={submit}>
      <h1 className={styles.loginTitle}>Relecture des points de situation</h1>
      <input
        type="password"
        className={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        autoFocus
      />
      <button type="submit" className={styles.primary} disabled={busy || password === ""}>
        {busy ? "Connexion…" : "Se connecter"}
      </button>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
