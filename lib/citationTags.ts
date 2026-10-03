// L'outil de recherche web insère des balises de citation (<cite index="…">)
// dans le texte généré. Elles n'ont pas leur place dans une synthèse affichée
// ni stockée : on retire toute balise HTML, en gardant le texte qu'elle entoure.
const TAG = new RegExp("</?[a-zA-Z][^>]*>", "g");

export function stripMarkup(text: string): string {
  return text.replace(TAG, "").replace(/ {2,}/g, " ").trim();
}
