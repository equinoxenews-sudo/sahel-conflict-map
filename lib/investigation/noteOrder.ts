import type { Note } from "./types";

// Ordre de la liste des fiches et des notes : celui que l'utilisateur a choisi avec les flèches
// (monter / descendre), sinon l'ordre alphabétique. Une fiche ou une note nouvelle, sans place
// choisie, se range après les autres, par ordre alphabétique.

/** Notes triées : d'abord celles qui ont une place choisie, puis les autres par titre. */
export function sortNotes<T extends Pick<Note, "title" | "sortOrder">>(notes: T[]): T[] {
  return [...notes].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.POSITIVE_INFINITY;
    const orderB = b.sortOrder ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA < orderB ? -1 : 1;
    return a.title.localeCompare(b.title, "fr");
  });
}

/**
 * Nouvelle place de chaque note d'une liste après avoir monté (`-1`) ou descendu (`1`) l'une d'elles.
 * Toute la liste reçoit une place (10, 20, 30…) : l'ordre affiché est alors figé tel que vu à l'écran.
 * Renvoie un objet vide si la note ne peut pas bouger (déjà en haut ou en bas, ou inconnue).
 */
export function moveNote(ordered: Pick<Note, "id">[], id: string, direction: -1 | 1): Record<string, number> {
  const from = ordered.findIndex((note) => note.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ordered.length) return {};
  const ids = ordered.map((note) => note.id);
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return Object.fromEntries(ids.map((noteId, index) => [noteId, (index + 1) * 10]));
}
