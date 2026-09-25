import test from "node:test";
import assert from "node:assert/strict";
import { parseResponse, type SourceArticle, type PreviousBrief } from "../lib/synthesizeBriefs";
import { computeBriefReliability } from "../lib/reliability";
const sources: SourceArticle[] = [0, 1].map((id) => ({ title: `source ${id}`, url: `https://source${id}.test/article`, domain: `source${id}.test`, summary: "Texte", bodyText: "Texte", imageUrl: null }));
const previous: PreviousBrief[] = [{ id: 12, title: "Avant", summary: "Avant", sections: [], source_urls: ["https://old.test/article"], source_domains: ["old.test"], published_at: null }];
const item = { title: "Synthèse", excerpt: "Résumé", sections: [{ heading: null, body: "Faits attribués" }], category: "Battles", sourceIndexes: [0, 1], existingBriefId: null as number | null };
test("Une synthèse conserve toutes les références et un ID autorisé", () => {
 const [brief] = parseResponse(JSON.stringify([{ ...item, existingBriefId: 12 }]), sources, previous);
 assert.equal(brief.existingBriefId, 12);
 assert.equal(brief.sourceUrls.length, 3);
 assert.deepEqual(brief.newSourceUrls, sources.map((s) => s.url));
 assert.equal(brief.sourceDomains.length, brief.sourceUrls.length);
});
test("Refuse références inventées, indices non entiers et ID inconnu", () => {
 for (const value of [-1, 0.5, "0", 9]) assert.equal(parseResponse(JSON.stringify([{ ...item, sourceIndexes: [value] }]), sources).length, 0);
 assert.equal(parseResponse(JSON.stringify([{ ...item, existingBriefId: 99 }]), sources, previous).length, 0);
});
test("Une source et une brève antérieure ne sont pas affectées deux fois", () => {
 assert.equal(parseResponse(JSON.stringify([item, item]), sources).length, 1);
 assert.equal(parseResponse(JSON.stringify([{ ...item, existingBriefId: 12, sourceIndexes: [0] }, { ...item, existingBriefId: 12, sourceIndexes: [1] }]), sources, previous).length, 1);
});
test("Une sortie invalide ne produit aucune synthèse à acquitter", () => {
 assert.deepEqual(parseResponse("pas du JSON", sources), []);
 assert.deepEqual(parseResponse(JSON.stringify([{ ...item, sourceIndexes: [] }]), sources), []);
});
test("Le nombre de domaines ne simule pas une vérité certaine", () => {
 assert.equal(computeBriefReliability([]), 1);
 assert.equal(computeBriefReliability(["bbc.com", "www.bbc.co.uk"]), 2);
 assert.equal(computeBriefReliability(["a.test", "b.test", "c.test", "d.test"]), 4);
});
