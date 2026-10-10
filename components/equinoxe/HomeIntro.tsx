"use client";

import { useEffect, useSyncExternalStore } from "react";
import { INTRO_ATTR, INTRO_BOOT_SCRIPT, INTRO_EVENTS, INTRO_STORAGE_KEY } from "@/lib/homeIntro";
import styles from "./HomeIntro.module.css";

type IntroPhase = "loading" | "playing" | "done" | null;

// L'état de l'introduction vit dans l'attribut data-home-intro de <html> : le script de
// démarrage le pose avant l'affichage, et les règles de app/globals.css masquent
// l'interface tant qu'il n'est pas « done ». Ce composant le lit et le fait avancer.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [INTRO_ATTR] });
  return () => observer.disconnect();
}
const readPhase = (): IntroPhase => document.documentElement.getAttribute(INTRO_ATTR) as IntroPhase;
const readPhaseOnServer = (): IntroPhase => null;

/** Plafond d'attente du globe : au-delà, on révèle l'accueil sans animation. */
const READY_TIMEOUT_MS = 15_000;

// Nombre d'instances montées : en développement, React monte, démonte puis remonte aussitôt
// le composant ; l'attribut ne doit disparaître que si personne ne le reprend.
let mounted = 0;

export default function HomeIntro() {
  const phase = useSyncExternalStore(subscribe, readPhase, readPhaseOnServer);

  useEffect(() => {
    const root = document.documentElement;
    mounted += 1;
    const release = () => {
      mounted -= 1;
      window.setTimeout(() => {
        // L'attribut ne doit jamais survivre à la page d'accueil (sinon il masquerait les autres pages).
        if (mounted === 0) root.removeAttribute(INTRO_ATTR);
      }, 0);
    };
    if (root.getAttribute(INTRO_ATTR) !== "loading") return release;
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // Stockage indisponible : l'introduction se rejouera au prochain chargement, sans gravité.
    }

    const finish = () => root.setAttribute(INTRO_ATTR, "done");
    const start = () => {
      if (root.getAttribute(INTRO_ATTR) !== "loading") return;
      root.setAttribute(INTRO_ATTR, "playing");
      window.dispatchEvent(new Event(INTRO_EVENTS.fly));
    };
    window.addEventListener(INTRO_EVENTS.ready, start);
    window.addEventListener(INTRO_EVENTS.flightDone, finish);
    // Le globe n'a jamais annoncé qu'il était prêt (réseau, WebGL) : on rend l'accueil tel quel.
    const giveUp = window.setTimeout(finish, READY_TIMEOUT_MS);

    return () => {
      window.removeEventListener(INTRO_EVENTS.ready, start);
      window.removeEventListener(INTRO_EVENTS.flightDone, finish);
      window.clearTimeout(giveUp);
      release();
    };
  }, []);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      <div className={styles.overlay} data-phase={phase ?? "off"} aria-hidden={phase !== "playing" && phase !== "loading"}>
        <div className={styles.copy}>
          <h1 className={styles.title}>
            <span className={styles.line}>Comprendre le monde.</span>
            <span className={`${styles.line} ${styles.lineSecond}`}>Anticiper ses évolutions.</span>
          </h1>
          <p className={styles.subtitle}>Information · Géopolitique · Analyse · OSINT</p>
        </div>
        <button
          type="button"
          className={styles.skip}
          onClick={() => window.dispatchEvent(new Event(INTRO_EVENTS.skip))}
        >
          Passer l&apos;introduction
        </button>
      </div>
    </>
  );
}
