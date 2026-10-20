import assert from "node:assert/strict";
import test from "node:test";
import { groupBriefsByZone, HOME_NO_INTRO_HREF, ISO3_TO_ZONE, isHomeZone, ZONE_BRIEF_DAYS, ZONE_GLOBE_VIEWS, ZONE_ORDER, zoneBriefsSince, zoneHomeHref } from "../lib/homeZones";
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

test("Articles des cinq jours : regroupés par zone, tous gardés jusqu'au plafond, sport écarté", () => {
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
  assert.equal(grouped.afrique.length, 12);
  assert.equal(groupBriefsByZone(rows, 8).afrique.length, 8);
  assert.deepEqual(grouped.europe.map((b) => b.id), [100]);
  assert.equal(grouped["moyen-orient"].length, 0);
});

test("Les retours vers l'accueil n'ont ni page intermédiaire ni introduction", () => {
  assert.equal(zoneHomeHref("europe"), "/?zone=europe&intro=0");
  assert.equal(zoneHomeHref("tracking"), HOME_NO_INTRO_HREF);
  assert.equal(HOME_NO_INTRO_HREF, "/?intro=0");
});

test("La fenêtre des articles d'une zone commence cinq jours avant maintenant", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  assert.equal(zoneBriefsSince(now), "2026-10-15T12:00:00.000Z");
  assert.equal(ZONE_BRIEF_DAYS, 5);
});
