import test from "node:test";
import assert from "node:assert/strict";
import { mixBriefsAcrossZones } from "../lib/briefOrdering";

const at = (hoursAgo: number) => new Date(Date.UTC(2026, 9, 3, 12) - hoursAgo * 3600_000).toISOString();
const brief = (id: number, zone_slug: string, hoursAgo: number, importance: string | null = null) =>
 ({ id, zone_slug, published_at: at(hoursAgo), importance });

test("Les zones sont alternées au lieu d'être regroupées", () => {
 // Créées zone par zone : un tri chronologique donnerait SA, SA, SA, IP, IP, IP.
 const input = [
  brief(1, "amerique-du-sud", 1), brief(2, "amerique-du-sud", 2), brief(3, "amerique-du-sud", 3),
  brief(4, "indopacifique", 4), brief(5, "indopacifique", 5), brief(6, "indopacifique", 6),
 ];
 const zones = mixBriefsAcrossZones(input).map((b) => b.zone_slug);
 assert.deepEqual(zones, ["amerique-du-sud", "indopacifique", "amerique-du-sud", "indopacifique", "amerique-du-sud", "indopacifique"]);
});

test("Une synthèse importante remonte, sans écraser l'actualité récente", () => {
 const input = [brief(1, "afrique", 10), brief(2, "afrique", 20, "high"), brief(3, "afrique", 400, "high")];
 assert.deepEqual(mixBriefsAcrossZones(input).map((b) => b.id), [2, 1, 3]);
});

test("Aucune synthèse n'est perdue ni dupliquée", () => {
 const input = [brief(1, "a", 1), brief(2, "b", 2), brief(3, "a", 3), brief(4, "c", 4), brief(5, "a", 5)];
 assert.deepEqual(mixBriefsAcrossZones(input).map((b) => b.id).sort(), [1, 2, 3, 4, 5]);
 assert.deepEqual(mixBriefsAcrossZones([]), []);
});
