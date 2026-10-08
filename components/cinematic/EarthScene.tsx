"use client";

import { useEffect, useRef } from "react";
import { createEarthScene, type SceneControl } from "@/lib/cinematic/earthScene";
import styles from "./EarthScene.module.css";

interface EarthSceneProps extends SceneControl {
  onReady: () => void;
  onFail: () => void;
}

// Monte la scène 3D dans un conteneur. `three` n'est téléchargé qu'ici, après l'affichage de la page.
export default function EarthScene({ skip, explore, reducedMotion, onReady, onFail }: EarthSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const control = useRef<SceneControl>({ skip, explore, reducedMotion });
  const handlers = useRef({ onReady, onFail });

  useEffect(() => {
    control.current = { skip, explore, reducedMotion };
    handlers.current = { onReady, onFail };
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
