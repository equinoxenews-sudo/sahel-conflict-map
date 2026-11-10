// Supervision V1, Lot 7 : notes enregistrées. Module PUR et testé : validation des saisies, forme d'une note, messages d'échec.
// Aucune IA, aucun accès réseau ni base ici (voir notesStore.ts pour la base).

export const NOTE_MAX = 4000;
export const NOTES_MAX = 500;
export const EVENT_TITLE_MAX = 300;

/** Référence d'une publication du tableau : « a-123 » (article), « e-456 » (signalement), « p-<uuid> » (publication collectée). */
export const EVENT_REF = /^[a-z]-[A-Za-z0-9-]{1,80}$/;

export interface Note {
  id: string;
  /** Publication à laquelle la note est attachée ; null = note générale de la Supervision. */
  eventRef: string | null;
  /** Titre de la publication au moment de la note. */
  eventTitle: string | null;
  body: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewNote {
  body: string;
  eventRef: string | null;
  eventTitle: string | null;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Texte d'une note : fins de ligne normalisées, caractères de contrôle retirés (sauf retour à la ligne et tabulation), espaces de bord retirés. */
export function cleanBody(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function bodyErrors(body: string): string[] {
  if (body.length === 0) return ["La note est vide."];
  if (body.length > NOTE_MAX) return [`La note est trop longue (${body.length} caractères, ${NOTE_MAX} au maximum).`];
  return [];
}

export function validateNewNote(payload: unknown): Validation<NewNote> {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const body = cleanBody(record.body);
  const errors = bodyErrors(body);
  let eventRef: string | null = null;
  if (record.eventRef !== undefined && record.eventRef !== null) {
    if (typeof record.eventRef === "string" && EVENT_REF.test(record.eventRef)) eventRef = record.eventRef;
    else errors.push("La référence de la publication est invalide.");
  }
  // Le titre n'est qu'un repère d'affichage : espaces réduits et coupé, jamais un motif de refus. Sans référence, il n'a pas de sens.
  const rawTitle = typeof record.eventTitle === "string" ? record.eventTitle.replace(/\s+/g, " ").trim().slice(0, EVENT_TITLE_MAX) : "";
  const eventTitle = eventRef && rawTitle.length > 0 ? rawTitle : null;
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { body, eventRef, eventTitle } };
}

export function validateNoteUpdate(payload: unknown): Validation<{ body: string; revision: number }> {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const body = cleanBody(record.body);
  const errors = bodyErrors(body);
  const revision = record.revision;
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) errors.push("La révision de la note est invalide.");
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: { body, revision: revision as number } };
}

/** Note telle que renvoyée par les fonctions SQL (noms de colonnes en snake_case) ou lue dans la table. */
export function toNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    eventRef: typeof row.event_ref === "string" ? row.event_ref : null,
    eventTitle: typeof row.event_title === "string" ? row.event_title : null,
    body: String(row.body ?? ""),
    revision: Number(row.revision ?? 1),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function noteMessage(code: string | undefined, detail: Record<string, unknown> = {}): string {
  switch (code) {
    case "limit_reached":
      return `Cette Supervision a atteint ${typeof detail.limit === "number" ? detail.limit : NOTES_MAX} notes : supprime-en une avant d'en ajouter.`;
    case "read_only":
      return "Cette Supervision est en lecture seule : les notes ne sont plus modifiables.";
    case "revision_conflict":
      return "Cette note a été modifiée ailleurs entre-temps. Recharge-la pour voir la dernière version : rien n'a été écrasé.";
    case "idempotency_conflict":
      return "Cette saisie a déjà servi pour une autre note : recommence.";
    case "not_found":
      return "Cette note ou cette Supervision est introuvable.";
    case "invalid_input":
      return "La note n'est pas valide.";
    case "locked":
      return "Connexion requise.";
    case "forbidden":
      return "Cette rubrique n'est pas ouverte à ton offre.";
    default:
      return "L'opération a échoué. Réessaie dans un instant.";
  }
}
