import assert from "node:assert/strict";
import test from "node:test";
import { findEnglishWord } from "../lib/englishLeak";
import { parseResponse, type SourceArticle } from "../lib/synthesizeBriefs";

test("un mot anglais resté dans un titre français est repéré", () => {
  assert.equal(findEnglishWord("Togo : deepening du partenariat stratégique avec la Chine"), "deepening");
  assert.equal(findEnglishWord("Tensions AMID la crise au Sahel"), "amid");
  assert.equal(findEnglishWord("Le Mali dit « urges » ses partenaires"), "urges");
});

test("un titre français, un nom propre anglais et un sigle ne sont jamais écartés", () => {
  assert.equal(findEnglishWord("Le Togo approfondit son partenariat stratégique avec la Chine"), null);
  assert.equal(findEnglishWord("The Times of Israel rapporte une frappe près de Gaza"), null);
  assert.equal(findEnglishWord("Bank of Africa ouvre une filiale à Lomé"), null);
  assert.equal(findEnglishWord("Le Conseil de sécurité de l'ONU se réunit"), null);
  // Un mot qui en contient un autre n'est pas un mot anglais.
  assert.equal(findEnglishWord("Les boostings de capital"), null);
  assert.equal(findEnglishWord(""), null);
});

const sources: SourceArticle[] = [0, 1].map((id) => ({ title: `source ${id}`, url: `https://source${id}.test/article`, domain: `source${id}.test`, summary: "Texte", bodyText: "Texte", imageUrl: null }));
const brief = (title: string, excerpt: string) => ({ title, excerpt, sections: [{ heading: null, body: "Faits attribués" }], category: "Battles", sourceIndexes: [0, 1], existingBriefId: null });

test("une synthèse dont le titre ou l'accroche garde un mot anglais n'est pas publiée", () => {
  assert.equal(parseResponse(JSON.stringify([brief("Togo : deepening du partenariat", "Accroche.")]), sources).length, 0);
  assert.equal(parseResponse(JSON.stringify([brief("Togo : approfondissement du partenariat", "Le Togo, amid les tensions.")]), sources).length, 0);
  assert.equal(parseResponse(JSON.stringify([brief("Togo : approfondissement du partenariat", "Accroche en français.")]), sources).length, 1);
});
