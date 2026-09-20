"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHasMounted } from "@/lib/useHasMounted";
import styles from "./MobileSheet.module.css";

interface MobileSheetProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
}

export default function MobileSheet({ title, onBack, children }: MobileSheetProps) {
  // Portalled straight to <body> — GlobeWithLayers renders this from inside
  // HomeBody's `.globeSection`, which is `position: fixed` (see
  // GlobeWithLayers.module.css) and therefore its own stacking context: no
  // z-index set here would ever be able to out-rank the header/bottom nav,
  // since it'd only be compared against siblings *inside* that context.
  const mounted = useHasMounted();
  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.topbar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Retour
        </button>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.spacer} aria-hidden />
      </div>
      <div className={styles.content}>{children}</div>
    </div>,
    document.body
  );
}
