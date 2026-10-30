import type { InvestigationStorage } from "./storage";

/** Mention ajoutée au nom d'une copie ; on peut ensuite la renommer. */
export const COPY_SUFFIX = " (copie)";

/**
 * « Faire une copie » : un nouveau dossier indépendant (nouveaux identifiants, images et documents-preuves compris), qui
 * s'appelle « Nom (copie) ». Ce qu'on y fait n'a aucun effet sur le dossier d'origine. Renvoie l'identifiant de la copie.
 */
export async function duplicateDossier(storage: InvestigationStorage, dossierId: string): Promise<string> {
  const json = await storage.exportDossier(dossierId, { includeFiles: true });
  return storage.importDossier(json, { nameSuffix: COPY_SUFFIX });
}
