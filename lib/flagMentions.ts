// Pays et organisations cités dans un texte (titre d'une synthèse, du bandeau LATEST…), pour afficher
// leurs drapeaux : tous ceux qui sont cités, dans l'ordre où ils apparaissent, et non plus seulement le premier.
// Module léger (liste des drapeaux de public/flags + alias courants), utilisable côté serveur comme navigateur.
import { FLAG_COUNTRIES } from "./countryFlagIndex";

export interface FlagMention {
  iso2: string;
  name: string;
}

/** Noms courants qui ne sont pas le nom officiel de l'index : abréviations, anciens noms, organisations. */
const ALIASES: Record<string, string[]> = {
  US: ["États-Unis", "Etats-Unis", "USA", "U.S.", "Etats Unis"],
  GB: ["Grande-Bretagne", "UK", "Angleterre"],
  CD: ["RDC", "RD Congo", "Congo-Kinshasa", "Congo Kinshasa"],
  CG: ["Congo-Brazzaville", "Congo Brazzaville"],
  CF: ["Centrafrique", "RCA"],
  CI: ["Cote d'Ivoire"],
  MM: ["Birmanie"],
  CZ: ["République tchèque", "Republique tcheque"],
  SZ: ["Swaziland"],
  TR: ["Türkiye", "Turkiye"],
  AE: ["EAU", "Emirats arabes unis"],
  KR: ["Corée du Sud", "Coree du Sud"],
  KP: ["Corée du Nord", "Coree du Nord"],
  TL: ["Timor-Leste"],
  VA: ["Vatican", "Saint-Siège"],
  PS: ["Territoires palestiniens", "Autorité palestinienne"],
  MK: ["Macédoine"],
  // Organisations qui ont leur drapeau : l'ONU et l'Union européenne (« Europe » dans un titre désigne le plus souvent l'UE).
  UN: ["ONU", "Nations unies", "Nations-Unies", "Conseil de sécurité", "Assemblée générale de l'ONU"],
  EU: ["UE", "Europe", "Commission européenne"],
};

/** Minuscules, sans accents, ponctuation et tirets réduits à des espaces : « Côte d'Ivoire » = « cote d ivoire ». */
export function foldForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

interface Entry {
  key: string;
  iso2: string;
  name: string;
}

const ENTRIES: Entry[] = (() => {
  const seen = new Set<string>();
  const entries: Entry[] = [];
  const add = (label: string, iso2: string, name: string) => {
    const key = foldForMatch(label);
    // Un mot trop court ou déjà pris par un autre pays n'est pas retenu (pas d'ambiguïté silencieuse).
    if (key.length < 2 || seen.has(key)) return;
    seen.add(key);
    entries.push({ key, iso2, name });
  };
  for (const country of FLAG_COUNTRIES) add(country.name, country.iso2, country.name);
  for (const [iso2, labels] of Object.entries(ALIASES)) {
    const country = FLAG_COUNTRIES.find((candidate) => candidate.iso2 === iso2);
    if (!country) continue;
    for (const label of labels) add(label, iso2, country.name);
  }
  // Les noms les plus longs d'abord : « Soudan du Sud » avant « Soudan », « Guinée-Bissau » avant « Guinée ».
  return entries.sort((a, b) => b.key.length - a.key.length);
})();

/**
 * Pays et organisations cités dans `text`, dans l'ordre d'apparition, sans doublon. `limit` borne le nombre de
 * drapeaux (une ligne de bandeau n'en porte que quelques-uns).
 */
export function flagsInText(text: string, limit = 3): FlagMention[] {
  let rest = ` ${foldForMatch(text)} `;
  const found: { index: number; iso2: string; name: string }[] = [];
  for (const entry of ENTRIES) {
    const needle = ` ${entry.key} `;
    let from = 0;
    for (;;) {
      const at = rest.indexOf(needle, from);
      if (at < 0) break;
      found.push({ index: at, iso2: entry.iso2, name: entry.name });
      // Le passage reconnu est masqué : un nom plus court qu'il contient ne compte pas une seconde fois.
      rest = `${rest.slice(0, at + 1)}${" ".repeat(entry.key.length)}${rest.slice(at + 1 + entry.key.length)}`;
      from = at + needle.length - 1;
    }
  }
  const unique: FlagMention[] = [];
  for (const mention of found.sort((a, b) => a.index - b.index)) {
    if (!unique.some((existing) => existing.iso2 === mention.iso2)) unique.push({ iso2: mention.iso2, name: mention.name });
  }
  return unique.slice(0, limit);
}
