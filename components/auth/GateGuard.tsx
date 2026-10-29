"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHECK_EVERY_MS = 5 * 60 * 1000;

// Porte d'entrée (voir proxy.ts) : un onglet resté ouvert alors que la connexion a disparu (déconnexion dans un
// autre onglet, cookie de sept jours expiré, mot de passe changé) revient sur la page d'accès, au retour sur
// l'onglet et toutes les cinq minutes, au lieu de rester affiché avec des données qui ne se chargent plus.
export default function GateGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/acces") return;
    let stopped = false;

    async function check() {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        if (response.status !== 401 || stopped) return;
        const back = window.location.pathname + window.location.search;
        window.location.assign(back === "/" ? "/acces" : `/acces?retour=${encodeURIComponent(back)}`);
      } catch {
        // Réseau coupé : on ne bouge pas, le prochain contrôle réessaiera.
      }
    }

    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [pathname]);

  return null;
}
