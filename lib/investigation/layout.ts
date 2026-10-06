// Première case libre d'une grille assez large pour les cartes du graphe : une
// nouvelle fiche ne se pose jamais sur une fiche existante.
export function freePosition(existing: { x: number; y: number }[]): { x: number; y: number } {
  for (let index = 0; index < 400; index++) {
    const candidate = { x: 60 + (index % 3) * 400, y: 60 + Math.floor(index / 3) * 170 };
    const taken = existing.some((p) => Math.abs(p.x - candidate.x) < 330 && Math.abs(p.y - candidate.y) < 130);
    if (!taken) return candidate;
  }
  return { x: 60, y: 60 };
}
