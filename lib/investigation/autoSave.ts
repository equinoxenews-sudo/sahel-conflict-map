// Décisions de la sauvegarde en ligne automatique des dossiers. Pas d'accès réseau ici : des fonctions
// pures (testables) que le composant CloudAutoSave appelle. Règle d'or : on n'écrase JAMAIS une copie en
// ligne plus récente que celle dont cet appareil est parti, ni une copie pleine par un dossier vide.
import type { InvestigationData } from "./types";

/** Ce que cet appareil sait de la dernière synchronisation d'un dossier. */
export interface SyncBase {
  /** Empreinte du contenu au moment de la synchronisation. */
  signature: string;
  /** Date d'envoi (côté serveur) de la copie en ligne à ce moment-là. */
  remoteUploadedAt: string;
}

export type SyncBases = Record<string, SyncBase>;

export interface RemoteInfo {
  uploadedAt: string;
  entityCount: number;
  noteCount: number;
}

export type AutoSaveDecision =
  /** Rien de neuf à envoyer. */
  | "skip"
  /** Envoyer la version de cet appareil. */
  | "push"
  /** Une version en ligne plus récente existe : demander avant de toucher à quoi que ce soit. */
  | "conflict"
  /** Le dossier est vide ici alors qu'il est plein en ligne : ne rien envoyer. */
  | "protect";

export const SYNC_BASES_KEY = "equinoxe-investigation-sync-v1";

function hash(text: string): string {
  // FNV-1a 32 bits : une empreinte de détection de changement, pas de la cryptographie.
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return `${text.length.toString(36)}-${value.toString(36)}`;
}

/** Empreinte du contenu d'un dossier (hors images, dont les identifiants sont dans les notes). */
export function dossierSignature(data: InvestigationData, dossierId: string): string {
  const own = <T extends { dossierId: string }>(items: T[]) => items.filter((item) => item.dossierId === dossierId);
  return hash(
    JSON.stringify([
      data.dossiers.find((dossier) => dossier.id === dossierId) ?? null,
      own(data.sources),
      own(data.entities),
      own(data.relations),
      own(data.notes),
      own(data.canvasCards),
      own(data.canvasLinks),
      own(data.shapes),
    ])
  );
}

/** Nombre d'éléments de travail d'un dossier (sert à repérer un dossier vide). */
export function dossierContentCount(data: InvestigationData, dossierId: string): number {
  const count = (items: { dossierId: string }[]) => items.filter((item) => item.dossierId === dossierId).length;
  return count(data.entities) + count(data.notes) + count(data.sources) + count(data.shapes);
}

export function decideAutoSave(input: {
  signature: string;
  contentCount: number;
  base: SyncBase | undefined;
  remote: RemoteInfo | undefined;
}): AutoSaveDecision {
  const { signature, contentCount, base, remote } = input;
  const remoteHasContent = remote ? remote.entityCount + remote.noteCount > 0 : false;
  if (contentCount === 0 && remoteHasContent) return "protect";
  if (!remote) return "push";
  const remoteMoved = base?.remoteUploadedAt !== remote.uploadedAt;
  if (remoteMoved) {
    // Une copie en ligne que cet appareil n'a jamais vue (autre appareil, autre navigateur) : jamais écrasée sans accord.
    return "conflict";
  }
  return base && base.signature === signature ? "skip" : "push";
}

export function readSyncBases(): SyncBases {
  try {
    const raw = window.localStorage.getItem(SYNC_BASES_KEY);
    const parsed = raw ? (JSON.parse(raw) as { bases?: SyncBases }) : null;
    return parsed?.bases ?? {};
  } catch {
    return {};
  }
}

export function readIgnoredRemote(): string[] {
  try {
    const raw = window.localStorage.getItem(SYNC_BASES_KEY);
    const parsed = raw ? (JSON.parse(raw) as { ignored?: string[] }) : null;
    return parsed?.ignored ?? [];
  } catch {
    return [];
  }
}

function writeState(bases: SyncBases, ignored: string[]): void {
  try {
    window.localStorage.setItem(SYNC_BASES_KEY, JSON.stringify({ bases, ignored }));
  } catch {
    // stockage indisponible : la prochaine vérification redemandera, sans rien écraser
  }
}

export function saveSyncBase(dossierId: string, base: SyncBase): void {
  writeState({ ...readSyncBases(), [dossierId]: base }, readIgnoredRemote());
}

export function ignoreRemoteDossier(dossierId: string): void {
  const ignored = readIgnoredRemote();
  if (!ignored.includes(dossierId)) writeState(readSyncBases(), [...ignored, dossierId]);
}
