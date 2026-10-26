"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import styles from "./DragScroll.module.css";

/** Au-delà de ce déplacement (pixels), le geste est un glissement et non un clic. */
const DRAG_THRESHOLD = 5;

// Rangée qui défile à l'horizontale : on la saisit à la souris et on la tire de gauche à droite (la barre en dessous
// fait la même chose). Au doigt, le défilement natif suffit. Un glissement n'ouvre pas la vignette sous le pointeur.
export default function DragScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef({ active: false, startX: 0, startScroll: 0, moved: false, pointerId: -1 });
  const [grabbing, setGrabbing] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !ref.current) return;
    gesture.current = { active: true, startX: event.clientX, startScroll: ref.current.scrollLeft, moved: false, pointerId: event.pointerId };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    const el = ref.current;
    if (!g.active || !el) return;
    const delta = event.clientX - g.startX;
    if (!g.moved && Math.abs(delta) > DRAG_THRESHOLD) {
      g.moved = true;
      // Le pointeur est « capturé » seulement une fois le glissement engagé : un simple clic garde sa cible.
      el.setPointerCapture(g.pointerId);
      setGrabbing(true);
    }
    if (g.moved) el.scrollLeft = g.startScroll - delta;
  }

  function endGesture() {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;
    setGrabbing(false);
    // « moved » reste vrai jusqu'au clic qui suit le relâchement, pour l'annuler.
    window.setTimeout(() => {
      gesture.current.moved = false;
    }, 0);
  }

  return (
    <div
      ref={ref}
      className={grabbing ? `${styles.row} ${styles.grabbing}` : styles.row}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onClickCapture={(event) => {
        if (gesture.current.moved) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}
