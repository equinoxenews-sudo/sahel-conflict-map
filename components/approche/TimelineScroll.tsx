"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./Approche.module.css";

// Cadre d'une chronologie horizontale : les jalons défilent à la souris, au doigt et au clavier (chaque jalon est un bouton, le
// navigateur fait défiler jusqu'au jalon qui prend le focus) ; deux boutons apparaissent seulement quand des jalons dépassent.
// La barre de défilement native, très visible dans un petit panneau, est masquée.
export default function TimelineScroll({ children }: { children: ReactNode }) {
  const list = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ prev: false, next: false });

  const update = useCallback(() => {
    const element = list.current;
    if (!element) return;
    setEdge({ prev: element.scrollLeft > 2, next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  function scrollBy(direction: -1 | 1) {
    const element = list.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className={styles.tlWrap}>
      {edge.prev ? (
        <button type="button" className={`${styles.tlNav} ${styles.tlNavPrev}`} onClick={() => scrollBy(-1)} aria-label="Jalons précédents">
          ‹
        </button>
      ) : null}
      <ol ref={list} className={styles.tl}>
        {children}
      </ol>
      {edge.next ? (
        <button type="button" className={`${styles.tlNav} ${styles.tlNavNext}`} onClick={() => scrollBy(1)} aria-label="Jalons suivants">
          ›
        </button>
      ) : null}
    </div>
  );
}
