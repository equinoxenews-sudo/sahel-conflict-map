// Tests d'INTÉGRATION de la lecture des événements réels : base de PRÉPRODUCTION seulement (échantillon importé par
// scripts/import-sample-staging.ts après supabase/supervision-lot3-sample.sql).
//   npm run test:staging
// La date de référence est FIXE (l'échantillon ne bouge pas) : sinon le test se mettrait à échouer avec le temps.

import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { ScopeSnapshot } from "../../lib/supervision/core/majorChange";
import { loadBoardData } from "../../lib/supervision/data/board";

const STAGING_PROJECT_REF = "upoknwoctatqmlonitzx";
dotenv.config({ path: ".env.local", quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const host = (() => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
})();
const skip = !url || !serviceKey ? "Variables Supabase absentes de .env.local." : host.split(".")[0] !== STAGING_PROJECT_REF ? `Base « ${host} » : ce n'est PAS la préproduction, tests refusés.` : false;
const admin = skip ? null : createClient(url, serviceKey, { auth: { persistSession: false } });
const NOW = new Date("2026-11-10T00:00:00Z");

const snapshot = (codes: string[]): ScopeSnapshot => ({
  scope: { primaryZone: { kind: "countries", codes }, objective: "securite", countries: codes, sources: [], keywords: [], entities: [] },
  estimate: { volumePerMonth: null, volumeConfidence: "unknown", aiCostUsdPerMonth: null, costConfidence: "unknown" },
});

test("événements réels : le Nigeria renvoie articles et signalements, triés, dans la fenêtre de 90 jours, avec leur provenance", { skip }, async () => {
  const data = await loadBoardData(snapshot(["NGA"]), NOW, admin!);
  assert.ok(data.events.length > 0, "l'échantillon contient des éléments sur le Nigeria");
  assert.ok(data.coverage.signals > 100, "plusieurs centaines de signalements attendus");
  assert.equal(data.events.length, data.coverage.articles + data.coverage.signals);
  assert.deepEqual(data.countries, [{ iso3: "NGA", name: "Nigeria" }]);
  const times = data.events.map((e) => e.at);
  assert.deepEqual([...times].sort().reverse(), times, "du plus récent au plus ancien");
  const floor = NOW.getTime() - 90 * 86_400_000;
  assert.ok(data.events.every((e) => Date.parse(e.at) >= floor - 86_400_000 && Date.parse(e.at) <= NOW.getTime()));
  assert.ok(data.events.some((e) => e.kind === "signal" && e.url && e.domains?.length));
  assert.ok(new Set(data.events.map((e) => e.id)).size === data.events.length, "aucun identifiant en double entre articles et signalements");
  assert.ok(data.events.every((e) => e.verification !== "confirme" || e.kind === "article"), "un signalement n'est jamais « confirmé »");
  assert.ok(data.sample);
});

test("événements réels : un pays peu couvert renvoie peu, et le dit (aucun faux événement)", { skip }, async () => {
  const data = await loadBoardData(snapshot(["BEN"]), NOW, admin!);
  assert.ok(data.events.length <= 5, `peu d'éléments attendus pour le Bénin, trouvé ${data.events.length}`);
  assert.ok(data.events.every((e) => !e.title.startsWith("[DÉMO]")));
});

test("événements réels : plusieurs pays sont réunis ; une zone sans pays ne renvoie rien", { skip }, async () => {
  const both = await loadBoardData(snapshot(["NGA", "SDN"]), NOW, admin!);
  const nga = await loadBoardData(snapshot(["NGA"]), NOW, admin!);
  assert.ok(both.events.length > nga.events.length);
  const circle: ScopeSnapshot = { ...snapshot([]), scope: { ...snapshot([]).scope, primaryZone: { kind: "circle", lat: 0, lon: 0, radiusKm: 100 } } };
  const none = await loadBoardData(circle, NOW, admin!);
  assert.equal(none.events.length, 0);
});

test("sécurité : la clé publique ne lit pas l'échantillon de la préproduction", { skip }, async () => {
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  for (const table of ["zone_briefs", "conflict_events"]) {
    const { data, error } = await anon.from(table).select("id").limit(1);
    assert.ok(error || (data ?? []).length === 0, `${table} lisible avec la clé publique`);
  }
});
