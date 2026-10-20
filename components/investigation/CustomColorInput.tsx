"use client";

import { useEffect, useRef, useState } from "react";

interface CustomColorInputProps {
  value: string | undefined;
  onCommit: (color: string) => void;
  label: string;
}

const FALLBACK = "#c89b3c";
const COMMIT_DELAY_MS = 350;

// Sélecteur de couleur libre. Le sélecteur du navigateur émet une rafale d'événements pendant qu'on
// déplace le curseur : on n'enregistre que la couleur où l'on s'arrête (ou celle d'un clic en dehors),
// au lieu de réécrire tout le dossier à chaque pixel.
export default function CustomColorInput({ value, onCommit, label }: CustomColorInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const pending = useRef<string | null>(null);
  const commitRef = useRef(onCommit);

  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  function flush() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    const color = pending.current;
    pending.current = null;
    if (color) commitRef.current(color);
    setDraft(null);
  }

  // Une couleur en attente n'est jamais perdue si le panneau se ferme.
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (pending.current) commitRef.current(pending.current);
    },
    []
  );

  return (
    <input
      type="color"
      value={draft ?? value ?? FALLBACK}
      onChange={(event) => {
        const color = event.target.value;
        setDraft(color);
        pending.current = color;
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(flush, COMMIT_DELAY_MS);
      }}
      onBlur={flush}
      aria-label={label}
    />
  );
}
