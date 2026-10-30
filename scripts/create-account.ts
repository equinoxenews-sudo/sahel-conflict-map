// Prépare la création d'un compte individuel : demande l'identifiant, l'offre et le mot de passe (saisi sans affichage,
// une « * » par caractère), puis AFFICHE la commande SQL à coller dans Supabase (SQL Editor). Le mot de passe n'est ni
// stocké ni affiché : seul son hachage salé apparaît dans la commande. À lancer dans TON terminal, jamais devant un tiers :
//
//   npx tsx scripts/create-account.ts
//
// Relancer le script avec un identifiant existant remplace son mot de passe (et son offre).
import { createInterface } from "node:readline";
import { accountInsertSql } from "../lib/accountSql";
import { MIN_PASSWORD_LENGTH, TIERS } from "../lib/accounts";

const interactive = Boolean(process.stdin.isTTY);

// Terminal (clavier) : lecture touche par touche, pour afficher des « * » à la place du mot de passe.
function askKeyboard(question: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const finish = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u0003") {
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (char >= " ") {
          value += char;
          process.stdout.write(hidden ? "*" : char);
        }
      }
    };
    stdin.on("data", onData);
  });
}

// Entrée redirigée (réponses déjà prêtes, tests) : les lignes sont mises en file et lues dans l'ordre.
const queued: string[] = [];
let waiting: ((line: string) => void) | null = null;
const rl = interactive ? null : createInterface({ input: process.stdin });
rl?.on("line", (line) => {
  if (waiting) {
    const resolve = waiting;
    waiting = null;
    resolve(line);
  } else queued.push(line);
});

function askQueued(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolve) => {
    const next = queued.shift();
    if (next !== undefined) resolve(next);
    else waiting = resolve;
  });
}

const ask = (question: string, hidden = false) => (interactive ? askKeyboard(question, hidden) : askQueued(question));

async function main() {
  const identifier = await ask("Identifiant (3 à 40 caractères : lettres, chiffres, . _ -) : ");
  const offers = TIERS.filter((tier) => tier !== "owner");
  const tier = (await ask(`Offre (${offers.join(" | ")}) [plus] : `)).trim() || "plus";
  const password = await ask(`Mot de passe (${MIN_PASSWORD_LENGTH} caractères au moins ; des * s'affichent pendant la saisie) : `, true);
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
  .finally(() => rl?.close());
