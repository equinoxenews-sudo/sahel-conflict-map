// Prépare les données de la carte des outils (Mon espace > Outils) à partir de l'OSINT Framework.
//
//   node scripts/gen-osint-framework.mjs [chemin/vers/arf.json]
//
// Sans argument, le fichier est téléchargé depuis le dépôt d'origine (https://github.com/lockfale/osint-framework,
// licence MIT, © 2017 Justin Nordine). Le résultat, plus léger que l'original (les valeurs vides et les « faux »
// sont retirés), est écrit dans public/data/osint-framework.json avec le texte de la licence à côté.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE = "https://raw.githubusercontent.com/lockfale/osint-framework/master";
const OUT_DIR = path.resolve("public/data");

async function load(file, remote) {
  if (file) return readFile(file, "utf8");
  const res = await fetch(`${SOURCE}/${remote}`);
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status}) : ${remote}`);
  return res.text();
}

const TEXT_FIELDS = ["url", "description", "pricing", "bestFor", "input", "output", "opsecNote"];
const FLAG_FIELDS = ["localInstall", "googleDork", "registration", "editUrl", "api", "invitationOnly", "deprecated"];

function compact(node) {
  // Quelques catégories de l'original n'ont pas de « type » (Cyber Threat Intelligence et ses sous-catégories) :
  // un nœud qui a des enfants est une catégorie, quel que soit son type.
  const isFolder = node.type === "folder" || Array.isArray(node.children);
  const out = { name: String(node.name), type: isFolder ? "folder" : "url" };
  if (out.type === "folder") {
    out.children = (node.children ?? []).map(compact);
    return out;
  }
  for (const field of TEXT_FIELDS) {
    const value = typeof node[field] === "string" ? node[field].trim() : "";
    if (!value) continue;
    // Quelques « outils » de l'original sont des bookmarklets (« javascript:… ») : ce serait du code exécutable,
    // jamais un lien. Seules les adresses web ordinaires sont conservées ; les autres sont signalées « noLink ».
    if (field === "url" && !/^https?:\/\//i.test(value)) {
      out.noLink = true;
      continue;
    }
    out[field] = value;
  }
  if (["live", "degraded", "down", "defunct"].includes(node.status) && node.status !== "live") out.status = node.status;
  if (node.opsec === "active" || node.opsec === "passive") out.opsec = node.opsec;
  for (const flag of FLAG_FIELDS) if (node[flag] === true) out[flag] = true;
  return out;
}

const raw = JSON.parse(await load(process.argv[2], "public/arf.json"));
const tree = compact(raw);
let folders = 0;
let tools = 0;
(function count(node) {
  if (node.type === "folder") {
    folders += 1;
    node.children.forEach(count);
  } else tools += 1;
})(tree);

await mkdir(OUT_DIR, { recursive: true });
const json = JSON.stringify(tree);
await writeFile(path.join(OUT_DIR, "osint-framework.json"), json);
const license = process.argv[3] ? await readFile(process.argv[3], "utf8") : await load(undefined, "LICENSE");
await writeFile(path.join(OUT_DIR, "osint-framework.LICENSE.txt"), license);
console.log(`OSINT Framework : ${folders} catégories, ${tools} outils, ${(json.length / 1024).toFixed(0)} Ko.`);
