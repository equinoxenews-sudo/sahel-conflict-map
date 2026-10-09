"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ZONE_LABELS, ZONE_ORDER, type ZoneSlug } from "@/lib/cinematic/zoneMap";
import CinematicNav from "./CinematicNav";
import EarthScene from "./EarthScene";
import ZonePanel from "./ZonePanel";
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
  const [zone, setZone] = useState<ZoneSlug | null>(null);
  const [hovered, setHovered] = useState<ZoneSlug | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [utcLabel, setUtcLabel] = useState("");

  // Heure UTC affichée : celle que le globe utilise pour le jour/nuit (?utc=… permet d'en imposer une).
  useEffect(() => {
    const forced = Date.parse(new URLSearchParams(window.location.search).get("utc") ?? "");
    const offset = Number.isNaN(forced) ? 0 : forced - Date.now();
    const update = () => {
      const d = new Date(Date.now() + offset);
      const pad = (n: number) => String(n).padStart(2, "0");
      setUtcLabel(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`);
    };
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 20_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

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

  // Échap : revient au globe entier, ou passe l'introduction si aucune zone n'est choisie.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (zone) setZone(null);
      else setSkipped(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zone]);

  // Choisir une zone (bandeau, pastille ou clic sur le globe) : le globe se centre dessus.
  const focusZone = useCallback((next: ZoneSlug) => {
    setZone(next);
    setExploring(true);
    setSkipped(true);
  }, []);

  const onHover = useCallback((next: ZoneSlug | null, x: number, y: number) => {
    setHovered(next);
    const tooltip = tooltipRef.current;
    if (tooltip) tooltip.style.transform = `translate(${x + 16}px, ${y + 16}px)`;
  }, []);

  const instant = skipped || reducedMotion || status === "static";
  const showSkip = status === "ready" && !instant && !introOver && !zone;
  const stage = status === "loading" ? "loading" : instant ? "instant" : "playing";
  const interactive = status === "ready" && (instant || introOver);

  return (
    <div className={styles.stage} data-stage={stage} data-exploring={exploring} data-focused={zone !== null}>
      <div className={styles.poster} aria-hidden="true" data-ready={status === "ready"} />
      <div className={styles.canvasLayer} data-ready={status === "ready"}>
        <EarthScene
          skip={skipped}
          explore={exploring}
          reducedMotion={reducedMotion}
          focusZone={zone}
          interactive={interactive}
          onReady={() => setStatus("ready")}
          onFail={() => setStatus("static")}
          onHover={onHover}
          onPick={focusZone}
        />
      </div>
      <div className={styles.vignette} aria-hidden="true" />

      <CinematicNav activeZone={zone} onFocusZone={focusZone} />

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

        <nav className={styles.choices} aria-label="Choisir une zone" aria-hidden={!exploring || zone !== null}>
          <p className={styles.choicesHint}>Choisissez une zone</p>
          <ul className={styles.choiceList}>
            {ZONE_ORDER.map((slug) => (
              <li key={slug}>
                <button
                  type="button"
                  className={styles.choice}
                  tabIndex={exploring && !zone ? 0 : -1}
                  onClick={() => focusZone(slug)}
                >
                  {ZONE_LABELS[slug]}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      {zone ? <ZonePanel zone={zone} onClose={() => setZone(null)} /> : null}

      <div ref={tooltipRef} className={styles.tooltip} data-visible={hovered !== null} aria-hidden="true">
        {hovered ? ZONE_LABELS[hovered] : ""}
      </div>

      {showSkip ? (
        <button type="button" className={styles.skip} onClick={() => setSkipped(true)}>
          Passer l&apos;introduction
        </button>
      ) : null}

      {interactive && utcLabel ? (
        <p className={styles.clock}>
          <span className={styles.clockTime}>UTC {utcLabel}</span>
          <span className={styles.clockHint}>Jour et nuit en temps réel · glisser pour tourner</span>
        </p>
      ) : null}

      <p className={styles.tag}>Prototype expérimental — non public</p>
    </div>
  );
}
