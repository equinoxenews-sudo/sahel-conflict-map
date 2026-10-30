import { isTier, normalizeIdentifier, verifyPassword, type Account } from "./accounts";
import { getSupabaseAdmin } from "./supabaseAdmin";

// Lecture des comptes individuels (table `accounts`, supabase/add-supervision.sql). La table n'est lisible que par la
// clé de service (serveur) : jamais depuis le navigateur.

interface AccountRow {
  identifier: string;
  display_name: string;
  password_hash: string;
  tier: string;
  timezone: string | null;
  disabled: boolean;
}

function toAccount(row: AccountRow): Account | null {
  if (!isTier(row.tier)) return null;
  return { id: row.identifier, name: row.display_name, tier: row.tier, timezone: row.timezone || "Europe/Paris" };
}

/**
 * Le compte dont l'identifiant et le mot de passe sont les bons, sinon null. Un compte suspendu, une table absente ou
 * une base injoignable donnent aussi null : la connexion du fondateur (ADMIN_PASSWORD) reste alors possible.
 */
export async function authenticate(identifier: unknown, password: unknown): Promise<Account | null> {
  if (typeof identifier !== "string" || typeof password !== "string" || !identifier.trim() || !password) return null;
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("accounts")
      .select("identifier, display_name, password_hash, tier, timezone, disabled")
      .eq("identifier", normalizeIdentifier(identifier))
      .maybeSingle();
    if (error || !data) return null;
    const row = data as AccountRow;
    if (row.disabled || !verifyPassword(password, row.password_hash)) return null;
    return toAccount(row);
  } catch {
    return null;
  }
}

/** Le compte tel qu'il est aujourd'hui en base (offre, suspension) : une session déjà ouverte ne contourne pas une suspension. */
export async function loadActiveAccount(id: string): Promise<Account | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("accounts")
      .select("identifier, display_name, password_hash, tier, timezone, disabled")
      .eq("identifier", id)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as AccountRow;
    return row.disabled ? null : toAccount(row);
  } catch {
    return null;
  }
}
