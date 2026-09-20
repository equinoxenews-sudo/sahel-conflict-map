"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useHasMounted } from "@/lib/useHasMounted";
import { ZONES } from "@/lib/zones";
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
            <Link key={zone.slug} href={`/zones/${zone.slug}`} onClick={onClose} className={styles.sublink}>
              {zone.name}
            </Link>
          ))}
          <Link href="/zones/tracking" onClick={onClose} className={styles.link}>
            Tracking
          </Link>
          <Link href="/mon-espace" onClick={onClose} className={styles.link}>
            Mon espace
          </Link>
        </nav>

        <div className={styles.divider} />

        <nav className={styles.links}>
          <span className={styles.linkDisabled}>Paramètres</span>
          <Link href="/mon-espace" onClick={onClose} className={styles.link}>
            Log In
          </Link>
        </nav>
      </div>
    </div>,
    document.body
  );
}
