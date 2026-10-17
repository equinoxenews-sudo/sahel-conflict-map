import assert from "node:assert/strict";
import test from "node:test";
import { labelForPercent, legacyVeracity, normalizeConfidence } from "../lib/confidence";
import { parseResponse, telegramOnlyGroupAllowed, type SourceArticle } from "../lib/synthesizeBriefs";
import { parseChannelPage } from "../lib/telegram";
import { zoneForText } from "../lib/syncTelegram";

const press = (i: number): SourceArticle => ({
  title: `Article ${i}`, url: `https://rfi.fr/a${i}`, domain: "rfi.fr", summary: null, bodyText: "Texte de presse.", imageUrl: null,
});
const tg = (channel: string, id: number, length = 200): SourceArticle => ({
  title: "Message", url: `https://t.me/${channel}/${id}`, domain: `t.me/${channel}`, summary: null,
  bodyText: "x".repeat(length), imageUrl: null, telegram: { channel, note: "test" },
});

test("Échelle de confiance : tranches et prudence", () => {
  assert.equal(labelForPercent(5), "Improbable");
  assert.equal(labelForPercent(20), "Peu probable");
  assert.equal(labelForPercent(40), "Possible");
  assert.equal(labelForPercent(65), "Probable");
  assert.equal(labelForPercent(80), "Très probable");
  assert.equal(labelForPercent(90), "Hautement probable");
  assert.equal(labelForPercent(97), "Confirmé");
  // Valeurs manquantes : niveau prudent.
  assert.deepEqual(normalizeConfidence(undefined, undefined, undefined), { percent: 40, label: "Possible", claimedBy: null });
  // L'étiquette suit le pourcentage, pas l'inverse.
  assert.equal(normalizeConfidence(30, "Confirmé", null).label, "Peu probable");
});

test("« Revendiqué » exige un auteur et reste dans sa tranche", () => {
  assert.deepEqual(normalizeConfidence(90, "Revendiqué", "JNIM"), { percent: 69, label: "Revendiqué", claimedBy: "JNIM" });
  assert.equal(normalizeConfidence(65, "Revendiqué", null).label, "Probable");
  // Confirmé par une source indépendante : l'étiquette suit le pourcentage, la revendication reste.
  assert.deepEqual(normalizeConfidence(96, "Confirmé", "JNIM"), { percent: 96, label: "Confirmé", claimedBy: "JNIM" });
  assert.equal(legacyVeracity("Hautement probable"), "Très probable");
});

test("Telegram complète la presse ; seul, il faut deux canaux ou un message conséquent", () => {
  assert.equal(telegramOnlyGroupAllowed([press(0), tg("rybar", 1)]), true);
  assert.equal(telegramOnlyGroupAllowed([tg("rybar", 1)]), false);
  assert.equal(telegramOnlyGroupAllowed([tg("rybar", 1), tg("rybar", 2)]), false);
  assert.equal(telegramOnlyGroupAllowed([tg("rybar", 1), tg("afriqueintel", 2)]), true);
  assert.equal(telegramOnlyGroupAllowed([tg("rybar", 1, 900)]), true);
});

test("La réponse de l'analyste : groupe Telegram isolé écarté, confiance et lieu lus", () => {
  const sources = [press(0), tg("rybar", 1)];
  const json = JSON.stringify([
    { existingBriefId: null, title: "A", excerpt: "a", primaryTheme: "conflicts", secondaryThemes: [], eventType: null, importance: "medium",
      veracity: "Revendiqué", confidence: 64, confidenceLabel: "Revendiqué", claimedBy: "JNIM",
      place: { city: "Djibo", country: "Burkina Faso" }, sections: [{ heading: null, body: "Texte." }], sourceIndexes: [0] },
    { existingBriefId: null, title: "B", excerpt: "b", primaryTheme: "conflicts", secondaryThemes: [], eventType: null, importance: "low",
      veracity: "Possible", confidence: 40, confidenceLabel: "Possible", claimedBy: null,
      place: { city: null, country: "Mali" }, sections: [{ heading: null, body: "Texte." }], sourceIndexes: [1] },
  ]);
  const briefs = parseResponse(json, sources, [], false, true);
  assert.equal(briefs.length, 1);
  assert.deepEqual(briefs[0].confidence, { percent: 64, label: "Revendiqué", claimedBy: "JNIM" });
  assert.deepEqual(briefs[0].place, { city: "Djibo", country: "Burkina Faso" });
  // Hors zone « analyste », l'ancien format est inchangé.
  assert.equal(parseResponse(json, sources, [], false, false)[0].confidence, null);
});

test("Lecture d'une page publique de canal Telegram", () => {
  const html = `<div class="tgme_widget_message js-widget_message" data-post="afriqueintel/42">
    <div class="tgme_widget_message_text js-message_text" dir="auto">Attaque à <b>Djibo</b> &amp; environs<br/>Bilan provisoire</div>
    <a class="tgme_widget_message_photo_wrap" style="width:100px;background-image:url('https://cdn.example/img.jpg')"></a>
    <time datetime="2026-10-17T08:12:00+00:00" class="time">08:12</time></div>
    <div class="tgme_widget_message js-widget_message" data-post="afriqueintel/43"><div class="other">sans texte</div></div>`;
  const posts = parseChannelPage("afriqueintel", html);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, "https://t.me/afriqueintel/42");
  assert.equal(posts[0].text, "Attaque à Djibo & environs\nBilan provisoire");
  assert.equal(posts[0].imageUrl, "https://cdn.example/img.jpg");
  assert.equal(posts[0].publishedAt, "2026-10-17T08:12:00.000Z");
});

test("Canal généraliste : le message va à la zone dont il cite un pays", () => {
  assert.equal(zoneForText("Frappe de drones près de Gao, au Mali", ["afrique"]), "afrique");
  assert.equal(zoneForText("Situation à Kharkiv", ["afrique"]), null);
});

test("Doute de l'analyste : lu dans la réponse, message clair pour Nicolas", async () => {
  const { reviewMessage } = await import("../lib/briefReviews");
  const json = JSON.stringify([
    { existingBriefId: null, title: "Frappe revendiquée", excerpt: "x", primaryTheme: "conflicts", secondaryThemes: [], eventType: null,
      importance: "high", veracity: "Revendiqué", confidence: 62, confidenceLabel: "Revendiqué", claimedBy: "Africa Corps",
      doubt: "Seule source : un canal pro-russe, bilan invérifiable.", place: { city: null, country: "Mali" },
      sections: [{ heading: null, body: "Texte." }], sourceIndexes: [0] },
  ]);
  const [brief] = parseResponse(json, [press(0)], [], false, true);
  assert.equal(brief.doubt, "Seule source : un canal pro-russe, bilan invérifiable.");
  assert.equal(parseResponse(json, [press(0)], [], false, false)[0].doubt, null);
  const text = reviewMessage({ zone: "afrique", title: brief.title, doubt: brief.doubt!, confidence: 62, label: "Revendiqué", sources: ["rfi.fr"] });
  assert.match(text, /Gabriel \(Afrique\) a un doute/);
  assert.match(text, /Revendiqué \(62 %\)/);
});
