"use client";

import { useEffect, useState } from "react";

// Outil de diagnostic du prototype (activé par « ?debug=scroll » dans l'adresse) : note tout ce qui déplace la page SANS geste de
// l'utilisateur (appel à scrollTo/scrollIntoView/focus, saut de défilement, changement brutal de hauteur de page), avec sa provenance.
// Aucun effet quand il n'est pas activé.

const MAX_ENTRIES = 14;

function caller(): string {
  return (new Error().stack ?? "")
    .split("\n")
    .slice(3, 7)
    .map((line) => line.trim().replace(/\(?https?:\/\/[^/]+/, "(").replace(/\?.*?(:\d+:\d+)/, "$1"))
    .join(" | ");
}

export default function ScrollWatch() {
  const [entries, setEntries] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    const stamp = () => `${((performance.now() - t0) / 1000).toFixed(1)} s`;
    const push = (text: string) => setEntries((previous) => [`${stamp()}  ${text}`, ...previous].slice(0, MAX_ENTRIES));
    let lastInput = 0;
    const onInput = () => {
      lastInput = performance.now();
    };
    const inputs = ["wheel", "keydown", "pointerdown", "touchstart", "mousedown"] as const;
    for (const type of inputs) window.addEventListener(type, onInput, { passive: true, capture: true });

    // Appels programmatiques qui déplacent la page.
    const restore: (() => void)[] = [];
    const wrap = <T extends object>(target: T, name: string, label: (args: unknown[], self: unknown) => string) => {
      const original = (target as Record<string, unknown>)[name] as (...args: unknown[]) => unknown;
      if (typeof original !== "function") return;
      (target as Record<string, unknown>)[name] = function patched(this: unknown, ...args: unknown[]) {
        push(`${label(args, this)}  ← ${caller()}`);
        return original.apply(this, args);
      };
      restore.push(() => {
        (target as Record<string, unknown>)[name] = original;
      });
    };
    const describe = (self: unknown) => {
      const el = self as Element | undefined;
      return el && "tagName" in el ? `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}` : "?";
    };
    wrap(window, "scrollTo", (args) => `window.scrollTo(${JSON.stringify(args).slice(0, 40)})`);
    wrap(window, "scroll", (args) => `window.scroll(${JSON.stringify(args).slice(0, 40)})`);
    wrap(window, "scrollBy", (args) => `window.scrollBy(${JSON.stringify(args).slice(0, 40)})`);
    wrap(Element.prototype, "scrollIntoView", (_args, self) => `scrollIntoView sur ${describe(self)}`);
    wrap(Element.prototype, "scrollTo", (args, self) => `${describe(self)}.scrollTo(${JSON.stringify(args).slice(0, 30)})`);
    wrap(Element.prototype, "scrollBy", (args, self) => `${describe(self)}.scrollBy(${JSON.stringify(args).slice(0, 30)})`);
    wrap(HTMLElement.prototype, "focus", (_args, self) => `focus() sur ${describe(self)} (y=${Math.round((self as HTMLElement).getBoundingClientRect().top)})`);

    // Sauts de défilement sans geste récent.
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (performance.now() - lastInput > 250 && Math.abs(delta) >= 60) push(`DÉFILEMENT SANS GESTE : ${delta > 0 ? "↓" : "↑"} ${Math.round(Math.abs(delta))} px (maintenant à ${Math.round(y)})`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Changements brutaux de hauteur de page.
    let lastHeight = document.documentElement.scrollHeight;
    const observer = new ResizeObserver(() => {
      const height = document.documentElement.scrollHeight;
      if (Math.abs(height - lastHeight) >= 100) push(`hauteur de la page : ${lastHeight} → ${height} px`);
      lastHeight = height;
    });
    observer.observe(document.documentElement);

    return () => {
      for (const type of inputs) window.removeEventListener(type, onInput, { capture: true });
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      for (const undo of restore) undo();
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText([...entries].reverse().join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 2000, maxWidth: "min(560px, 92vw)", maxHeight: "40vh", overflow: "auto", background: "rgba(5,8,15,0.94)", color: "#e8ecf4", border: "1px solid #e0b44c", borderRadius: 10, padding: 10, font: "11px/1.35 ui-monospace, monospace" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <strong>Journal de défilement</strong>
        <button type="button" onClick={copy} style={{ cursor: "pointer" }}>{copied ? "Copié" : "Copier"}</button>
        <button type="button" onClick={() => setEntries([])} style={{ cursor: "pointer" }}>Effacer</button>
      </div>
      {entries.length === 0 ? <div>Rien pour l&apos;instant. Reproduis le problème.</div> : entries.map((entry, index) => <div key={index} style={{ borderTop: "1px solid #1c2b3f", padding: "3px 0", wordBreak: "break-word" }}>{entry}</div>)}
    </div>
  );
}
