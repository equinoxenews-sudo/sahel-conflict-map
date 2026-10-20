// Quelles versions en ligne d'un dossier conserver. Une sauvegarde automatique crée une version à chaque
// série de modifications : sans tri, les 2 dernières ne remontent qu'à quelques minutes et ne protègent de rien.
export interface VersionRow {
  upload_id: string;
  created_at: string;
}

export const KEEP_RECENT = 4;
export const KEEP_DAYS = 14;
export const KEEP_MAX = 12;

/** Identifiants à conserver : la version courante, les plus récentes, et la dernière de chaque jour récent. */
export function selectVersionsToKeep(versions: VersionRow[], currentId: string, now: Date = new Date()): Set<string> {
  const keep = new Set<string>([currentId]);
  const others = versions.filter((row) => row.upload_id !== currentId).sort((a, b) => b.created_at.localeCompare(a.created_at));

  for (const row of others.slice(0, KEEP_RECENT)) keep.add(row.upload_id);

  const oldest = now.getTime() - KEEP_DAYS * 24 * 3600 * 1000;
  const seenDays = new Set<string>();
  for (const row of others) {
    if (new Date(row.created_at).getTime() < oldest) continue;
    const day = row.created_at.slice(0, 10);
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    keep.add(row.upload_id);
  }

  // Plafond : on retire les plus anciennes (la courante reste toujours).
  if (keep.size > KEEP_MAX) {
    const ranked = others.filter((row) => keep.has(row.upload_id));
    for (const row of ranked.slice(KEEP_MAX - 1)) keep.delete(row.upload_id);
  }
  return keep;
}
