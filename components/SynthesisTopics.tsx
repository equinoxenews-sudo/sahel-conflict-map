"use client";

import { useEffect, useRef, useState } from "react";
import HexFlag from "@/components/investigation/HexFlag";
import type { FlagMention } from "@/lib/flagMentions";
import styles from "./SynthesisTopics.module.css";

export interface SynthesisTopic {
  text: string;
  flags: FlagMention[];
}

/** Vitesse de défilement, en pixels par seconde (celle du bandeau LATEST). */
const SPEED_PX_PER_S = 55;

// Sujets du jour d'une synthèse de zone, sur une seule ligne : une puce dorée, les drapeaux des pays cités, puis le titre,
// et la puce suivante sépare les sujets. Si la ligne est plus large que le panneau, elle défile comme le bandeau LATEST
// (elle s'arrête au survol) ; sinon elle reste fixe.
export default function SynthesisTopics({ topics }: { topics: SynthesisTopic[] }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const firstSet = useRef<HTMLUListElement>(null);
  const [scrolls, setScrolls] = useState(false);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    const node = wrapper.current;
    if (!node) return;
    // L'observateur se déclenche dès qu'il est branché, puis à chaque changement de largeur du panneau.
    const observer = new ResizeObserver(() => {
      const setWidth = firstSet.current?.offsetWidth ?? 0;
      setScrolls(setWidth > node.clientWidth);
      setDuration(Math.max(20, Math.round(setWidth / SPEED_PX_PER_S)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [topics]);

  const renderSet = (hidden: boolean) => (
    <ul className={styles.set} ref={hidden ? undefined : firstSet} aria-hidden={hidden || undefined}>
      {topics.map((topic) => (
        <li key={topic.text} className={styles.topic}>
          {topic.flags.map((flag) => (
            <span key={flag.iso2} className={styles.flag}>
              <HexFlag iso2={flag.iso2} name={flag.name} />
            </span>
          ))}
          {topic.text}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={wrapper} className={styles.wrapper}>
      <div className={scrolls ? `${styles.track} ${styles.scrolling}` : styles.track} style={{ animationDuration: `${duration}s` }}>
        {renderSet(false)}
        {scrolls ? renderSet(true) : null}
      </div>
    </div>
  );
}
