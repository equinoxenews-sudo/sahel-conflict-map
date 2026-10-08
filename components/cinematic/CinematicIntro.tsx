"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ZONES } from "@/lib/zones";
import CinematicNav from "./CinematicNav";
import EarthScene from "./EarthScene";
import styles from "./CinematicIntro.module.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Durée du travelling de caméra (lib/cinematic/earthScene.ts) : après, le bouton « Passer » disparaît. */
const INTRO_MS = 9500;
/** Au-delà, on abandonne l'attente de la 3D : l'alternative statique reste en place. */
const LOAD_TIMEOUT_MS = 15000;

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const readMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

type Status = "loading" | "ready" | "static";

export default function CinematicIntro() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, readMotion, () => false);
  const [status, setStatus] = useState<Status>("loading");
  const [skipped, setSkipped] = useState(false);
  const [introOver, setIntroOver] = useState(false);
  const [exploring, setExploring] = useState(false);

  // Sans 3D (WebGL absent, réseau lent) : l'image fixe et tout le texte restent affichés.
  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setStatus((s) => (s === "loading" ? "static" : s)), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || reducedMotion) return;
    const timer = window.setTimeout(() => setIntroOver(true), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [status, reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSkipped(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const instant = skipped || reducedMotion || status === "static";
  const showSkip = status === "ready" && !instant && !introOver;
  const stage = status === "loading" ? "loading" : instant ? "instant" : "playing";

  return (
    <div className={styles.stage} data-stage={stage} data-exploring={exploring}>
      <div className={styles.poster} aria-hidden="true" data-ready={status === "ready"} />
      <div className={styles.canvasLayer} data-ready={status === "ready"}>
        <EarthScene
          skip={skipped}
          explore={exploring}
          reducedMotion={reducedMotion}
          onReady={() => setStatus("ready")}
          onFail={() => setStatus("static")}
        />
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicNav />

      <main className={styles.content}>
        <div className={styles.copy}>
          <h1 className={styles.title}>
            <span className={styles.line}>Comprendre le monde.</span>
            <span className={`${styles.line} ${styles.lineSecond}`}>Anticiper ses évolutions.</span>
          </h1>
          <p className={styles.subtitle}>Information · Géopolitique · Analyse · OSINT</p>
          <button type="button" className={styles.cta} onClick={() => setExploring(true)}>
            Explorer le monde
          </button>
        </div>

        <nav className={styles.choices} aria-label="Choisir une zone" aria-hidden={!exploring}>
          <p className={styles.choicesHint}>Choisissez une zone</p>
          <ul className={styles.choiceList}>
            {ZONES.filter((zone) => zone.slug !== "tracking").map((zone) => (
              <li key={zone.slug}>
                <Link href={`/zones/${zone.slug}`} className={styles.choice} tabIndex={exploring ? 0 : -1}>
                  {zone.slug === "moyen-orient" ? "Moyen-Orient" : zone.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      {showSkip ? (
        <button type="button" className={styles.skip} onClick={() => setSkipped(true)}>
          Passer l&apos;introduction
        </button>
      ) : null}

      <p className={styles.tag}>Prototype expérimental — non public</p>
    </div>
  );
}
