"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useHasMounted } from "@/lib/useHasMounted";
import { zoneHomeHref } from "@/lib/homeZones";
import { logout, openLogin, useSession } from "@/lib/session";
import { TRACKING_ENABLED, ZONES } from "@/lib/zones";
import styles from "./MobileDrawer.module.css";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  // Portalled to <body> — Header is `position: sticky` with its own
  // z-index, which caps how high anything nested inside it (this drawer)
  // can ever rank against siblings outside Header, like the bottom nav.
  const mounted = useHasMounted();
  const { user } = useSession();
  const router = useRouter();
  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <button type="button" className={styles.backdrop} aria-label="Fermer" onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          {/* unoptimized: see Header.tsx — Next's resizer flattens this
              PNG's alpha channel to opaque black. */}
          <Image
            src="/equinoxe/logo-equinoxe-wordmark.png"
            alt="Équinoxe News"
            width={2167}
            height={726}
            unoptimized
            className={styles.logo}
          />
          <button type="button" className={styles.closeBtn} aria-label="Fermer" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className={styles.links}>
          <Link href="/" onClick={onClose} className={styles.link}>
            Accueil
          </Link>
          <Link href="/?tab=actualites" onClick={onClose} className={styles.link}>
            Actualités
          </Link>
          <Link href="/?tab=zones" onClick={onClose} className={styles.link}>
            Zones
          </Link>
          {ZONES.filter((z) => z.slug !== "tracking").map((zone) => (
            <Link key={zone.slug} href={zoneHomeHref(zone.slug)} onClick={onClose} className={styles.sublink}>
              {zone.name}
            </Link>
          ))}
          {TRACKING_ENABLED && (
            <Link href="/zones/tracking" onClick={onClose} className={styles.link}>
              Tracking
            </Link>
          )}
          {user ? (
            <>
              <Link href="/mon-espace" onClick={onClose} className={styles.link}>
                Mon espace
              </Link>
              <Link href="/investigation" onClick={onClose} className={styles.link}>
                Investigation
              </Link>
            </>
          ) : null}
        </nav>

        <div className={styles.divider} />

        <nav className={styles.links}>
          <span className={styles.linkDisabled}>Paramètres</span>
          {user ? (
            <button
              type="button"
              className={styles.link}
              onClick={async () => {
                onClose();
                await logout();
                router.push("/");
                router.refresh();
              }}
            >
              Se déconnecter ({user})
            </button>
          ) : (
            <button
              type="button"
              className={styles.link}
              onClick={() => {
                onClose();
                openLogin();
              }}
            >
              Log In
            </button>
          )}
        </nav>
      </div>
    </div>,
    document.body
  );
}
