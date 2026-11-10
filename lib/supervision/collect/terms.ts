// Supervision V1, Lot 4 : vocabulaire de la collecte. Module PUR, sans réseau ni IA.
// Il sert à (1) écrire les requêtes de recherche d'une Supervision, (2) vérifier qu'une publication correspond bien à son objectif
// et (3) lui attribuer un thème par mots-clés. Les listes sont volontairement courtes et lisibles : elles se corrigent à la main.

import type { Theme } from "../dashboard/state";

export type ThemeKey = Exclude<Theme, "all">;
export type Lang = "fr" | "en";

/** Termes qui, avec le pays, disent qu'une publication traite de l'objectif de la Supervision. */
export const OBJECTIVE_TERMS: Record<string, Record<Lang, readonly string[]>> = {
  securite: {
    fr: ["attaque", "attaques", "attentat", "attentats", "jihadistes", "enlèvement", "enlèvements", "affrontement", "affrontements", "armée", "militaire", "militaires", "soldats", "sécurité", "terroristes", "embuscade"],
    en: ["attack", "attacks", "jihadists", "kidnapping", "clashes", "army", "military", "soldiers", "security", "terrorists", "ambush"],
  },
  politique: {
    fr: ["gouvernement", "élection", "élections", "président", "présidentielle", "parlement", "opposition", "réforme", "ministre", "ministres", "coup d'État"],
    en: ["government", "election", "elections", "president", "parliament", "opposition", "reform", "minister", "coup"],
  },
  diplomatie: {
    fr: ["diplomatie", "diplomatique", "ambassade", "sommet", "accord", "accords", "relations bilatérales", "sanctions", "ambassadeur"],
    en: ["diplomacy", "embassy", "summit", "agreement", "bilateral", "sanctions", "ambassador"],
  },
  economie: {
    fr: ["économie", "économique", "sanctions", "inflation", "commerce", "pétrole", "budget", "dette", "croissance"],
    en: ["economy", "sanctions", "inflation", "trade", "oil", "budget", "debt", "growth"],
  },
  humanitaire: {
    fr: ["humanitaire", "réfugié", "réfugiés", "déplacé", "déplacés", "famine", "épidémie", "choléra", "inondations"],
    en: ["humanitarian", "refugees", "displaced", "famine", "outbreak", "cholera", "floods"],
  },
};

/**
 * FAITS : pour certains objectifs, un mot de SUJET (« sécurité », « armée ») ne suffit pas, car il fait entrer des articles qui parlent
 * du thème sans rapporter aucun événement (« partenariat de sécurité », « budget militaire »). Il faut au moins un mot de fait
 * (tués, enlevés, attaque, hommes armés, frappe, bilan…) ou le nom d'un groupe armé. Objectifs sans entrée ici : règle inchangée.
 */
export const FACT_TERMS: Record<string, Record<Lang, readonly string[]>> = {
  securite: {
    fr: ["attaque", "attaques", "attaqué", "attentat", "attentats", "tués", "tué", "tuée", "tuées", "morts", "bilan", "blessés", "enlevés", "enlevé", "enlèvement", "enlèvements", "otages", "embuscade", "affrontement", "affrontements", "combats", "frappe", "frappes", "bombardement", "bombardements", "fusillade", "explosion", "massacre", "offensive", "cessez-le-feu", "hommes armés", "bandits", "terroristes", "jihadistes", "insurgés", "violence", "violences"],
    en: ["attack", "attacks", "attacked", "killed", "kill", "kills", "killing", "killings", "dead", "deaths", "death toll", "wounded", "injured", "abducted", "abduct", "abducts", "kidnapped", "kidnapping", "kidnappings", "hostages", "gunmen", "bandits", "ambush", "clash", "clashes", "fighting", "airstrike", "airstrikes", "drone strike", "bomb", "bombing", "bombings", "explosion", "shooting", "massacre", "offensive", "ceasefire", "raid", "raids", "insurgents", "militants", "terrorists", "jihadists", "violence"],
  },
};

/** Groupes armés : leur nom seul vaut un fait (la publication doit toujours citer le pays de la zone). */
export const ARMED_GROUPS: readonly string[] = ["boko haram", "iswap", "lakurawa", "ansaru", "jnim", "isgs", "al shabaab", "al qaida", "al qaeda", "aqim", "islamic state", "état islamique", "wagner", "africa corps", "rapid support forces", "forces de soutien rapide", "mnla"];

/** Expressions qui contiennent un mot de l'objectif mais changent de sujet (« food security » n'est pas de la sécurité armée). */
export const OFFTOPIC_PHRASES: Record<string, readonly string[]> = {
  securite: ["food security", "sécurité alimentaire", "social security", "sécurité sociale", "cyber security", "cybersecurity", "cybersécurité", "energy security", "sécurité énergétique", "water security", "job security"],
};

/** Thème de repli quand le texte n'en désigne aucun : celui de l'objectif. */
export const THEME_OF_OBJECTIVE: Record<string, ThemeKey> = {
  securite: "securite",
  politique: "politique",
  diplomatie: "politique",
  economie: "politique",
  humanitaire: "humanitaire",
};

const THEME_WORDS: Record<ThemeKey, readonly string[]> = {
  conflits: ["affrontements", "combats", "offensive", "frappe", "frappes", "bombardement", "clashes", "airstrike", "shelling", "troops", "soldats", "armée", "army", "military", "militaires"],
  securite: ["attentat", "attaque", "attack", "enlèvement", "kidnapping", "terroristes", "terrorists", "jihadistes", "jihadists", "embuscade", "ambush", "bandits", "police", "sécurité", "security"],
  politique: ["gouvernement", "government", "élection", "election", "président", "president", "parlement", "parliament", "ministre", "minister", "diplomatie", "diplomacy", "sanctions", "accord", "agreement", "économie", "economy"],
  humanitaire: ["humanitaire", "humanitarian", "réfugiés", "refugees", "déplacés", "displaced", "famine", "épidémie", "outbreak", "choléra", "cholera", "inondations", "floods"],
};

/** Texte comparable : minuscules, sans accents ni ponctuation, entouré d'espaces pour ne comparer que des mots entiers. */
export function fold(text: string): string {
  return ` ${text
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

export function containsTerm(foldedText: string, term: string): boolean {
  const folded = fold(term).trim();
  return folded.length > 0 && foldedText.includes(` ${folded} `);
}

/** Thème d'après le texte : celui dont le plus de mots apparaissent (priorité aux conflits en cas d'égalité) ; sinon le repli. */
export function themeOfText(title: string, excerpt: string | null | undefined, fallback: ThemeKey): ThemeKey {
  const text = fold(`${title} ${excerpt ?? ""}`);
  let best: ThemeKey = fallback;
  let bestCount = 0;
  for (const theme of ["conflits", "securite", "humanitaire", "politique"] as ThemeKey[]) {
    const count = THEME_WORDS[theme].filter((word) => containsTerm(text, word)).length;
    if (count > bestCount) {
      best = theme;
      bestCount = count;
    }
  }
  return best;
}

/** Nom d'un pays dans une langue (Intl, sans table à tenir à jour). Retombe sur le code si le nom est inconnu. */
export function countryName(iso2: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
}
