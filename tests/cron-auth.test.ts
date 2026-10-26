import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { isAuthorizedCron } from "../lib/cronAuth";

test("le bon secret passe, un autre non", () => {
  assert.equal(isAuthorizedCron("Bearer s3cret-value", "s3cret-value"), true);
  assert.equal(isAuthorizedCron("Bearer s3cret-valuE", "s3cret-value"), false);
  assert.equal(isAuthorizedCron("Bearer s3cret", "s3cret-value"), false);
  assert.equal(isAuthorizedCron("s3cret-value", "s3cret-value"), false);
  assert.equal(isAuthorizedCron(null, "s3cret-value"), false);
  assert.equal(isAuthorizedCron("", "s3cret-value"), false);
});

test("sans secret défini, tout est refusé, y compris « Bearer undefined » et « Bearer »", () => {
  for (const secret of [undefined, "", "   "]) {
    assert.equal(isAuthorizedCron("Bearer undefined", secret), false);
    assert.equal(isAuthorizedCron("Bearer ", secret), false);
    assert.equal(isAuthorizedCron("Bearer", secret), false);
    assert.equal(isAuthorizedCron("Bearer null", secret), false);
    assert.equal(isAuthorizedCron(null, secret), false);
  }
});

test("un secret collé avec des espaces autour reste utilisable", () => {
  assert.equal(isAuthorizedCron("Bearer abc123", " abc123\n"), true);
});

test("aucune route ne compare plus l'en-tête à « Bearer ${CRON_SECRET} » : toutes passent par isAuthorizedCron", () => {
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "route.ts") routes.push(full);
    }
  };
  walk("app/api");
  const protectedRoutes = routes.filter((file) => readFileSync(file, "utf8").includes("CRON_SECRET") || readFileSync(file, "utf8").includes("isAuthorizedCron"));
  assert.ok(protectedRoutes.length >= 7, `routes protégées trouvées : ${protectedRoutes.length}`);
  for (const file of protectedRoutes) {
    const source = readFileSync(file, "utf8");
    assert.ok(!source.includes("`Bearer ${process.env.CRON_SECRET}`"), `${file} compare encore l'en-tête à la main`);
    assert.ok(source.includes("isAuthorizedCron"), `${file} n'utilise pas isAuthorizedCron`);
  }
});

test("les workflows épinglent l'image d'exécution au lieu de suivre « latest »", () => {
  const dir = ".github/workflows";
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".yml"))) {
    const source = readFileSync(path.join(dir, name), "utf8");
    assert.ok(!source.includes("ubuntu-latest"), `${name} utilise encore ubuntu-latest`);
    assert.match(source, /runs-on: ubuntu-24\.04/, name);
  }
});

test("le fichier d'exemple d'environnement liste les variables indispensables et aucune valeur réelle", () => {
  const example = readFileSync(".env.local.example", "utf8");
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET", "ANTHROPIC_API_KEY", "GITHUB_DISPATCH_TOKEN", "ADMIN_PASSWORD", "AI_BUDGET_MONTHLY_USD"]) {
    assert.match(example, new RegExp(`^#?\\s*${name}=`, "m"), name);
  }
  // Les anciens seuils fixes ne sont plus lus par le code.
  assert.ok(!/AI_BUDGET_(WARN|STOP|HARD)_USD/.test(example));
  assert.ok(!/sk-ant-|eyJ[A-Za-z0-9]{20,}/.test(example));
});
