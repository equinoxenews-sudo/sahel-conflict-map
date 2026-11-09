// Supervision V1, Lot 3 : dédoublonnage des événements. Module PUR, testé.
//
// Constat sur l'échantillon (Nigeria) : 762 signalements pour seulement 373 publications distinctes. Une même publication produit une
// ligne par lieu cité, et certaines publications sont aussi reprises par un article analysé. Sans regroupement, la carte et les
// comptages seraient gonflés. Règle : deux entrées qui pointent vers la MÊME adresse (normalisée) sont une seule publication.
// Les entrées sans adresse ne sont jamais regroupées (on ne devine pas).

import type { BoardEvent } from "../dashboard/fixtures";

/** Adresse comparable : sans « www. », sans ancre, sans paramètres de suivi, sans barre finale, en minuscules. Null si illisible. */
export function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|ref$|mc_)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    const path = url.pathname.replace(/\/+$/, "");
    const query = url.searchParams.toString();
    return `${url.hostname.replace(/^www\./i, "")}${path}${query ? `?${query}` : ""}`.toLowerCase();
  } catch {
    return null;
  }
}

function better(a: BoardEvent, b: BoardEvent): BoardEvent {
  // Un article analysé l'emporte sur un signalement ; à égalité, le plus repris, puis le plus récent.
  if ((a.kind === "article") !== (b.kind === "article")) return a.kind === "article" ? a : b;
  if (a.publications !== b.publications) return a.publications > b.publications ? a : b;
  return a.at >= b.at ? a : b;
}

export interface DedupeResult {
  events: BoardEvent[];
  /** Nombre d'entrées retirées parce qu'elles décrivaient une publication déjà présente. */
  merged: number;
}

/** Regroupe les entrées de même adresse ; l'ordre d'origine (du plus récent au plus ancien) est conservé. */
export function dedupeEvents(events: readonly BoardEvent[]): DedupeResult {
  const groups = new Map<string, BoardEvent[]>();
  for (const event of events) {
    const key = normalizeUrl(event.url);
    if (key === null) continue;
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }
  const kept = new Map<string, BoardEvent>();
  for (const [key, group] of groups) {
    if (group.length === 1) continue;
    const winner = group.reduce(better);
    const domains = [...new Set(group.flatMap((entry) => entry.domains ?? []))];
    kept.set(key, { ...winner, domains, merged: group.length - 1 });
  }
  let merged = 0;
  const out: BoardEvent[] = [];
  const emitted = new Set<string>();
  for (const event of events) {
    const key = normalizeUrl(event.url);
    if (key === null || !kept.has(key)) {
      out.push(event);
      continue;
    }
    if (emitted.has(key)) {
      merged++;
      continue;
    }
    emitted.add(key);
    out.push(kept.get(key)!);
  }
  return { events: out, merged };
}
