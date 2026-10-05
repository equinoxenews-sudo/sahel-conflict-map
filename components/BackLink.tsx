"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface BackLinkProps {
  /** Destination si l'on arrive directement sur la page (lien partagé, nouvel onglet). */
  fallbackHref: string;
  className?: string;
  children: React.ReactNode;
}

interface NavigationApi {
  currentEntry?: { index: number } | null;
  entries?: () => { url?: string | null }[];
}

// Vrai si la page précédente de l'historique est une page de ce site : on
// revient alors exactement là d'où l'on vient (accueil, Analyse, Actualité…),
// avec le défilement d'origine. Sinon on suit le lien de repli.
function cameFromThisSite(): boolean {
  const navigation = (window as unknown as { navigation?: NavigationApi }).navigation;
  if (navigation?.currentEntry && navigation.entries) {
    const previous = navigation.entries()[navigation.currentEntry.index - 1];
    if (!previous?.url) return false;
    try {
      return new URL(previous.url).origin === window.location.origin;
    } catch {
      return false;
    }
  }
  // Navigateurs sans l'API Navigation : on se fie à l'historique et au referrer.
  return window.history.length > 1 && (document.referrer === "" || document.referrer.startsWith(window.location.origin));
}

export default function BackLink({ fallbackHref, className, children }: BackLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={fallbackHref}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        if (!cameFromThisSite()) return;
        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
