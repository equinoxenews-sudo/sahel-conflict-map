import type { Tier } from "../../accounts";
import type { SupervisionPolicy } from "./policy";

// Supervision V1, Lot 1 : droits d'un compte (offre, limites, dates). Décision D1 (09/11/2026) : pas de paiement pour l'instant,
// les droits sont posés à la main par le compte administrateur dans la table sv_entitlements ; mais la structure prévoit déjà
// dates de début et de fin, changements d'offre et périodes de grâce. Module pur, testé.

export interface EntitlementRow {
  plan: Tier;
  /** null = pas de surcharge : on prend la valeur de l'offre. */
  activeLimit: number | null;
  pausedLimit: number | null;
  creditLimit: number | null;
  /** Vrai : aucun plafond de créations / refontes (contrat sur mesure), quelle que soit l'offre. */
  creditUnlimited: boolean;
  effectiveAt: Date;
  /** null = sans échéance. */
  expiresAt: Date | null;
}

export type AccessMode = "full" | "read_only" | "none";
export type AccessReason = "plan_without_supervision" | "expired_grace" | "grace_ended";

export interface AccessProfile {
  plan: Tier;
  source: "entitlement" | "account";
  /** full : usage normal ; read_only : consultation et export pendant la période de grâce ; none : aucun accès. */
  mode: AccessMode;
  reason?: AccessReason;
  activeLimit: number;
  pausedLimit: number;
  /** null = sans plafond. */
  creditLimit: number | null;
  /** Fin de la lecture seule (résiliation, rétrogradation) ; null hors période de grâce. */
  readOnlyUntil: Date | null;
}

const DAY_MS = 86_400_000;

/**
 * Droits effectifs à l'instant `now`. Sans ligne de droits, l'offre du compte s'applique telle quelle (cas du fondateur et des
 * comptes créés à la main). Avec des lignes, la plus récente déjà en vigueur l'emporte ; une ligne échue ouvre une lecture seule de
 * `readOnlyGraceDays` jours (consultation et export, aucun traitement), puis plus rien. À l'EXPIRATION effective, pas au clic sur
 * « résilier » : tant que la période payée court, la ligne n'est pas échue.
 */
export function resolveAccess(accountTier: Tier, rows: readonly EntitlementRow[], policy: SupervisionPolicy, now: Date): AccessProfile {
  const inForce = rows.filter((row) => row.effectiveAt.getTime() <= now.getTime()).sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());
  const row = inForce[0];
  const plan = row?.plan ?? accountTier;
  const tier = policy.tiers[plan];

  const profile: AccessProfile = {
    plan,
    source: row ? "entitlement" : "account",
    mode: tier.supervisionAccess ? "full" : "none",
    reason: tier.supervisionAccess ? undefined : "plan_without_supervision",
    activeLimit: row?.activeLimit ?? tier.activeLimit,
    pausedLimit: row?.pausedLimit ?? tier.pausedLimit,
    creditLimit: row ? (row.creditUnlimited ? null : (row.creditLimit ?? tier.majorCreditsPerWindow)) : tier.majorCreditsPerWindow,
    readOnlyUntil: null,
  };

  if (row?.expiresAt && row.expiresAt.getTime() <= now.getTime()) {
    const graceEnd = new Date(row.expiresAt.getTime() + policy.readOnlyGraceDays * DAY_MS);
    if (now.getTime() < graceEnd.getTime()) return { ...profile, mode: "read_only", reason: "expired_grace", readOnlyUntil: graceEnd };
    return { ...profile, mode: "none", reason: "grace_ended", readOnlyUntil: graceEnd };
  }
  return profile;
}

/** L'offre autorise-t-elle encore des traitements (collecte, IA, alertes) ? Faux en lecture seule et sans accès. */
export function allowsProcessing(profile: AccessProfile): boolean {
  return profile.mode === "full";
}
