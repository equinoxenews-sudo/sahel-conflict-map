"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { OPEN_LOGIN_EVENT } from "@/lib/session";
import { useHasMounted } from "@/lib/useHasMounted";
import LoginForm from "./LoginForm";
import styles from "./LoginDialog.module.css";

// Fenêtre de connexion ouverte depuis « Log in » (menu du haut ou barre du bas). Montée une fois dans le layout.
export default function LoginDialog() {
  const router = useRouter();
  const mounted = useHasMounted();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_LOGIN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Connexion">
      <button type="button" className={styles.backdrop} aria-label="Fermer" onClick={() => setOpen(false)} />
      <div className={styles.card}>
        <div className={styles.head}>
          <h2 className={styles.title}>Connexion</h2>
          <button type="button" className={styles.close} aria-label="Fermer" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <LoginForm
          hint="Donne accès à « Mon espace »."
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </div>
    </div>,
    document.body
  );
}
