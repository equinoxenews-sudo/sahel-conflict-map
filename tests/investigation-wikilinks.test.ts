import test from "node:test";
import assert from "node:assert/strict";
import {
  extractWikiLinks,
  findBacklinks,
  parseBlocks,
  parseInline,
  replaceLinkTarget,
  resolveWikiLink,
  uniqueTitle,
} from "../lib/investigation/wikilinks";
import type { InvestigationEntity, Note } from "../lib/investigation/types";

const note = (id: string, title: string, body = "", entityId?: string): Note => ({
  id, dossierId: "d", title, body, claimType: "observed", linkedSourceIds: [], linkedEntityIds: [], entityId,
  createdAt: "2026-10-06", updatedAt: "2026-10-06",
});
const entity = (id: string, name: string, aliases: string[] = []): InvestigationEntity => ({
  id, dossierId: "d", type: "person", name, aliases, notes: "", position: { x: 0, y: 0 }, createdAt: "2026-10-06",
});

test("Les liens [[…]] sont extraits, avec ou sans texte affiché", () => {
  assert.deepEqual(extractWikiLinks("Voir [[Julien Chevillot]] et [[APN-W|le parc]]."), [
    { target: "Julien Chevillot", display: "Julien Chevillot" },
    { target: "APN-W", display: "le parc" },
  ]);
});

test("Un lien désigne une note par son titre, sans tenir compte des accents ni de la casse", () => {
  const notes = [note("1", "Isidore Ogoudie Amahowe")];
  const result = resolveWikiLink("isidore ogoudie amahowé", notes, []);
  assert.equal(result.kind, "note");
});

test("Un lien peut désigner une entité par son nom ou un alias ; une fiche existante prime", () => {
  const entities = [entity("e1", "Julien Chevillot", ["JC"])];
  assert.equal(resolveWikiLink("JC", [], entities).kind, "entity");
  const withNote = [note("n1", "Fiche Julien", "", "e1")];
  const resolved = resolveWikiLink("JC", withNote, entities);
  assert.equal(resolved.kind, "note");
});

test("Un nom partagé par deux entités est ambigu : jamais choisi automatiquement", () => {
  const entities = [entity("e1", "Isidore"), entity("e2", "Isidore")];
  const result = resolveWikiLink("Isidore", [], entities);
  assert.equal(result.kind, "ambiguous");
  assert.equal(result.kind === "ambiguous" && result.entities.length, 2);
});

test("Un lien vers rien est signalé comme manquant", () => {
  assert.equal(resolveWikiLink("Inconnu", [note("1", "Autre")], []).kind, "missing");
  assert.equal(resolveWikiLink("   ", [], []).kind, "missing");
});

test("Rétroliens : les notes qui citent la note, pas elle-même", () => {
  const target = note("t", "APN-W");
  const notes = [target, note("a", "Réunion", "On a vu [[APN-W]] hier"), note("b", "Autre", "rien"), note("c", "APN-W bis", "[[APN-W]] [[APN-W]]")];
  assert.deepEqual(findBacklinks(target, notes, []).map((n) => n.id), ["a", "c"]);
});

test("Titre unique : un doublon reçoit un numéro", () => {
  const notes = [note("1", "Réunion"), note("2", "Réunion (2)")];
  assert.equal(uniqueTitle("Réunion", notes), "Réunion (3)");
  assert.equal(uniqueTitle("Réunion", notes, "1"), "Réunion");
  assert.equal(uniqueTitle("  ", notes), "Sans titre");
});

test("Renommer une note met à jour les liens qui la désignent", () => {
  assert.equal(
    replaceLinkTarget("[[Ancien]] puis [[ancien|le même]] et [[Autre]]", "Ancien", "Nouveau"),
    "[[Nouveau]] puis [[Nouveau|le même]] et [[Autre]]"
  );
});

test("Mise en forme inline : lien, gras, italique, code, adresse", () => {
  const tokens = parseInline("A [[B|c]] **gras** *it* `x` https://exemple.org/a fin");
  assert.deepEqual(tokens.map((t) => t.type), ["text", "wiki", "text", "bold", "text", "italic", "text", "code", "text", "url", "text"]);
});

test("Blocs : titres, listes, citation, séparateur, paragraphes", () => {
  const blocks = parseBlocks("# Titre\n\nUn texte\nsur deux lignes\n\n- a\n- b\n\n1. un\n2. deux\n\n> cité\n\n---\n");
  assert.deepEqual(blocks.map((b) => b.type), ["heading", "paragraph", "list", "list", "quote", "rule"]);
  assert.equal(blocks[2].type === "list" && blocks[2].items.length, 2);
  assert.equal(blocks[3].type === "list" && blocks[3].ordered, true);
});

import { extractImageIds, imageToken, insertTokenAt, removeImageToken, replaceImageIds } from "../lib/investigation/imageRefs";

test("Images dans le texte : insertion, repérage, suppression, remplacement d'identifiants", () => {
  const body = `Capture du profil :\n${imageToken("abc-123", "TikTok, 12/10")}\n\nSuite du texte ${imageToken("def-456")}.`;
  assert.equal(imageToken("x", "a]b\nc"), "![a b c](img:x)");
  assert.deepEqual(extractImageIds(body), ["abc-123", "def-456"]);
  assert.equal(removeImageToken(body, "abc-123"), "Capture du profil :\n\nSuite du texte ![](img:def-456).");
  assert.deepEqual(extractImageIds(removeImageToken(body, "def-456")), ["abc-123"]);
  assert.equal(replaceImageIds(body, new Map([["abc-123", "nouveau-1"]])).includes("img:nouveau-1"), true);
  assert.equal(replaceImageIds(body, new Map([["abc-123", "nouveau-1"]])).includes("img:def-456"), true);
});

test("Texte : image et lien [texte](adresse) reconnus, une adresse non http(s) ne devient pas un lien", () => {
  const tokens = parseInline("![capture](img:i1) et [le profil](https://tiktok.com/@jc) puis [piège](javascript:alert(1))");
  assert.deepEqual(tokens.map((t) => t.type), ["image", "text", "link", "text"]);
  const link = tokens[2];
  assert.equal(link.type === "link" && link.url, "https://tiktok.com/@jc");
});

test("Insertion d'une image : sur sa propre ligne, positions suivantes cohérentes", () => {
  const first = insertTokenAt("Avant et après", 5, "![a](img:1)");
  assert.equal(first.text, "Avant\n![a](img:1)\n et après");
  const second = insertTokenAt(first.text, first.next, "![b](img:2)");
  assert.equal(second.text, "Avant\n![a](img:1)\n![b](img:2)\n et après");
  assert.equal(insertTokenAt("", 0, "![x](img:3)").text, "![x](img:3)\n");
  assert.equal(insertTokenAt("abc", 99, "![x](img:3)").text, "abc\n![x](img:3)\n");
});
