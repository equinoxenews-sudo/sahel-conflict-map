import assert from "node:assert/strict";
import test from "node:test";
import { formatSelection, TEXT_COLORS } from "../lib/investigation/textFormat";

const RED = "#e5484d";
const pick = (text: string, word: string) => {
  const start = text.indexOf(word);
  return { start, end: start + word.length };
};

test("gras, italique et surlignage entourent le passage sélectionné", () => {
  const text = "Il a rejoint le parc en 2020.";
  const { start, end } = pick(text, "le parc");
  assert.equal(formatSelection(text, start, end, "bold")?.text, "Il a rejoint **le parc** en 2020.");
  assert.equal(formatSelection(text, start, end, "italic")?.text, "Il a rejoint *le parc* en 2020.");
  assert.equal(formatSelection(text, start, end, "mark")?.text, "Il a rejoint ==le parc== en 2020.");
  assert.equal(formatSelection(text, start, end, "color", RED)?.text, `Il a rejoint {{${RED}|le parc}} en 2020.`);
});

test("la sélection reste sur le texte (sans les marques) pour enchaîner", () => {
  const text = "un mot clé ici";
  const { start, end } = pick(text, "mot clé");
  const first = formatSelection(text, start, end, "bold");
  assert.ok(first);
  assert.equal(first.text.slice(first.start, first.end), "mot clé");
  const second = formatSelection(first.text, first.start, first.end, "italic");
  assert.equal(second?.text, "un ***mot clé*** ici");
});

test("la même commande défait la mise en forme, que les marques soient dans ou autour de la sélection", () => {
  assert.equal(formatSelection("a **b** c", 4, 5, "bold")?.text, "a b c");
  assert.equal(formatSelection("a **b** c", 2, 7, "bold")?.text, "a b c");
  assert.equal(formatSelection("a ==b== c", 4, 5, "mark")?.text, "a b c");
  assert.equal(formatSelection("a *b* c", 3, 4, "italic")?.text, "a b c");
});

test("gras et italique se distinguent : ajouter l'un à l'autre, retirer l'un des deux", () => {
  assert.equal(formatSelection("a **b** c", 4, 5, "italic")?.text, "a ***b*** c");
  assert.equal(formatSelection("a *b* c", 3, 4, "bold")?.text, "a ***b*** c");
  assert.equal(formatSelection("a ***b*** c", 5, 6, "bold")?.text, "a *b* c");
  assert.equal(formatSelection("a ***b*** c", 5, 6, "italic")?.text, "a **b** c");
});

test("couleur : une autre couleur remplace la première, la même la retire", () => {
  const blue = "#3b8eea";
  const colored = `a {{${RED}|b}} c`;
  const b = colored.indexOf("b");
  assert.equal(formatSelection(colored, b, b + 1, "color", blue)?.text, `a {{${blue}|b}} c`);
  assert.equal(formatSelection(colored, b, b + 1, "color", RED)?.text, "a b c");
  assert.equal(formatSelection("a b c", 2, 3, "color", "rouge"), null);
});

test("les espaces en bord de sélection restent dehors, rien de sélectionné ne change rien", () => {
  assert.equal(formatSelection("un mot ici", 2, 7, "bold")?.text, "un **mot** ici");
  assert.equal(formatSelection("un mot ici", 3, 3, "bold"), null);
  assert.equal(formatSelection("un mot ici", 2, 3, "bold"), null);
});

test("sur plusieurs lignes, chaque ligne a ses marques", () => {
  const text = "ligne un\n\nligne deux";
  const result = formatSelection(text, 0, text.length, "mark");
  assert.equal(result?.text, "==ligne un==\n\n==ligne deux==");
  // et la même commande les retire
  const back = formatSelection(result!.text, result!.start, result!.end, "mark");
  assert.equal(back?.text, text);
});

test("effacer la mise en forme retire toutes les marques du passage", () => {
  const text = `Voir **{{${RED}|le *parc*}}** ici`;
  const { start, end } = pick(text, `**{{${RED}|le *parc*}}**`);
  const result = formatSelection(text, start, end, "clear");
  assert.equal(result?.text, "Voir le parc ici");
});

test("les couleurs proposées sont des codes valides", () => {
  for (const entry of TEXT_COLORS) assert.match(entry.color, /^#[0-9a-f]{6}$/i);
});

test("le texte relit les nouvelles marques : surligné, couleur, gras+italique, et leurs combinaisons", async () => {
  const { parseInline } = await import("../lib/investigation/wikilinks");
  const tokens = parseInline(`a ==surligné== b {{${RED}|rouge}} c ***fort*** d **{{${RED}|gras rouge}}**`);
  assert.deepEqual(
    tokens.map((token) => token.type),
    ["text", "mark", "text", "color", "text", "bolditalic", "text", "bold"]
  );
  const color = tokens.find((token) => token.type === "color");
  assert.deepEqual(color && "color" in color ? [color.color, color.text] : null, [RED, "rouge"]);
  const bold = tokens.find((token) => token.type === "bold");
  // le contenu du gras est relu à l'affichage : il contient ici une couleur
  assert.ok(bold && "text" in bold && parseInline(bold.text).some((token) => token.type === "color"));
});
