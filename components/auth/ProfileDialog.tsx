"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCode } from "@/lib/accountProfile";
import { logout, OPEN_PROFILE_EVENT } from "@/lib/session";
import { useHasMounted } from "@/lib/useHasMounted";
import loginStyles from "./LoginDialog.module.css";
import styles from "./ProfileDialog.module.css";

interface Profile {
  name: string;
  access: string;
  code: string | null;
  codeError: string | null;
}

// Panneau du profil, ouvert en cliquant sur le pseudo en haut à droite : pseudo, mot de passe (étoiles fixes, non
// modifiable ici), accès et IDcode. Monté une fois dans le layout. L'IDcode et le pseudo sont ce qu'on communique à une
// personne qui veut nous partager un dossier.
export default function ProfileDialog() {
  const mounted = useHasMounted();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_PROFILE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PROFILE_EVENT, onOpen);
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
  return createPortal(<ProfileCard onClose={() => setOpen(false)} />, document.body);
}

// Le contenu n'existe que panneau ouvert : le profil est relu à chaque ouverture.
function ProfileCard({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profil indisponible : reconnecte-toi.");
        return (await response.json()) as Profile;
      })
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Profil indisponible.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyCode() {
    if (!profile?.code) return;
    try {
      await navigator.clipboard.writeText(formatCode(profile.code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copie impossible : sélectionne le code à la main.");
    }
  }

  async function regenerate() {
    if (!window.confirm("Générer un nouvel IDcode ? L'ancien ne permettra plus de te partager quoi que ce soit.")) return;
    setError(null);
    try {
      const response = await fetch("/api/profile/code", { method: "POST" });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { code: string };
      setProfile((current) => (current ? { ...current, code: body.code, codeError: null } : current));
    } catch {
      setError("Impossible de générer un nouveau code pour le moment.");
    }
  }

  async function signOut() {
    if (!window.confirm(`Se déconnecter (${profile?.name ?? ""}) ?`)) return;
    await logout();
    onClose();
    if (pathname?.startsWith("/mon-espace")) router.push("/");
    else router.refresh();
  }

  return (
    <div className={loginStyles.overlay} role="dialog" aria-modal="true" aria-label="Mon profil">
      <button type="button" className={loginStyles.backdrop} aria-label="Fermer" onClick={onClose} />
      <div className={loginStyles.card}>
        <div className={loginStyles.head}>
          <h2 className={loginStyles.title}>Mon profil</h2>
          <button type="button" className={loginStyles.close} aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>
        {profile ? (
          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.label}>Pseudo</span>
              <span className={styles.value}>{profile.name}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Mot de passe</span>
              <span className={`${styles.value} ${styles.locked}`} aria-label="Mot de passe masqué, non modifiable">
                ••••••••••
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Accès</span>
              <span className={styles.value}>{profile.access}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>IDcode</span>
              <span className={`${styles.value} ${styles.code}`}>
                <span className={styles.grow}>{profile.code ? formatCode(profile.code) : "—"}</span>
                {profile.code && (
                  <>
                    <button type="button" className={styles.small} onClick={() => void copyCode()}>
                      {copied ? "Copié" : "Copier"}
                    </button>
                    <button type="button" className={styles.small} onClick={() => void regenerate()}>
                      Renouveler
                    </button>
                  </>
                )}
              </span>
              {profile.codeError ? (
                <p className={styles.hint}>{profile.codeError}</p>
              ) : (
                <p className={styles.hint}>Ton pseudo et ton IDcode permettent à une autre personne de te partager un dossier ou un graph.</p>
              )}
            </div>
          </div>
        ) : (
          <p className={styles.hint}>{error ?? "Chargement…"}</p>
        )}
        {profile && error && <p className={styles.error}>{error}</p>}
        {profile && (
          <button type="button" className={styles.logout} onClick={() => void signOut()}>
            Se déconnecter
          </button>
        )}
      </div>
    </div>
  );
}
