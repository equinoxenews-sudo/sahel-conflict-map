import { hashPassword, isTier, isValidIdentifier, MIN_PASSWORD_LENGTH, normalizeIdentifier, type Tier } from "./accounts";

// Création d'un compte individuel : le SQL d'insertion que Nicolas colle dans Supabase. Module pur (testé dans
// tests/account-sql.test.ts), appelé par scripts/create-account.ts. Le mot de passe n'apparaît jamais dans le résultat :
// seul son hachage salé (scrypt) y figure.

/** Identifiant refusé : celui du fondateur appartient à son compte (variable ADMIN_USER, « Nicof » par défaut). */
export function isFounderIdentifier(identifier: string, founderIds: readonly string[]): boolean {
  const id = normalizeIdentifier(identifier);
  return founderIds.some((founder) => normalizeIdentifier(founder) === id);
}

const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;

export interface NewAccount {
  identifier: string;
  tier: string;
  password: string;
  confirmation: string;
}

/**
 * Le SQL qui crée (ou remet à jour) un compte. Lève une erreur au message lisible si une saisie est invalide : identifiant
 * mal formé ou celui du fondateur, offre inconnue ou « owner », mots de passe différents ou trop courts.
 */
export function accountInsertSql(input: NewAccount, founderIds: readonly string[], hash: (password: string) => string = hashPassword): string {
  const identifier = input.identifier.trim();
  if (!isValidIdentifier(identifier)) throw new Error("Identifiant invalide (3 à 40 caractères : lettres, chiffres, . _ -).");
  if (isFounderIdentifier(identifier, founderIds)) throw new Error("Cet identifiant est celui du compte fondateur : choisis-en un autre.");
  if (!isTier(input.tier)) throw new Error("Offre inconnue.");
  const tier: Tier = input.tier;
  if (tier === "owner") throw new Error("L'offre « owner » est celle du compte fondateur : elle ne se donne pas à un compte individuel.");
  if (input.password !== input.confirmation) throw new Error("Les deux mots de passe sont différents.");
  if (input.password.length < MIN_PASSWORD_LENGTH) throw new Error(`Mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères au moins).`);

  const id = normalizeIdentifier(identifier);
  return (
    `insert into accounts (identifier, display_name, password_hash, tier)\n` +
    `values (${sqlText(id)}, ${sqlText(identifier)}, ${sqlText(hash(input.password))}, ${sqlText(tier)})\n` +
    `on conflict (identifier) do update set display_name = excluded.display_name, password_hash = excluded.password_hash, tier = excluded.tier;`
  );
}
