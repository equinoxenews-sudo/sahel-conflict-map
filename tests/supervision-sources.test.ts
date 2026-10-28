import assert from "node:assert/strict";
import test from "node:test";
import { fromBrief, fromFeedItem, fromGdeltEvent, fromTelegramRow, splitGoogleNewsTitle } from "../lib/supervision/sources";

test("un article de flux devient une publication sans lieu inventé", () => {
  const item = fromFeedItem({ title: "  Attaque   près de Kidal ", url: "https://Exemple.org/a/?utm_source=x", domain: "exemple.org", publishedAt: "2026-11-01T10:00:00Z", imageUrl: null, excerpt: "Des tirs." });
  assert.ok(item);
  assert.equal(item.row.url_canonical, "https://exemple.org/a");
  assert.equal(item.row.title, "Attaque près de Kidal");
  assert.equal(item.row.geo_precision, "aucune");
  assert.equal(item.latitude, null);
  assert.equal(fromFeedItem({ title: "", url: "https://x.org/a", domain: "x.org", publishedAt: null, imageUrl: null, excerpt: "" }), null);
});

test("un message Telegram prend sa première ligne comme titre et garde le canal comme source", () => {
  const item = fromTelegramRow({ channel: "canal_test", url: "https://t.me/canal_test/12", text: "Première ligne\nSuite du message avec des détails.", published_at: "2026-11-01T08:00:00Z" });
  assert.ok(item);
  assert.equal(item.row.title, "Première ligne");
  assert.equal(item.row.source_name, "Telegram · canal_test");
  assert.equal(item.row.source_kind, "telegram");
  assert.equal(fromTelegramRow({ channel: "c", url: "", text: "x", published_at: null }), null);
});

test("un événement GDELT garde ses coordonnées, son pays et une confiance basse", () => {
  const item = fromGdeltEvent({ external_id: "123", event_date: "2026-11-01", country: "Mali", latitude: 18.4, longitude: 1.4, category: "Battles", source: "https://presse.example/x", summary: null });
  assert.ok(item);
  assert.equal(item.row.title, "Combats — Mali");
  assert.equal(item.country, "Mali");
  assert.equal(item.row.geo_confidence, 40);
  assert.equal(fromGdeltEvent({ external_id: "1", event_date: "2026-11-01", country: "Mali", latitude: Number.NaN, longitude: 1, category: "Battles", source: null, summary: null }), null);
  const noUrl = fromGdeltEvent({ external_id: "9", event_date: "2026-11-01", country: "Mali", latitude: 1, longitude: 1, category: "Riots", source: "GDELT", summary: "Émeutes à Bamako." });
  assert.equal(noUrl?.row.url, "gdelt:9");
});

test("une synthèse dont la position est la capitale n'est jamais placée sur la carte", () => {
  const base = { id: 5, title: "Négociations à Alger", summary: "Résumé.", published_at: "2026-11-01T06:00:00Z", place_name: "Alger", place_country: "Algérie", confidence: 70 };
  const capital = fromBrief({ ...base, latitude: 36.75, longitude: 3.06, geo_precision: "capitale" });
  assert.equal(capital?.latitude, null);
  assert.equal(capital?.row.geo_precision, "aucune");
  const city = fromBrief({ ...base, latitude: 36.75, longitude: 3.06, geo_precision: "ville" });
  assert.equal(city?.latitude, 36.75);
  assert.equal(city?.row.url, "/briefs/5");
  assert.equal(city?.row.url_canonical, "equinoxe:brief:5");
});

test("Google Actualités : l'éditeur est retrouvé dans le titre et un résumé qui répète le titre disparaît", () => {
  const item = fromFeedItem({
    title: "Attaque du JNIM dans l'Alibori - Banouto",
    url: "https://news.google.com/rss/articles/CBMiX",
    domain: "news.google.com",
    publishedAt: "2026-11-01T10:00:00Z",
    imageUrl: null,
    excerpt: "Attaque du JNIM dans l'Alibori Banouto",
  });
  assert.ok(item);
  assert.equal(item.row.title, "Attaque du JNIM dans l'Alibori");
  assert.equal(item.row.source_name, "Banouto (via Google Actualités)");
  assert.equal(item.row.excerpt, null);
  assert.deepEqual(splitGoogleNewsTitle("Sans éditeur"), { title: "Sans éditeur", publisher: null });
  assert.deepEqual(splitGoogleNewsTitle("Un titre - avec tiret - et un éditeur"), { title: "Un titre - avec tiret", publisher: "et un éditeur" });
});
