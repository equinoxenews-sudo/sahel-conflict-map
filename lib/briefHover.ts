// Article survolé dans le bandeau des derniers articles : le globe grossit le point de
// l'événement correspondant et marque son anneau. Simple valeur partagée avec
// abonnement, le bandeau et le globe étant éloignés dans l'arbre des composants.

let hovered: number | null = null;
const listeners = new Set<(id: number | null) => void>();

export function setHoveredBrief(id: number | null): void {
  if (hovered === id) return;
  hovered = id;
  for (const listener of listeners) listener(id);
}

export function getHoveredBrief(): number | null {
  return hovered;
}

export function onHoveredBrief(listener: (id: number | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
