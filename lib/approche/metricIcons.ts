// Pictogramme d'une valeur d'après sa clé d'observation (ou son libellé) : ni décoratif ni statistique, il aide seulement à
// repérer la nature de l'indicateur. Une clé inconnue donne un point neutre.
const RULES: [RegExp, string][] = [
  [/population|habitants|demography/, "users"],
  [/gdp_per_capita|par habitant/, "coins"],
  [/gdp_growth|croissance/, "trend"],
  [/gdp|pib|value_added|valeur ajout/, "coins"],
  [/inflation/, "chart"],
  [/unemploy|ch[ôo]mage/, "users"],
  [/debt|dette/, "scale"],
  [/capital|capitale/, "landmark"],
  [/regime|r[ée]gime|head_of|chef|premier/, "building"],
  [/language|langue/, "book"],
  [/currency|monnaie/, "coins"],
  [/area|superficie/, "map"],
  [/research|recherche/, "flask"],
  [/electricity|energy|[ée]nergie|d[ée]pendance/, "bolt"],
  [/institutions|nato|otan|unsc|g7|g20|oecd|oif|eu_|euro|schengen|union|onu/, "globe"],
  [/militaire|effectif|personnel|r[ée]serv/, "shield"],
  [/budget|d[ée]fense/, "shield"],
];

export function iconForMetric(keyOrLabel: string): string {
  const text = keyOrLabel.toLowerCase();
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? "dot";
}

const TOPIC_RULES: [RegExp, string][] = [
  [/arm[ée]e de l.air|force a[ée]rienne|espace/, "plane"],
  [/a[ée]ronaut|spatial|avion|chasseur|a[ée]rien/, "plane"],
  [/nucl[ée]aire|uranium|atom/, "atom"],
  [/[ée]nergie|[ée]lectric/, "bolt"],
  [/automobile|v[ée]hicule/, "car"],
  [/agroalim|agricol|c[ée]r[ée]ale|ferme/, "wheat"],
  [/pharma|sant[ée]|m[ée]dic/, "flask"],
  [/luxe|consommation|minerai|gemme/, "gem"],
  [/hydrocarbure|p[ée]trole|gaz|carburant/, "fuel"],
  [/bois|for[êe]t/, "tree"],
  [/maritime|mer|navire|frégate|porte-avions|marine|sous-marin/, "ship"],
  [/char|blind[ée]|terre/, "tank"],
  [/artillerie|canon/, "cannon"],
  [/cyber|num[ée]rique|donn[ée]es|cloud/, "server"],
  [/semi|puce|technolog|intelligence artificielle/, "chip"],
  [/climat|environnement|inondation|incendie/, "leaf"],
  [/infrastructure|transport|rail/, "train"],
  [/social|soci[ée]t[ée]|cohésion/, "users"],
  [/s[ée]curit[ée]|terror|d[ée]fense|arm[ée]e/, "shield"],
  [/macro|[ée]conomi|budget|dette/, "coins"],
  [/diplomatie|relation|europe|union|alliance/, "handshake"],
];

/** Pictogramme d'un sujet éditorial (secteur, ressource, équipement, domaine) d'après son titre ; `factory` par défaut. */
export function iconForTopic(title: string, fallback = "factory"): string {
  const text = title.toLowerCase();
  return TOPIC_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? fallback;
}
