import { generateCode } from "./accountProfile";
import { getSupabaseAdmin } from "./supabaseAdmin";

// IDcode des comptes (table `account_codes`, supabase/add-sharing.sql). Serveur uniquement. Le code d'un compte n'est jamais
// lu dans une requête : seuls le compte connecté et, plus tard, la vérification d'un partage (pseudo + code) y accèdent.

const MAX_ATTEMPTS = 6;

export async function getCode(ownerId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin().from("account_codes").select("code").eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { code: string } | null)?.code ?? null;
}

async function insertFreshCode(ownerId: string): Promise<string> {
  const admin = getSupabaseAdmin();
  let lastError = "";
  // Deux comptes ne peuvent pas avoir le même code (contrainte d'unicité) : en cas de collision rarissime, on retire un autre.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("account_codes").insert({ owner_id: ownerId, code });
    if (!error) return code;
    lastError = error.message;
    // Le compte a déjà un code (deux requêtes simultanées) : on garde celui qui existe.
    const existing = await getCode(ownerId);
    if (existing) return existing;
  }
  throw new Error(`Création de l'IDcode impossible : ${lastError}`);
}

/** L'IDcode du compte, créé à la première demande. */
export async function getOrCreateCode(ownerId: string): Promise<string> {
  return (await getCode(ownerId)) ?? (await insertFreshCode(ownerId));
}

/** Remplace l'IDcode du compte par un nouveau : l'ancien ne permet plus de lui partager quoi que ce soit. */
export async function regenerateCode(ownerId: string): Promise<string> {
  const admin = getSupabaseAdmin();
  let lastError = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    const { error } = await admin.from("account_codes").upsert({ owner_id: ownerId, code });
    if (!error) return code;
    lastError = error.message;
  }
  throw new Error(`Régénération de l'IDcode impossible : ${lastError}`);
}
