import assert from "node:assert/strict";
import test from "node:test";
import { IMAGE_SIZES, imageSizeOf, imageToken, parseImageAlt, setImageSize } from "../lib/investigation/imageRefs";
import { linkSelection } from "../lib/investigation/selectionLink";
import { parseBlocks, parseInline } from "../lib/investigation/wikilinks";

test("lier la sélection à une fiche : [[Fiche|passage]], ou [[Fiche]] si c'est le nom", () => {
  const text = "African Parks Network (APN) utilise une infrastructure.";
  const start = 0;
  const end = "African Parks Network".length;
  const linked = linkSelection(text, start, end, "APN -African Parc Network");
  assert.equal(linked?.text, "[[APN -African Parc Network|African Parks Network]] (APN) utilise une infrastructure.");
  assert.equal(linkSelection("voir APN ici", 5, 8, "APN")?.text, "voir [[APN]] ici");
  assert.equal(linkSelection("voir apn ici", 5, 8, "APN")?.text, "voir [[APN]] ici");
});

test("les espaces au bord de la sélection restent hors du lien", () => {
  const linked = linkSelection("un  Parc W  fin", 2, 11, "APN - Parc W");
  assert.equal(linked?.text, "un  [[APN - Parc W|Parc W]]  fin");
});

test("la position suivante vient juste après le lien", () => {
  const linked = linkSelection("abc def", 0, 3, "Cible");
  assert.equal(linked?.next, "[[Cible|abc]]".length);
});

test("lien impossible : sélection vide, ou déjà dans un lien", () => {
  assert.equal(linkSelection("abc", 1, 1, "X"), null);
  assert.equal(linkSelection("abc   ", 3, 6, "X"), null);
  assert.equal(linkSelection("voir [[Fiche|un passage]] ici", 14, 20, "Autre"), null);
  assert.ok(linkSelection("voir [[Fiche]] puis un passage", 21, 30, "Autre"));
});

test("les caractères du lien sont retirés du passage (retours à la ligne, | et crochets)", () => {
  const linked = linkSelection("a|b\nc [d]", 0, 9, "Cible");
  assert.equal(linked?.text, "[[Cible|a b c d]]");
});

test("taille d'une image : suffixe |s |m |full dans la légende, grande par défaut", () => {
  assert.deepEqual(parseImageAlt("Infrastructure e-mail"), { caption: "Infrastructure e-mail", size: "l" });
  assert.deepEqual(parseImageAlt("Infrastructure e-mail|m"), { caption: "Infrastructure e-mail", size: "m" });
  assert.deepEqual(parseImageAlt("|full"), { caption: "", size: "full" });
  assert.deepEqual(IMAGE_SIZES, ["s", "m", "l", "full"]);
  assert.equal(imageToken("x", "Légende", "m"), "![Légende|m](img:x)");
  assert.equal(imageToken("x", "Légende", "l"), "![Légende](img:x)");
});

test("changer la taille d'une image réécrit sa légende, sans toucher aux autres", () => {
  const body = "Avant\n![A](img:one)\n![B|s](img:two)\nAprès";
  const bigger = setImageSize(body, "two", "full");
  assert.equal(bigger, "Avant\n![A](img:one)\n![B|full](img:two)\nAprès");
  assert.equal(setImageSize(bigger, "two", "l"), body.replace("|s", ""));
  assert.equal(imageSizeOf(bigger, "two"), "full");
  assert.equal(imageSizeOf(bigger, "one"), "l");
  assert.equal(imageSizeOf(bigger, "absent"), "l");
});

test("une image seule sur sa ligne est un bloc à part, le texte suivant ne coule plus autour", () => {
  const blocks = parseBlocks("Avant\n![Légende|m](img:abc)\nAprès l'image\nsur deux lignes");
  assert.deepEqual(blocks.map((b) => b.type), ["paragraph", "image", "paragraph"]);
  const image = blocks[1];
  assert.equal(image.type === "image" && image.id, "abc");
  assert.equal(image.type === "image" && image.alt, "Légende|m");
});

test("une image au milieu d'une phrase reste dans le texte", () => {
  const blocks = parseBlocks("Voir ![x](img:abc) ici");
  assert.deepEqual(blocks.map((b) => b.type), ["paragraph"]);
  assert.ok(parseInline("Voir ![x](img:abc) ici").some((token) => token.type === "image"));
});
