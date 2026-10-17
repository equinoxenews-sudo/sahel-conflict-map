import assert from "node:assert/strict";
import test from "node:test";
import { parseBlocks } from "../lib/markdownBlocks";

test("parseBlocks : titres, listes, tableau, citation, séparateur", () => {
  const md = [
    "# Titre",
    "",
    "Premier paragraphe",
    "sur deux lignes.",
    "",
    "## Section",
    "- un",
    "- deux",
    "  suite de deux",
    "1. premier",
    "2. second",
    "",
    "| A | B |",
    "|---|---|",
    "| 1 | 2 |",
    "",
    "> citation",
    "---",
  ].join("\n");
  const blocks = parseBlocks(md);
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "paragraph", "heading", "list", "list", "table", "quote", "rule"]);
  assert.deepEqual(blocks[0], { type: "heading", level: 2, text: "Titre" });
  assert.deepEqual(blocks[1], { type: "paragraph", text: "Premier paragraphe\nsur deux lignes." });
  assert.deepEqual(blocks[3], { type: "list", ordered: false, items: ["un", "deux suite de deux"] });
  assert.deepEqual(blocks[5], { type: "table", head: ["A", "B"], rows: [["1", "2"]] });
});

test("parseBlocks : le HTML brut reste du texte", () => {
  const blocks = parseBlocks("<script>alert(1)</script>");
  assert.deepEqual(blocks, [{ type: "paragraph", text: "<script>alert(1)</script>" }]);
});

test("blocs enrichis : graphique, carte, image", async () => {
  const { parseChart, parseMap, parseImage } = await import("../lib/articleBlocks");
  const chart = parseChart('{"type":"barres","titre":"T","unite":"u","donnees":[["a",1],["b","2"],["c","x"]]}');
  assert.deepEqual(chart?.donnees, [["a", 1], ["b", 2]]);
  assert.equal(parseChart("pas du json"), null);
  const map = parseMap('{"points":[{"lieu":"Kofouno","lat":12.07,"lon":3.18},{"lieu":"Hors carte","lat":200,"lon":0}]}');
  assert.equal(map?.points.length, 1);
  assert.deepEqual(parseImage("![Légende — Auteur](https://upload.wikimedia.org/a.jpg)"), { alt: "Légende — Auteur", src: "https://upload.wikimedia.org/a.jpg" });
  assert.equal(parseImage("![x](javascript:alert(1))"), null);
  const blocks = parseBlocks("```graphique\n{}\n```\n\n![a](https://x.org/i.png)");
  assert.deepEqual(blocks.map((b) => b.type), ["code", "image"]);
  assert.equal(blocks[0].type === "code" && blocks[0].lang, "graphique");
});
