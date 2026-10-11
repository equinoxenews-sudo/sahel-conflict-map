"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { INTRO_ATTR, INTRO_EVENTS, INTRO_STORAGE_KEY } from "@/lib/homeIntro";
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
/** L'écran de chargement reste au moins ce temps : un chargement très rapide ne doit pas clignoter. */
const MIN_LOADER_MS = 1400;
/** Après « Prêt », la barre reste pleine un instant avant l'ouverture. */
const READY_HOLD_MS = 450;

const STEPS = ["Initialisation du moteur 3D", "Chargement de la carte du monde", "Prêt"] as const;
/** Avancement visé de la barre pour chaque étape (elle s'en approche progressivement). */
const STEP_TARGET = [0.38, 0.82, 1] as const;

// Nombre d'instances montées : en développement, React monte, démonte puis remonte aussitôt
// le composant ; l'attribut ne doit disparaître que si personne ne le reprend.
let mounted = 0;

export default function HomeIntro() {
  const phase = useSyncExternalStore(subscribe, readPhase, readPhaseOnServer);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [progress, setProgress] = useState(0.06);
  const startedAt = useRef(0);

  // La barre avance en douceur vers l'objectif de l'étape en cours.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => value + (STEP_TARGET[step] - value) * 0.07);
    }, 100);
    return () => window.clearInterval(timer);
  }, [step]);

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
    startedAt.current = performance.now();

    const finish = () => root.setAttribute(INTRO_ATTR, "done");
    const open = () => {
      if (root.getAttribute(INTRO_ATTR) !== "loading") return;
      root.setAttribute(INTRO_ATTR, "playing");
      window.dispatchEvent(new Event(INTRO_EVENTS.fly));
    };
    let openTimer = 0;
    const onEngine = () => setStep((current) => (current < 1 ? 1 : current));
    const onReady = () => {
      setStep(2);
      const elapsed = performance.now() - startedAt.current;
      openTimer = window.setTimeout(open, Math.max(READY_HOLD_MS, MIN_LOADER_MS - elapsed));
    };
    window.addEventListener(INTRO_EVENTS.engine, onEngine);
    window.addEventListener(INTRO_EVENTS.ready, onReady);
    window.addEventListener(INTRO_EVENTS.flightDone, finish);
    // Le globe n'a jamais annoncé qu'il était prêt (réseau, WebGL) : on rend l'accueil tel quel.
    const giveUp = window.setTimeout(finish, READY_TIMEOUT_MS);

    return () => {
      window.removeEventListener(INTRO_EVENTS.engine, onEngine);
      window.removeEventListener(INTRO_EVENTS.ready, onReady);
      window.removeEventListener(INTRO_EVENTS.flightDone, finish);
      window.clearTimeout(giveUp);
      window.clearTimeout(openTimer);
      release();
    };
  }, []);

  return (
    <>
      {/* Écran de chargement : visible tant que le globe se prépare (attribut « loading »), puis
          s'efface en fondu pendant que la caméra part. Son affichage ne dépend que de l'attribut de
          <html> : il apparaît dès le premier instant, avant même le chargement du code de la page. */}
      <div className={styles.loader} role="status" aria-live="polite">
        <div className={styles.orbit} aria-hidden="true">
          <span className={`${styles.ring} ${styles.ringOuter}`} />
          <span className={`${styles.ring} ${styles.ringMiddle}`} />
          <span className={`${styles.ring} ${styles.ringInner}`} />
          <span className={styles.core} />
        </div>
        <Image
          src="/equinoxe/logo-equinoxe-wordmark.png"
          alt="Équinoxe News"
          width={2167}
          height={726}
          unoptimized
          priority
          className={styles.loaderLogo}
        />
        <p className={styles.loaderTag}>Information · Géopolitique · Analyse · OSINT</p>
        <div className={styles.barTrack} aria-hidden="true">
          <div className={styles.bar} style={{ transform: `scaleX(${progress})` }} />
        </div>
        <p className={styles.status}>
          {STEPS[step]}
          {step < 2 ? "…" : ""}
        </p>
      </div>

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
