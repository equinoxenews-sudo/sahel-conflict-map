import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CATEGORY_NOTES,
  ROOT_ID,
  ancestorsOf,
  childId,
  countTools,
  displayName,
  findNode,
  idsToReveal,
  layoutTree,
  pathNames,
  pickText,
  safeToolUrl,
  searchTree,
  toolFacts,
  type OsintNode,
} from "../lib/osintFramework";

const tree: OsintNode = {
  name: "OSINT Framework",
  type: "folder",
  children: [
    {
      name: "Username",
      type: "folder",
      children: [
        { name: "WhatsMyName Web", type: "url", url: "https://whatsmyname.app/", description: "Searches a username across 1500 sites.", pricing: "free", opsec: "passive" },
        { name: "Sherlock (T)", type: "url", url: "https://github.com/sherlock-project/sherlock", pricing: "free", opsec: "active", localInstall: true },
      ],
    },
    {
      name: "Dark Web",
      type: "folder",
      children: [
        { name: "Tor Search", type: "folder", children: [{ name: "Ahmia", type: "url", url: "https://ahmia.fi/", description: "Moteur de recherche Tor", status: "degraded" }] },
        { name: "Onion Cab", type: "url", url: "https://onion.cab/", status: "down", registration: true },
      ],
    },
    { name: "Training", type: "folder", children: [{ name: "Gralhix (R$)", type: "url", url: "https://gralhix.com/", pricing: "paid" }] },
  ],
};

test("les repères de fin de nom de l'original disparaissent de l'affichage, pas les parenthèses utiles", () => {
  assert.equal(displayName("Sherlock (T)"), "Sherlock");
  assert.equal(displayName("Gralhix (R$)"), "Gralhix");
  assert.equal(displayName("Outil (T, R)"), "Outil");
  assert.equal(displayName("Regrid (US Only)"), "Regrid (US Only)");
  assert.equal(displayName("SWITCH Internet Domains Whois (.ch)"), "SWITCH Internet Domains Whois (.ch)");
  assert.equal(displayName("(T)"), "(T)");
});

test("identifiants de position, ancêtres et retrouvailles d'un nœud", () => {
  assert.equal(childId(ROOT_ID, 2), "r.2");
  assert.deepEqual(ancestorsOf("r"), []);
  assert.deepEqual(ancestorsOf("r.1"), ["r"]);
  assert.deepEqual(ancestorsOf("r.1.0.0"), ["r", "r.1", "r.1.0"]);
  assert.equal(findNode(tree, "r.1.0.0")?.name, "Ahmia");
  assert.equal(findNode(tree, "r.9"), null);
  assert.equal(findNode(tree, "x.1"), null);
  assert.deepEqual(pathNames(tree, "r.1.0.0"), ["OSINT Framework", "Dark Web", "Tor Search", "Ahmia"]);
  assert.equal(countTools(tree), 5);
  assert.equal(countTools(tree.children![1]), 2);
});

test("placement : replié, seules les catégories du premier niveau sont visibles, une par ligne", () => {
  const layout = layoutTree(tree, new Set());
  assert.deepEqual(layout.nodes.map((n) => n.id).sort(), ["r", "r.0", "r.1", "r.2"]);
  const rows = layout.nodes.filter((n) => n.depth === 1).map((n) => n.y).sort((a, b) => a - b);
  assert.equal(new Set(rows).size, 3);
  assert.ok(rows[1] - rows[0] > 0);
  const root = layout.nodes.find((n) => n.id === "r")!;
  // La racine se centre sur ses enfants.
  assert.equal(root.y, (rows[0] + rows[2]) / 2);
  assert.equal(layout.links.length, 3);
});

test("placement : déplier une catégorie ajoute ses enfants à droite, sans chevauchement vertical", () => {
  const layout = layoutTree(tree, new Set(["r.1", "r.1.0"]));
  const ids = layout.nodes.map((n) => n.id);
  assert.ok(ids.includes("r.1.0.0") && ids.includes("r.1.1"));
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));
  assert.ok(byId.get("r.1.0.0")!.x > byId.get("r.1.0")!.x);
  assert.equal(byId.get("r.1.0.0")!.x - byId.get("r.1.0")!.x, 232);
  // Deux nœuds d'une même colonne ne sont jamais à la même hauteur.
  const seen = new Set<string>();
  for (const n of layout.nodes) {
    const key = `${n.depth}:${n.y}`;
    assert.ok(!seen.has(key), `chevauchement ${key}`);
    seen.add(key);
  }
  // Un nœud déplié est centré sur ses enfants visibles.
  const tor = byId.get("r.1.0")!;
  assert.equal(tor.y, byId.get("r.1.0.0")!.y);
  assert.ok(layout.height > layoutTree(tree, new Set()).height);
});

