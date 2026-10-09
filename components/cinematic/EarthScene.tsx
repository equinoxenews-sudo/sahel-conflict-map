"use client";

import { useEffect, useRef } from "react";
import { createEarthScene, type SceneControl, type SceneHandlers } from "@/lib/cinematic/earthScene";
import styles from "./EarthScene.module.css";

interface EarthSceneProps extends SceneControl, SceneHandlers {}

// Monte la scène 3D dans un conteneur. `three` n'est téléchargé qu'ici, après l'affichage de la page.
export default function EarthScene({
  skip,
  explore,
  reducedMotion,
  focusZone,
  interactive,
  onReady,
  onFail,
  onHover,
  onPick,
}: EarthSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const control = useRef<SceneControl>({ skip, explore, reducedMotion, focusZone, interactive });
  const handlers = useRef<SceneHandlers>({ onReady, onFail, onHover, onPick });

  useEffect(() => {
    control.current = { skip, explore, reducedMotion, focusZone, interactive };
    handlers.current = { onReady, onFail, onHover, onPick };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let dispose = () => {};
    import("three")
      .then((THREE) => {
        if (disposed) return;
        dispose = createEarthScene(THREE, host, () => control.current, {
          onReady: () => handlers.current.onReady(),
          onFail: () => handlers.current.onFail(),
          onHover: (zone, x, y) => handlers.current.onHover(zone, x, y),
          onPick: (zone) => handlers.current.onPick(zone),
        });
      })
      .catch(() => handlers.current.onFail());
    return () => {
      disposed = true;
      dispose();
    };
  }, []);

  return <div ref={hostRef} className={styles.host} aria-hidden="true" />;
}
