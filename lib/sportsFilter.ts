// Le site traite de sécurité et de géopolitique : le sport n'y a pas sa place.
// Un nom de pays seul laisse passer ces articles (« L'Irlande bat Israël »
// contient « Israël »), d'où ce filtre à chaque étape : collecte des articles,
// synthèses, points de situation et affichage.
//
// Les mots ambigus en géopolitique sont volontairement absents (« match »,
// « supporters », « transfert de », « euro 20… ») : mieux vaut laisser passer
// un article de sport que bloquer un article de politique.
const SPORTS_SCORELINE = /\b\d{1,2}\s*-\s*\d{1,2}\b/;

const SPORTS_KEYWORDS = [
  // Disciplines
  "football", "soccer", "rugby", "tennis", "basketball", "handball", "volley-ball",
  "athlétisme", "cyclisme", "natation", "formule 1", "grand prix de", "boxe",
  // Compétitions
  "jeux olympiques", " jo ", "coupe du monde", "ligue des champions", "ligue des nations",
  "ligue europa", "ligue 1", "ligue 2", "premier league", "bundesliga", "serie a",
  "nations league", "champions league", "europa league", "world cup",
  "coupe d'afrique des nations", "championnat", "éliminatoires", "tournoi de",
  "roland-garros", "wimbledon", "tour de france",
  // Vocabulaire du match
  "buteur", "gardien de but", "carton rouge", "carton jaune", "penalty", "mi-temps",
  "sélectionneur", "entraîneur", "fifa", "uefa", "ballon d'or", "match nul",
  "s'impose face à", "l'emporte face à", "hooligans", "mercato",
];

/** Titre sportif : mot-clé de discipline, de compétition ou de match, ou score
 * du type « 1-1 ». À réserver aux titres (le score est trop ambigu dans un texte). */
export function isSportsTitle(title: string): boolean {
  const lower = ` ${title.toLowerCase()} `;
  return SPORTS_KEYWORDS.some((keyword) => lower.includes(keyword)) || SPORTS_SCORELINE.test(lower);
}

/** Texte plus long (résumé, événement) : mots-clés sportifs uniquement. */
export function isSportsText(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return SPORTS_KEYWORDS.some((keyword) => lower.includes(keyword));
}
