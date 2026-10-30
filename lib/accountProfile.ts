import type { Tier } from "./accounts";

// Profil d'un compte : libellé de l'accès et IDcode. Module pur (testé dans tests/account-profile.test.ts).
// L'IDcode est ce que l'on communique, avec son pseudo, à quelqu'un qui veut nous partager un dossier ou un graph.

const TIER_LABELS: Record<Tier, string> = {
  owner: "Superadmin",
  plus: "Plus",
  intelligence: "Intelligence",
  pro: "Pro",
  enterprise: "Entreprise",
};

/** Libellé d'accès affiché dans le profil. « owner » (le compte du fondateur) s'affiche « Superadmin ». */
export function tierLabel(tier: Tier): string {
  return TIER_LABELS[tier];
}

/** Sans 0/O, 1/I/L : jamais de confusion quand on recopie un code. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

/** Un nouvel IDcode : 8 caractères tirés au hasard (cryptographique) dans l'alphabet sans ambiguïté. */
export function generateCode(random: (max: number) => number = randomIndex): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return code;
}

function randomIndex(max: number): number {
  // Rejet des valeurs qui fausseraient la répartition (256 n'est pas un multiple de 31).
  const limit = 256 - (256 % max);
  const bytes = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(bytes);
    if (bytes[0] < limit) return bytes[0] % max;
  }
}

/** Forme affichée : « #78DG4HB5 ». */
export function formatCode(code: string): string {
  return `#${code}`;
}

/** Ce que l'utilisateur a tapé (avec ou sans #, en minuscules, avec espaces) ramené à la forme stockée ; null si ce n'est pas un IDcode. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().replace(/^#/, "").replace(/[\s-]/g, "").toUpperCase();
  return code.length === CODE_LENGTH && [...code].every((char) => CODE_ALPHABET.includes(char)) ? code : null;
}
