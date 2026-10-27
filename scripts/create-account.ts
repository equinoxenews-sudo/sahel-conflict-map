// Prépare la création d'un compte individuel : demande l'identifiant, l'offre et le mot de passe (saisi sans
// affichage), puis AFFICHE la commande SQL à coller dans Supabase (SQL Editor). Le mot de passe n'est ni stocké ni
// affiché : seul son hachage salé apparaît dans la commande.
//
//   npx tsx scripts/create-account.ts
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword, isTier, isValidIdentifier, MIN_PASSWORD_LENGTH, normalizeIdentifier, TIERS } from "../lib/accounts";

let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });

// Les lignes saisies sont mises en file : le script marche aussi bien au clavier qu'avec des réponses déjà prêtes.
const queued: string[] = [];
let waiting: ((line: string) => void) | null = null;
rl.on("line", (line) => {
  if (waiting) {
    const resolve = waiting;
    waiting = null;
    resolve(line);
  } else queued.push(line);
});

function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  muted = hidden;
  return new Promise((resolve) => {
    const done = (line: string) => {
      muted = false;
      if (hidden) process.stdout.write("\n");
      resolve(line);
    };
    const next = queued.shift();
    if (next !== undefined) done(next);
    else waiting = done;
  });
}

const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;

async function main() {
  const identifier = (await ask("Identifiant (3 à 40 caractères : lettres, chiffres, . _ -) : ")).trim();
  if (!isValidIdentifier(identifier)) throw new Error("Identifiant invalide.");
  const tierAnswer = (await ask(`Offre (${TIERS.join(" | ")}) [intelligence] : `)).trim() || "intelligence";
  if (!isTier(tierAnswer)) throw new Error("Offre inconnue.");
  const password = await ask(`Mot de passe (${MIN_PASSWORD_LENGTH} caractères au moins, non affiché) : `, true);
  const again = await ask("Retape le mot de passe : ", true);
  if (password !== again) throw new Error("Les deux mots de passe sont différents.");
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères au moins).`);

  const id = normalizeIdentifier(identifier);
  console.log("\nÀ coller dans Supabase > SQL Editor, puis « Run » :\n");
  console.log(
    `insert into accounts (identifier, display_name, password_hash, tier)\n` +
      `values (${sqlText(id)}, ${sqlText(identifier)}, ${sqlText(hashPassword(password))}, ${sqlText(tierAnswer)})\n` +
      `on conflict (identifier) do update set display_name = excluded.display_name, password_hash = excluded.password_hash, tier = excluded.tier;\n`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(`\nÉchec : ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
