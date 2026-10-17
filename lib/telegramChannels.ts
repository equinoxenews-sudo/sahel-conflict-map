/**
 * Canaux Telegram publics suivis, fournis par Nicolas le 17 octobre 2026.
 * Lus via leur page web publique (https://t.me/s/<canal>), sans compte ni clé.
 *
 * Ce sont des sources COMPLÉMENTAIRES : elles étoffent les synthèses tirées de
 * la presse. Plusieurs sont des canaux d'acteurs ou de propagande (notamment
 * pro-russes) : précieux pour repérer tôt une information ou une revendication,
 * jamais suffisants seuls pour conclure à « Confirmé ».
 *
 * zone null : canal généraliste (« Monde ») ; chaque message est rattaché à la
 * zone dont il cite un pays (lib/zoneKeywords.ts).
 *
 * Sans page publique au 17/10/2026 (non collectés) : afric_ylblka, KorpusAfrica,
 * wagnernew, middleeasteye, france24ar, asharqalawsat, lbcilebanon, skynewsarabia.
 * Seuls les canaux des zones activées (ANALYST_V2_ZONES) sont lus.
 */
export interface TelegramChannel {
  handle: string;
  zone: string | null;
  /** Ligne éditoriale connue, transmise à l'analyste pour juger la fiabilité. */
  note: string;
}

export const TELEGRAM_CHANNELS: TelegramChannel[] = [
  // Afrique
  { handle: "departamente", zone: "afrique", note: "canal d'information africain, à recouper" },
  { handle: "africaninitiative", zone: "afrique", note: "African Initiative, média lié à l'État russe : narratif pro-russe" },
  { handle: "afriqueintel", zone: "afrique", note: "veille sécuritaire africaine, à recouper" },
  { handle: "allafrica", zone: "afrique", note: "agrégateur de presse africaine" },
  { handle: "rusambben", zone: "afrique", note: "canal diplomatique russe : communication officielle d'une partie" },
  // Amérique latine
  { handle: "meriblood", zone: "amerique-du-sud", note: "veille sécuritaire Amérique latine, à recouper" },
  // Moyen-Orient
  { handle: "almayadeen", zone: "moyen-orient", note: "Al Mayadeen, ligne proche de l'axe iranien" },
  { handle: "ajmubasher", zone: "moyen-orient", note: "Al Jazeera Mubasher, direct régional" },
  { handle: "me_observer_TG", zone: "moyen-orient", note: "Middle East Observer, relais de publications, à recouper" },
  { handle: "iranintltv", zone: "moyen-orient", note: "Iran International, média d'opposition iranienne" },
  { handle: "timesofisrael", zone: "moyen-orient", note: "The Times of Israel, presse israélienne" },
  // Indopacifique
  { handle: "taiwanintel", zone: "indopacifique", note: "veille Taïwan et sécurité régionale" },
  { handle: "twintlnews", zone: "indopacifique", note: "Taïwan dans la presse internationale" },
  { handle: "dvbtvnews", zone: "indopacifique", note: "DVB, média birman indépendant" },
  { handle: "bni_mmpeacemonitor", zone: "indopacifique", note: "BNI Myanmar Peace Monitor, suivi du conflit birman" },
  // Europe
  { handle: "DeepStateUA", zone: "europe", note: "DeepState, cartographie du front, perspective ukrainienne" },
  { handle: "DeepStateEN", zone: "europe", note: "DeepState (anglais), perspective ukrainienne" },
  { handle: "europeancommission", zone: "europe", note: "Commission européenne, communication officielle" },
  { handle: "meduzalive", zone: "europe", note: "Meduza, média russe indépendant" },
  { handle: "kyivindependent_official", zone: "europe", note: "The Kyiv Independent, presse ukrainienne" },
  // Monde
  { handle: "entre_guerras", zone: null, note: "veille conflits, à recouper" },
  { handle: "rybar", zone: null, note: "Rybar, canal militaire pro-russe" },
  { handle: "occidentalist", zone: null, note: "veille géopolitique, orientation à vérifier" },
  { handle: "war_noir", zone: null, note: "veille conflits, à recouper" },
  { handle: "wagner_group2022", zone: null, note: "canal pro-Wagner : narratif d'une partie" },
];

export function channelNote(handle: string): string {
  return TELEGRAM_CHANNELS.find((c) => c.handle.toLowerCase() === handle.toLowerCase())?.note ?? "canal Telegram, à recouper";
}
