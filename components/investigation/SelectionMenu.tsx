"use client";

import { useEffect } from "react";
import styles from "./SelectionMenu.module.css";

export interface SelectionMenuItem {
  label: string;
  onClick: () => void;
  /** Ligne de séparation avant cette entrée. */
  separated?: boolean;
}

interface SelectionMenuProps {
  x: number;
  y: number;
  items: SelectionMenuItem[];
  onClose: () => void;
}

// Menu du clic droit sur un passage sélectionné dans une note (renvoyer vers une fiche, citer une
// source, copier, couper). Il se ferme d'un clic ailleurs, avec Échap, ou en faisant défiler la page.
export default function SelectionMenu({ x, y, items, onClose }: SelectionMenuProps) {
  useEffect(() => {
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("pointerdown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Le menu reste dans la fenêtre.
  const left = Math.min(x, (typeof window === "undefined" ? x : window.innerWidth) - 270);
  const top = Math.min(y, (typeof window === "undefined" ? y : window.innerHeight) - items.length * 38 - 16);

  return (
    <div className={styles.menu} style={{ left: Math.max(8, left), top: Math.max(8, top) }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
      {items.map((item) => (
        <div key={item.label}>
          {item.separated ? <div className={styles.separator} role="separator" /> : null}
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              onClose();
              item.onClick();
            }}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