test("recherche : sans tenir compte des accents ni de la casse, nom d'abord, description ensuite", () => {
  assert.deepEqual(searchTree(tree, "w").map((h) => h.id), []);
  assert.equal(searchTree(tree, "SHERLOCK")[0].node.name, "Sherlock (T)");
  assert.equal(searchTree(tree, "dark")[0].node.name, "Dark Web");
  const text = searchTree(tree, "recherche tor");
  assert.equal(text[0].node.name, "Ahmia");
  assert.equal(text[0].rank, 2);
  const byName = searchTree(tree, "web");
  assert.ok(byName.every((hit) => hit.id !== ROOT_ID));
  assert.ok(byName[0].rank <= byName[byName.length - 1].rank);
});

test("recherche : un outil listé deux fois dans la même catégorie n'apparaît qu'une fois, mais reste visible dans deux catégories", () => {
  const twice: OsintNode = {
    name: "OSINT Framework",
    type: "folder",
    children: [
      { name: "A", type: "folder", children: [{ name: "Sherlock (T)", type: "url", url: "https://s.org/" }, { name: "Sherlock", type: "url", url: "https://s.org/" }] },
      { name: "B", type: "folder", children: [{ name: "Sherlock", type: "url", url: "https://s.org/" }] },
    ],
  };
  assert.deepEqual(searchTree(twice, "sherlock").map((hit) => hit.id).sort(), ["r.0.0", "r.1.0"]);
});

test("recherche : les catégories à déplier pour montrer les réponses", () => {
  const hits = searchTree(tree, "ahmia");
  assert.deepEqual([...idsToReveal(hits)].sort(), ["r", "r.1", "r.1.0"]);
  const layout = layoutTree(tree, idsToReveal(hits));
  assert.ok(layout.nodes.some((n) => n.id === "r.1.0.0"));
});

test("repères en français : prix, état, discrétion et contraintes", () => {
  const labels = (name: string) => toolFacts(findNode(tree, name)!).map((f) => f.label);
  assert.deepEqual(labels("r.0.0"), ["Gratuit", "Discret (passif)"]);
  assert.deepEqual(labels("r.0.1"), ["Gratuit", "Actif : peut laisser une trace chez la cible", "À installer en local"]);
  assert.deepEqual(labels("r.1.1"), ["Hors service", "Inscription requise"]);
  assert.deepEqual(labels("r.2.0"), ["Payant"]);
  assert.deepEqual(toolFacts(tree.children![0]), []);
});

test("seules les adresses web ordinaires sont ouvrables : jamais de javascript:, data: ou adresse invalide", () => {
  assert.equal(safeToolUrl("https://ahmia.fi/"), "https://ahmia.fi/");
  assert.equal(safeToolUrl("http://exemple.org/a?b=1"), "http://exemple.org/a?b=1");
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>1</script>", "vbscript:x", "ftp://x.org", "//x.org", "pas une adresse", "", undefined]) {
    assert.equal(safeToolUrl(bad), null, String(bad));
  }
});

test("textes : la traduction française l'emporte, sinon le texte d'origine, sinon rien", () => {
  const tool = findNode(tree, "r.0.0")!;
  const translations = { "https://whatsmyname.app/": { description: "Cherche un pseudo sur 1500 sites." } };
  assert.deepEqual(pickText(tool, "description", translations), { text: "Cherche un pseudo sur 1500 sites.", translated: true });
  assert.deepEqual(pickText(tool, "description", null), { text: "Searches a username across 1500 sites.", translated: false });
  assert.equal(pickText(tool, "bestFor", translations), null);
});

