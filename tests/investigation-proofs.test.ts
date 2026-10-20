import assert from "node:assert/strict";
import test from "node:test";
import { citationNumbers, citationToken, extractCitationIds, insertInline, replaceCitationIds, stripCitations } from "../lib/investigation/citations";
import { formatFileSize, PROOF_MAX_BYTES, proofMime, validateProofFile } from "../lib/investigation/fileStore";
import { parseInline } from "../lib/investigation/wikilinks";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

test("une citation s'écrit [^ID] et se relit", () => {
  assert.equal(citationToken(A), `[^${A}]`);
  const body = `Premier fait${citationToken(A)}. Autre fait${citationToken(B)}, déjà cité${citationToken(A)}.`;
  assert.deepEqual(extractCitationIds(body), [A, B]);
});

test("les numéros suivent l'ordre d'apparition, une source citée deux fois garde son numéro", () => {
  const body = `x${citationToken(B)} y${citationToken(A)} z${citationToken(B)}`;
  const numbers = citationNumbers(body);
  assert.equal(numbers.get(B), 1);
  assert.equal(numbers.get(A), 2);
});

test("un texte sans citation, ou avec d'autres crochets, n'en contient pas", () => {
  assert.deepEqual(extractCitationIds("Aucune [[Note]] ni [lien](https://x.org) ni ![img](img:abc)"), []);
});

test("l'import remplace les identifiants cités et laisse les inconnus", () => {
  const body = `a${citationToken(A)} b${citationToken(B)}`;
  assert.equal(replaceCitationIds(body, new Map([[A, "nouveau"]])), `a[^nouveau] b${citationToken(B)}`);
});

test("insertion au fil du texte, à la position du curseur", () => {
  const result = insertInline("Bonjour monde", 8, "[^x]");
  assert.equal(result.text, "Bonjour [^x]monde");
  assert.equal(result.next, 8 + 4);
  assert.equal(insertInline("Bonjour monde", 7, "[^x]").text, "Bonjour[^x] monde");
  assert.equal(insertInline("abc", 99, "[^x]").text, "abc[^x]");
});

test("le texte d'une note reconnaît une citation parmi les autres éléments", () => {
  const tokens = parseInline(`Voir [[Fiche]] et ce fait${citationToken(A)} avec **gras**.`);
  const cite = tokens.find((token) => token.type === "cite");
  assert.deepEqual(cite, { type: "cite", id: A });
  assert.ok(tokens.some((token) => token.type === "wiki"));
  assert.ok(tokens.some((token) => token.type === "bold"));
});

test("types de documents acceptés : PDF et images", () => {
  assert.equal(proofMime({ name: "arrete.pdf", type: "application/pdf" }), "application/pdf");
  assert.equal(proofMime({ name: "photo.JPG", type: "" }), "image/jpeg");
  assert.equal(proofMime({ name: "capture.png", type: "image/png" }), "image/png");
  assert.equal(proofMime({ name: "tableau.xlsx", type: "application/vnd.ms-excel" }), null);
  assert.equal(proofMime({ name: "script.exe", type: "" }), null);
});

test("validation d'un document-preuve : format, vide, trop lourd", () => {
  assert.equal(validateProofFile({ name: "a.pdf", type: "application/pdf", size: 1234 }), null);
  assert.match(validateProofFile({ name: "a.docx", type: "", size: 10 }) ?? "", /Format non pris en charge/);
  assert.match(validateProofFile({ name: "a.pdf", type: "application/pdf", size: 0 }) ?? "", /vide/);
  assert.match(validateProofFile({ name: "a.pdf", type: "application/pdf", size: PROOF_MAX_BYTES + 1 }) ?? "", /trop lourd/);
  assert.equal(validateProofFile({ name: "a.pdf", type: "application/pdf", size: PROOF_MAX_BYTES }), null);
});

test("taille lisible", () => {
  assert.equal(formatFileSize(500), "500 o");
  assert.equal(formatFileSize(2048), "2 Ko");
  assert.equal(formatFileSize(1.5 * 1024 * 1024), "1,5 Mo");
});

test("les anciens repères de citation se retirent du texte sans toucher au reste", () => {
  const body = `${citationToken(A)}En 2023, les dossiers sont déposés à Tanguiéta${citationToken(B)}. Suite [[Fiche]] **gras**.`;
  assert.equal(stripCitations(body), "En 2023, les dossiers sont déposés à Tanguiéta. Suite [[Fiche]] **gras**.");
  assert.equal(stripCitations("Aucun repère ici"), "Aucun repère ici");
});
