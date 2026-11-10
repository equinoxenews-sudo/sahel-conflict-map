// Supervision V1, Lot 5b : ré-évaluation des publications DÉJÀ rattachées quand le périmètre ou les règles changent. Sans IA.
//
// Pourquoi : un rattachement est jugé une seule fois, à la collecte. Si l'utilisateur ajoute une exclusion, change de mots-clés ou si une
// règle est corrigée (« il faut un fait »), les anciennes publications resteraient affichées à tort. À chaque collecte, on les re-juge
// avec le périmètre courant :
//  - ne correspond plus  -> MASQUÉ (hidden_at, avec la raison écrite) : la publication reste en base, rien n'est supprimé ;
//  - masqué, correspond de nouveau -> RÉTABLI (on peut donc assouplir une règle sans rien perdre) ;
//  - correspond toujours -> sa raison, son score et son thème sont mis à jour s'ils ont changé.
// La partie « décider » est pure et testée ; la partie « écrire » est séparée (applyReevaluation).

import type { ScopeSnapshot } from "../core/majorChange";
import { adminDb, StoreError, type Db } from "../core/store";
import { matchItem } from "./match";

export interface StoredMatch {
  item_id: string;
  score: number;
  reason: string;
  terms: string[];
  theme: string;
  hidden_at: string | null;
  title: string;
  excerpt: string | null;
}

export interface MatchFields {
  score: number;
  reason: string;
  terms: string[];
  theme: string;
}

export interface Reevaluation {
  /** À masquer, avec la raison écrite du rejet (regroupés par raison à l'écriture). */
  hide: { itemId: string; reason: string }[];
  /** À rétablir : de nouveau conformes ; leurs champs sont remis à jour. */
  restore: { itemId: string; fields: MatchFields }[];
  /** Toujours conformes mais dont la raison, le score ou le thème ont changé. */
  refresh: { itemId: string; fields: MatchFields }[];
}

const sameTerms = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((term, index) => term === b[index]);

/** Décide, pour chaque rattachement connu, s'il reste, est masqué ou rétabli. Pur : même entrée, même sortie. */
export function reevaluate(stored: readonly StoredMatch[], snapshot: ScopeSnapshot): Reevaluation {
  const plan: Reevaluation = { hide: [], restore: [], refresh: [] };
  for (const row of stored) {
    const verdict = matchItem({ title: row.title, excerpt: row.excerpt }, snapshot);
    if (!verdict.matched) {
      if (row.hidden_at === null) plan.hide.push({ itemId: row.item_id, reason: verdict.reason });
      continue;
    }
    const fields: MatchFields = { score: verdict.score, reason: verdict.reason, terms: verdict.terms, theme: verdict.theme };
    if (row.hidden_at !== null) plan.restore.push({ itemId: row.item_id, fields });
    else if (row.score !== fields.score || row.reason !== fields.reason || row.theme !== fields.theme || !sameTerms(row.terms, fields.terms)) plan.refresh.push({ itemId: row.item_id, fields });
  }
  return plan;
}

// --- Lecture et écriture ----------------------------------------------------------------------------------------------------

const STORED_LIMIT = 3000;
const chunks = <T,>(values: readonly T[], size: number): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

const missingColumn = (error: { code?: string; message?: string }) => error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");

/**
 * Rattachements de la Supervision avec le texte de leur publication. `available: false` si la colonne « hidden_at » n'existe pas encore
 * dans cette base (script supabase/supervision-lot5-reevaluation.sql pas exécuté) : la collecte continue alors sans ré-évaluer.
 */
export async function loadStoredMatches(db: Db, supervisionId: string): Promise<{ available: boolean; rows: StoredMatch[] }> {
  const { data, error } = await db
    .from("sv_matches")
    .select("item_id, score, reason, terms, theme, hidden_at, sv_items(title, excerpt)")
    .eq("supervision_id", supervisionId)
    .order("matched_at", { ascending: false })
    .limit(STORED_LIMIT);
  if (error) {
    if (missingColumn(error)) return { available: false, rows: [] };
    throw new StoreError(`Lecture des rattachements : ${error.message}`, error);
  }
  const rows = ((data ?? []) as unknown as { item_id: string; score: number; reason: string; terms: string[] | null; theme: string; hidden_at: string | null; sv_items: { title: string; excerpt: string | null } | null }[]).flatMap((row) =>
    row.sv_items ? [{ item_id: row.item_id, score: row.score, reason: row.reason, terms: row.terms ?? [], theme: row.theme, hidden_at: row.hidden_at, title: row.sv_items.title, excerpt: row.sv_items.excerpt }] : [],
  );
  return { available: true, rows };
}

/** Écrit le plan : masquage groupé par raison (peu d'appels), rétablissements et mises à jour une par une (rares). */
export async function applyReevaluation(plan: Reevaluation, supervisionId: string, now: Date, db: Db = adminDb()): Promise<void> {
  const byReason = new Map<string, string[]>();
  for (const entry of plan.hide) byReason.set(entry.reason, [...(byReason.get(entry.reason) ?? []), entry.itemId]);
  for (const [reason, ids] of byReason) {
    for (const part of chunks(ids, 150)) {
      const { error } = await db.from("sv_matches").update({ hidden_at: now.toISOString(), hidden_reason: reason }).eq("supervision_id", supervisionId).in("item_id", part);
      if (error) throw new StoreError(`Masquage des rattachements : ${error.message}`, error);
    }
  }
  const singles = [
    ...plan.restore.map((entry) => ({ itemId: entry.itemId, patch: { ...entry.fields, hidden_at: null, hidden_reason: null } })),
    ...plan.refresh.map((entry) => ({ itemId: entry.itemId, patch: { ...entry.fields } })),
  ];
  for (const part of chunks(singles, 20)) {
    const results = await Promise.all(part.map(({ itemId, patch }) => db.from("sv_matches").update(patch).eq("supervision_id", supervisionId).eq("item_id", itemId)));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw new StoreError(`Mise à jour des rattachements : ${failed.error.message}`, failed.error);
  }
}
