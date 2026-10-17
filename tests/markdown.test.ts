import assert from "node:assert/strict";
import test from "node:test";
import { parseBlocks } from "../lib/markdown";

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
