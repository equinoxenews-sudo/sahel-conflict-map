import assert from "node:assert/strict";
import test from "node:test";
import { bodyToDoc, docToBody, DEFAULT_HIGHLIGHT } from "../lib/investigation/richText";

const RED = "#e5484d";
const BLUE = "#3b8eea";
const ID = "ff5cdd6f-f483-4afa-9f67-b01e021d4f45";

// Textes « canoniques » : après l'aller-retour, ils doivent revenir identiques, au caractère près.
const CANONICAL: Record<string, string> = {
  paragraphes: "Premier paragraphe.\n\nSecond paragraphe, avec des accents : é è à ç ù œ — « guillemets ».",
  titres: "# Titre un\n\n## Titre deux\n\n### Titre trois\n\nTexte.",
  listes: "- un\n- deux\n- trois\n\n1. premier\n2. second",
  citation: "> une citation\n> sur deux lignes\n\nTexte après.",
  regle: "Avant.\n\n---\n\nAprès.",
  gras_italique: "Du **gras**, de l'*italique*, du ***les deux***, du `code`.",
  surligne: "Un ==passage surligné== et un {{~#3b8eea|passage surligné en bleu}} dans la phrase.",
  couleur: `Du texte {{${RED}|rouge}} puis {{${BLUE}|bleu}}.`,
  imbrication: `**{{${RED}|gras et rouge}}** puis **==surligné gras==** et =={{${RED}|rouge surligné}}==.`,
  liens: "Voir [[Marie-Michaire Lima]] et [[APN - Parc Pendjari|le parc]], ou [le site](https://example.org/a?b=1) ; adresse nue https://example.org/x ici.",
  images: `Texte.\n\n![Capture du 20/10/2026](img:${ID})\n\n![Petite|s](img:${ID})\n\nSuite.`,
  image_en_ligne: `Une vignette ![logo](img:${ID}) au milieu de la phrase.`,
  citation_source: "Un fait établi[^abc-123] puis un autre[^def-456].",
  saut_de_ligne: "Première ligne\nseconde ligne du même paragraphe.",
};

for (const [name, text] of Object.entries(CANONICAL)) {
  test(`aller-retour identique : ${name}`, () => {
    assert.equal(docToBody(bodyToDoc(text)), text);
  });
}

test("les marques sont bien reconnues dans le document", () => {
  const doc = bodyToDoc(`a **b** ==c== {{${RED}|d}} {{~${BLUE}|e}}`);
  const paragraph = doc.content[0];
  const marks = (text: string) => paragraph.content?.find((node) => node.text === text)?.marks?.map((mark) => mark.type + JSON.stringify(mark.attrs ?? {}));
  assert.deepEqual(marks("b"), ["bold{}"]);
  assert.deepEqual(marks("c"), [`highlight{"color":"${DEFAULT_HIGHLIGHT}"}`]);
  assert.deepEqual(marks("d"), [`textStyle{"color":"${RED}"}`]);
  assert.deepEqual(marks("e"), [`highlight{"color":"${BLUE}"}`]);
});

test("des textes approximatifs se normalisent, puis restent stables (aucune dérive à chaque enregistrement)", () => {
  const messy = [
    "Titre sans ligne vide\n# Titre\ntexte collé\n- puce\n- puce deux\n1) numéroté\n> citation\ntexte",
    "  espaces **  gras avec espaces  ** fin",
    `**{{${RED}|a}}** et **gras *italique* gras** et ==x== ==y==`,
    "\n\n\nbeaucoup de lignes vides\n\n\n\nfin\n\n",
    "[[Lien]] [[Lien|affiché]] ![x|m](img:abc) ![y](img:def) [^zz]",
  ];
  for (const text of messy) {
    const once = docToBody(bodyToDoc(text));
    const twice = docToBody(bodyToDoc(once));
    assert.equal(twice, once, `instable : ${JSON.stringify(text)}`);
    assert.deepEqual(bodyToDoc(twice), bodyToDoc(once), `document différent : ${JSON.stringify(text)}`);
  }
});

test("une fiche vide donne un document avec un paragraphe vide, et l'inverse", () => {
  assert.deepEqual(bodyToDoc(""), { type: "doc", content: [{ type: "paragraph" }] });
  assert.equal(docToBody(bodyToDoc("")), "");
});

test("les espaces de bord restent hors des marques, sans quoi « * texte* » deviendrait une puce", () => {
  const doc = bodyToDoc("avant");
  doc.content = [
    {
      type: "paragraph",
      content: [{ type: "text", text: " italique ", marks: [{ type: "italic" }] }, { type: "text", text: "suite" }],
    },
  ];
  assert.equal(docToBody(doc), " *italique* suite");
  const lead = bodyToDoc("x");
  lead.content = [{ type: "paragraph", content: [{ type: "text", text: " tête", marks: [{ type: "italic" }] }] }];
  assert.ok(!docToBody(lead).startsWith("* "));
});

test("un paragraphe qui ressemble à un titre, une liste ou une citation reste un paragraphe", () => {
  for (const literal of ["# pas un titre", "- pas une puce", "1. pas une liste", "> pas une citation", "---"]) {
    const doc = bodyToDoc("x");
    doc.content = [{ type: "paragraph", content: [{ type: "text", text: literal }] }];
    const body = docToBody(doc);
    const back = bodyToDoc(body);
    assert.equal(back.content.length, 1, literal);
    assert.equal(back.content[0].type, "paragraph", literal);
    assert.equal(back.content[0].content?.map((node) => node.text).join("").replace(/​/g, ""), literal);
  }
});

test("une liste ne garde qu'une ligne par puce et une image reste seule sur sa ligne", () => {
  const doc = bodyToDoc("x");
  doc.content = [
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }] }] }] },
    { type: "imageBlock", attrs: { id: "i1", caption: "Légende | piégée]", size: "full" } },
  ];
  assert.equal(docToBody(doc), "- a b\n\n![Légende   piégée|full](img:i1)");
});
