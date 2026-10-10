import assert from "node:assert/strict";
import test from "node:test";
import { groupBriefsByZone, ISO3_TO_ZONE, isHomeZone, ZONE_GLOBE_VIEWS, ZONE_ORDER } from "../lib/homeZones";
import { ZONE_COUNTRIES } from "../lib/zoneCountries";

test("Les cinq zones de l'accueil ont une vue de caméra et des pays", () => {
  assert.equal(ZONE_ORDER.length, 5);
  for (const zone of ZONE_ORDER) {
    assert.ok(ZONE_GLOBE_VIEWS[zone].height > 1_000_000, zone);
    assert.ok(ZONE_COUNTRIES[zone].length > 5, zone);
  }
  assert.equal(isHomeZone("europe"), true);
  assert.equal(isHomeZone("tracking"), false);
});

test("Un pays n'appartient qu'à une seule zone", () => {
  const all = ZONE_ORDER.flatMap((zone) => ZONE_COUNTRIES[zone].map((c) => c.iso3));
  assert.equal(new Set(all).size, all.length);
  assert.equal(ISO3_TO_ZONE.FRA, "europe");
  assert.equal(ISO3_TO_ZONE.NGA, "afrique");
  assert.equal(ISO3_TO_ZONE.USA, undefined);
});

test("Derniers articles : regroupés par zone, huit au plus, sport écarté", () => {
  const row = (id: number, zone: string, title: string) => ({
    id,
    zone_slug: zone,
    title,
    image_url: null,
    published_at: "2026-10-10T08:00:00Z",
    veracity: "Confirmé",
  });
  const rows = [
    ...Array.from({ length: 12 }, (_, i) => row(i, "afrique", `Événement ${i} au Sahel`)),
    row(100, "europe", "Sommet européen sur la défense"),
    row(101, "europe", "Football : le PSG remporte le match"),
    row(102, "zone-inconnue", "Ignoré"),
  ];
  const grouped = groupBriefsByZone(rows);
  assert.equal(grouped.afrique.length, 8);
  assert.deepEqual(grouped.europe.map((b) => b.id), [100]);
  assert.equal(grouped["moyen-orient"].length, 0);
});
