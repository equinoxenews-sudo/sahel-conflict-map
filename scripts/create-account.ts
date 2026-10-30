// Prépare la création d'un compte individuel : demande l'identifiant, l'offre et le mot de passe (saisi sans affichage),
// puis AFFICHE la commande SQL à coller dans Supabase (SQL Editor). Le mot de passe n'est ni stocké ni affiché : seul
// son hachage salé apparaît dans la commande. À lancer dans TON terminal, jamais devant un tiers :
//
//   npx tsx scripts/create-account.ts
//
// Relancer le script avec un identifiant existant remplace son mot de passe (et son offre).
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { accountInsertSql } from "../lib/accountSql";
import { MIN_PASSWORD_LENGTH, TIERS } from "../lib/accounts";

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

async function main() {
  const identifier = await ask("Identifiant (3 à 40 caractères : lettres, chiffres, . _ -) : ");
  const offers = TIERS.filter((tier) => tier !== "owner");
  const tier = (await ask(`Offre (${offers.join(" | ")}) [plus] : `)).trim() || "plus";
  const password = await ask(`Mot de passe (${MIN_PASSWORD_LENGTH} caractères au moins, non affiché) : `, true);
  const confirmation = await ask("Retape le mot de passe : ", true);

  // L'identifiant du fondateur est refusé : « Nicof » par défaut, ou ADMIN_USER si cette variable est réglée ici.
  const sql = accountInsertSql({ identifier, tier, password, confirmation }, ["Nicof", process.env.ADMIN_USER ?? ""]);
  console.log("\nÀ coller dans Supabase > SQL Editor, puis « Run » :\n");
  console.log(`${sql}\n`);
}

main()
  .catch((error: unknown) => {
    console.error(`\nÉchec : ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
