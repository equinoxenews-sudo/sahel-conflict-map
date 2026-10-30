// Qualité du français des textes générés par un modèle : règles à placer dans les consignes de rédaction, et détection des
// anglicismes les plus voyants dans un titre ou une accroche. Un mot francisé à partir de l'anglais (« brokérisé »), un faux ami ou un
// emploi inexact (« rafles » pour un recrutement forcé) décrédibilisent le site : le lecteur est francophone et attentif.
// Complète `englishLeak.ts` (mots anglais restés tels quels). Module pur.

/**
 * Bloc de consignes à insérer dans chaque prompt qui demande un texte français. Il donne des principes et des exemples, pas une liste
 * fermée : le modèle doit reformuler dès qu'une tournure lui paraît calquée sur l'anglais.
 */
export const FRENCH_STYLE_RULES = `QUALITÉ DE LA LANGUE (le lecteur est francophone et très attentif aux anglicismes) :
- Écris dans un français de presse sobre et naturel, comme un journaliste de la presse française (AFP, RFI, Le Monde). Aucun mot ni aucune tournure calqués sur l'anglais.
- N'invente jamais de verbe ni d'adjectif francisé à partir d'un mot anglais. Exemples à proscrire et leur équivalent : « brokérisé » (« obtenu sous la médiation de », « négocié par ») ; « impacter » (« toucher », « affecter ») ; « booster » (« stimuler », « relancer ») ; « implémenter » (« mettre en œuvre ») ; « adresser un problème » (« traiter », « répondre à ») ; « délivrer » au sens de « fournir » ; « sponsoriser » (« parrainer », « financer ») ; « challenger » (« contester »).
- Méfie-toi des faux amis : « actuellement » n'est pas « actually » (« en réalité »), « éventuellement » n'est pas « eventually » (« finalement »), « réaliser » n'est pas « se rendre compte », « prétendre » n'est pas « to pretend », « supporter » n'est pas « soutenir ».
- Choisis le terme français exact du domaine. Le recrutement ou la mobilisation de force se dit « enrôlement forcé », « conscription forcée », « mobilisation forcée » ; « rafle » ne désigne que des arrestations massives opérées par la police ou l'armée. Un « raid » aérien est une « frappe », un « raid » terrestre une « incursion » ; un « ceasefire » est un « cessez-le-feu », une « truce » une « trêve ».
- Si une expression te paraît traduite mot à mot, reformule la phrase en français courant plutôt que de la garder.
- Titres : verbes simples et précis, sans jargon ni raccourci télégraphique obscur.
- Seuls les noms propres, les sigles et les noms d'organisations ou de médias restent dans leur langue d'origine.`;

// Mots et tournures qui ne se rencontrent pas en français correct de presse. Liste volontairement courte et sûre (peu de faux
// positifs) : chaque entrée est un motif sans ambiguïté. Les emplois discutables mais courants ne figurent pas ici.
const FRANGLAIS: { pattern: RegExp; label: string }[] = [
  { pattern: /brok[ée]ri[sz]/iu, label: "brokérisé" },
  { pattern: /(?:^|[^\p{L}])brok[ée]r(?:er|é|ée|és|ées|ent|ant)(?=$|[^\p{L}])/iu, label: "broker" },
  { pattern: /(?:^|[^\p{L}])impact(?:er|é|ée|és|ées|e|es|ent|ant|era|erait)(?=$|[^\p{L}])/iu, label: "impacter" },
  { pattern: /(?:^|[^\p{L}])boost(?:er|é|ée|és|ées|e|es|ent|ant|era)(?=$|[^\p{L}])/iu, label: "booster" },
  { pattern: /(?:^|[^\p{L}])impl[ée]ment(?:er|é|ée|és|ées|e|es|ent|ant|era)(?=$|[^\p{L}])/iu, label: "implémenter" },
  { pattern: /(?:^|[^\p{L}])sponsori[sz](?:er|é|ée|és|ées|e|es|ent|ant|a)(?=$|[^\p{L}])/iu, label: "sponsoriser" },
  { pattern: /(?:^|[^\p{L}])adress(?:er|é|ée|ent|ant|e|a)\s+(?:le|la|les|ce|cette|ces)\s+(?:problème|problèmes|défi|défis|enjeu|enjeux|crise|crises)/iu, label: "adresser un problème" },
  { pattern: /(?:^|[^\p{L}])rafles?\s+(?:forcées?|de recrutement|pour le recrutement|pour recruter|de conscription)/iu, label: "rafle pour un recrutement" },
  { pattern: /(?:^|[^\p{L}])recrutement\s+par\s+rafles?(?=$|[^\p{L}])/iu, label: "rafle pour un recrutement" },
];

/** Le premier anglicisme voyant trouvé dans le texte (son libellé), ou null. */
export function findFranglais(text: string): string | null {
  for (const { pattern, label } of FRANGLAIS) if (pattern.test(text)) return label;
  return null;
}
