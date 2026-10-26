import { timingSafeEqual } from "node:crypto";

// Accès aux routes réservées aux traitements planifiés (Vercel Cron, GitHub Actions) : l'en-tête
// « Authorization: Bearer <CRON_SECRET> ». Si le secret n'est PAS défini, tout est refusé : l'ancienne
// comparaison avec « Bearer undefined » aurait laissé passer n'importe qui connaissant ce texte.

/** Vrai si l'en-tête porte exactement le secret attendu ; faux si le secret est absent ou vide. */
export function isAuthorizedCron(authorization: string | null, secret: string | undefined = process.env.CRON_SECRET): boolean {
  const expected = secret?.trim();
  if (!expected || !authorization) return false;
  const received = Buffer.from(authorization);
  const wanted = Buffer.from(`Bearer ${expected}`);
  // Comparaison à temps constant : la durée de la réponse ne renseigne pas sur le début du secret.
  return received.length === wanted.length && timingSafeEqual(received, wanted);
}