test("les données livrées : toutes les catégories du premier niveau ont leur explication en français", () => {
  const data = JSON.parse(readFileSync("public/data/osint-framework.json", "utf8")) as OsintNode;
  assert.equal(data.name, "OSINT Framework");
  assert.ok(countTools(data) > 1000);
  const missing = (data.children ?? []).map((c) => c.name).filter((name) => !CATEGORY_NOTES[name]);
  assert.deepEqual(missing, [], `catégories sans explication : ${missing.join(", ")}`);
  const unknown = Object.keys(CATEGORY_NOTES).filter((name) => !(data.children ?? []).some((c) => c.name === name));
  assert.deepEqual(unknown, [], `explications sans catégorie : ${unknown.join(", ")}`);
  // Chaque outil a une adresse web ordinaire, ou est marqué « sans lien » (bookmarklet) : jamais d'adresse exécutable.
  (function check(node: OsintNode) {
    if (node.type === "folder") node.children?.forEach(check);
    else if (node.noLink) assert.equal(node.url, undefined, node.name);
    else assert.match(node.url ?? "", /^https?:\/\//, node.name);
  })(data);
  assert.ok(!/javascript:|data:text\/html|vbscript:/i.test(readFileSync("public/data/osint-framework.json", "utf8")));
  // Le texte de la licence MIT accompagne les données.
  assert.match(readFileSync("public/data/osint-framework.LICENSE.txt", "utf8"), /MIT License[\s\S]*Justin Nordine/);
});

// --- Traduction française -------------------------------------------------------------------------------------

import {
  MAX_TRANSLATED_CHARS,
  buildTranslationPrompt,
  chunk,
  collectToTranslate,
  numberBatch,
  parseTranslationBatch,
} from "../lib/osintTranslate";

const toTranslate: OsintNode = {
  name: "OSINT Framework",
  type: "folder",
  children: [
    {
      name: "A",
      type: "folder",
      children: [
        { name: "Outil un", type: "url", url: "https://un.org/", description: "Finds things.", bestFor: "Quick checks", input: "Username", output: "Profiles" },
        { name: "Outil deux", type: "url", url: "https://deux.org/", description: "Looks up domains." },
        { name: "Sans texte", type: "url", url: "https://vide.org/" },
        { name: "Bookmarklet", type: "url", noLink: true, description: "Code only." },
      ],
    },
    { name: "B", type: "folder", children: [{ name: "Outil un (bis)", type: "url", url: "https://un.org/", description: "Finds things." }] },
  ],
};

test("traduction : un outil par adresse, ni les déjà traduits, ni ceux sans texte, ni ceux sans adresse", () => {
  const all = collectToTranslate(toTranslate);
  assert.deepEqual(all.map((item) => item.url), ["https://un.org/", "https://deux.org/"]);
  assert.deepEqual(Object.keys(all[0].fields).sort(), ["bestFor", "description", "input", "output"]);
  const remaining = collectToTranslate(toTranslate, { "https://un.org/": { description: "Trouve des choses." } });
  assert.deepEqual(remaining.map((item) => item.url), ["https://deux.org/"]);
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
});

test("traduction : le lot est numéroté, l'adresse ne part pas au modèle", () => {
  const batch = numberBatch(collectToTranslate(toTranslate));
  assert.deepEqual(batch.map((item) => item.id), [1, 2]);
  const prompt = buildTranslationPrompt(batch);
  assert.match(prompt, /"id":1/);
  assert.match(prompt, /Finds things\./);
  assert.ok(!prompt.includes("https://un.org/"), "l'adresse ne doit pas figurer dans le prompt");
});

test("traduction : la réponse est vérifiée champ par champ, le reste est écarté", () => {
  const batch = numberBatch(collectToTranslate(toTranslate));
  const good = parseTranslationBatch(
    '```json\n[{"id":1,"description":"Trouve des choses.","bestFor":"Vérifications rapides","input":"Pseudo","output":"Profils","intrus":"x"},{"id":2,"description":"Cherche des domaines.","output":"inventé"},{"id":99,"description":"inconnu"}]\n```',
    batch,
  );
  assert.deepEqual(good["https://un.org/"], { description: "Trouve des choses.", bestFor: "Vérifications rapides", input: "Pseudo", output: "Profils" });
  // Champ absent de la source : refusé même si le modèle l'a ajouté. Numéro inconnu : ignoré.
  assert.deepEqual(good["https://deux.org/"], { description: "Cherche des domaines." });
  assert.deepEqual(Object.keys(good).sort(), ["https://deux.org/", "https://un.org/"]);
});

test("traduction : textes trop longs, vides ou de mauvais type refusés ; réponse sans tableau en erreur", () => {
  const batch = numberBatch(collectToTranslate(toTranslate));
  const long = "x".repeat(MAX_TRANSLATED_CHARS + 1);
  const result = parseTranslationBatch(JSON.stringify([{ id: 1, description: long, bestFor: "  ", input: 5 }, { id: 2, description: "ok  \n  texte" }]), batch);
  assert.deepEqual(result, { "https://deux.org/": { description: "ok texte" } });
  assert.throws(() => parseTranslationBatch("désolé, je ne peux pas", batch), /tableau/);
  assert.throws(() => parseTranslationBatch("[{id:1,", batch));
});

test("traduction : le workflow existe, se lance à la main seulement et épingle l'image d'exécution", () => {
  const yml = readFileSync(".github/workflows/osint-framework-fr.yml", "utf8");
  assert.match(yml, /workflow_dispatch:/);
  assert.ok(!/^\s*schedule:/m.test(yml), "ce traitement payant ne doit jamais partir tout seul");
  assert.match(yml, /runs-on: ubuntu-24\.04/);
  assert.match(yml, /osint-framework\.fr\.json/);
});
