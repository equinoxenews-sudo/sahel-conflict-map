// Détection d'un mot anglais resté dans un titre ou une accroche rédigés en français (« deepening du partenariat »).
// Liste volontairement courte et sûre : uniquement des mots qui n'existent pas en français et n'entrent pas dans un nom
// propre courant (« Bank of Africa » ou « The Times of Israel » ne doivent jamais être écartés). Module pur.

const ENGLISH_WORDS = [
  "amid",
  "deepening",
  "deepens",
  "strengthening",
  "strengthens",
  "boosting",
  "boosts",
  "expanding",
  "expands",
  "escalating",
  "escalates",
  "urges",
  "vows",
  "slams",
  "pledges",
  "warns",
  "says",
  "ahead",
  "despite",
  "amidst",
  "launches",
  "unveils",
  "withdraws",
  "crackdown",
];

const PATTERN = new RegExp(`(?:^|[^\\p{L}])(${ENGLISH_WORDS.map((word) => word.replace(/\s+/g, "\\s+")).join("|")})(?=$|[^\\p{L}])`, "iu");

/** Le premier mot anglais trouvé dans le texte, ou null. */
export function findEnglishWord(text: string): string | null {
  const match = PATTERN.exec(text);
  return match ? match[1].toLowerCase() : null;
}
