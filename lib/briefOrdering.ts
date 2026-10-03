import type { ZoneBrief } from "@/types/brief";

const HOUR_MS = 3600_000;

// Une importance élevée remonte une synthèse comme si elle était plus
// récente de 36 h ; une faible la fait redescendre de 12 h. La fraîcheur
// reste dominante : une vieille synthèse n'écrase jamais l'actualité du jour.
const IMPORTANCE_BONUS_MS: Record<string, number> = {
  high: 36 * HOUR_MS,
  medium: 0,
  low: -12 * HOUR_MS,
};

function adjustedTime(brief: Pick<ZoneBrief, "published_at" | "importance">): number {
  const published = brief.published_at ? new Date(brief.published_at).getTime() : 0;
  return published + (IMPORTANCE_BONUS_MS[brief.importance ?? "medium"] ?? 0);
}

/**
 * Ordre du flux de l'accueil : les synthèses sont créées zone par zone, un
 * tri purement chronologique les regroupe donc par zone. On classe d'abord
 * par fraîcheur pondérée de l'importance, puis on alterne les zones (la
 * meilleure de chacune, puis la deuxième meilleure…) pour mélanger le flux.
 */
export function mixBriefsAcrossZones<T extends Pick<ZoneBrief, "zone_slug" | "published_at" | "importance">>(
  briefs: T[]
): T[] {
  const queues = new Map<string, T[]>();
  for (const brief of [...briefs].sort((a, b) => adjustedTime(b) - adjustedTime(a))) {
    const queue = queues.get(brief.zone_slug) ?? [];
    queue.push(brief);
    queues.set(brief.zone_slug, queue);
  }

  const mixed: T[] = [];
  while (mixed.length < briefs.length) {
    const round = [...queues.values()]
      .filter((queue) => queue.length > 0)
      .sort((a, b) => adjustedTime(b[0]) - adjustedTime(a[0]));
    for (const queue of round) mixed.push(queue.shift() as T);
  }
  return mixed;
}
