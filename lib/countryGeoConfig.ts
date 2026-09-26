// Per-country metadata for the country profile map: which neighbors to
// show and which cities to label. Actual polygon geometry is NOT stored
// here — it's read live from public/data/world-countries.geo.json server
// side (see the [country] route) and rendered with react-leaflet, so the
// map is a real tile-based map instead of a hand-projected SVG.
export interface CountryGeoCity {
  name: string;
  lat: number;
  lon: number;
}

export interface CountryGeoConfig {
  mainIso3: string;
  neighbors: Record<string, string>;
  cities: CountryGeoCity[];
}

export const COUNTRY_GEO_CONFIG: Record<string, CountryGeoConfig> = {
  syrie: {
    mainIso3: "SYR",
    neighbors: { TUR: "Turquie", IRQ: "Irak", JOR: "Jordanie", LBN: "Liban", ISR: "Israël" },
    cities: [
      { name: "Damas", lat: 33.51, lon: 36.28 },
      { name: "Alep", lat: 36.2, lon: 37.16 },
      { name: "Homs", lat: 34.73, lon: 36.72 },
      { name: "Lattaquié", lat: 35.52, lon: 35.79 },
      { name: "Deir ez-Zor", lat: 35.34, lon: 40.14 },
      { name: "Idlib", lat: 35.93, lon: 36.63 },
    ],
  },
  israel: {
    mainIso3: "ISR",
    neighbors: { LBN: "Liban", SYR: "Syrie", JOR: "Jordanie", EGY: "Égypte", PSE: "Palestine" },
    cities: [
      { name: "Jérusalem", lat: 31.77, lon: 35.21 },
      { name: "Tel Aviv", lat: 32.08, lon: 34.78 },
      { name: "Haïfa", lat: 32.79, lon: 34.99 },
      { name: "Beer-Sheva", lat: 31.25, lon: 34.78 },
      { name: "Eilat", lat: 29.56, lon: 34.95 },
    ],
  },
  palestine: {
    mainIso3: "PSE",
    neighbors: { ISR: "Israël", JOR: "Jordanie", EGY: "Égypte" },
    cities: [
      { name: "Ramallah", lat: 31.9, lon: 35.2 },
      { name: "Gaza", lat: 31.5, lon: 34.47 },
      { name: "Hébron", lat: 31.53, lon: 35.1 },
      { name: "Naplouse", lat: 32.22, lon: 35.25 },
    ],
  },
  liban: {
    mainIso3: "LBN",
    neighbors: { SYR: "Syrie", ISR: "Israël" },
    cities: [
      { name: "Beyrouth", lat: 33.89, lon: 35.5 },
      { name: "Tripoli", lat: 34.44, lon: 35.85 },
      { name: "Saïda", lat: 33.56, lon: 35.37 },
      { name: "Tyr", lat: 33.27, lon: 35.2 },
    ],
  },
  jordanie: {
    mainIso3: "JOR",
    neighbors: { SYR: "Syrie", IRQ: "Irak", SAU: "Arabie saoudite", ISR: "Israël", PSE: "Palestine" },
    cities: [
      { name: "Amman", lat: 31.95, lon: 35.93 },
      { name: "Zarqa", lat: 32.07, lon: 36.09 },
      { name: "Irbid", lat: 32.56, lon: 35.85 },
      { name: "Aqaba", lat: 29.53, lon: 35.0 },
    ],
  },
  irak: {
    mainIso3: "IRQ",
    neighbors: { TUR: "Turquie", SYR: "Syrie", JOR: "Jordanie", SAU: "Arabie saoudite", KWT: "Koweït", IRN: "Iran" },
    cities: [
      { name: "Bagdad", lat: 33.31, lon: 44.37 },
      { name: "Bassora", lat: 30.51, lon: 47.78 },
      { name: "Mossoul", lat: 36.34, lon: 43.12 },
      { name: "Erbil", lat: 36.19, lon: 44.01 },
      { name: "Najaf", lat: 31.99, lon: 44.34 },
    ],
  },
  iran: {
    mainIso3: "IRN",
    neighbors: { IRQ: "Irak", TUR: "Turquie" },
    cities: [
      { name: "Téhéran", lat: 35.69, lon: 51.39 },
      { name: "Mashhad", lat: 36.3, lon: 59.61 },
      { name: "Ispahan", lat: 32.65, lon: 51.68 },
      { name: "Chiraz", lat: 29.61, lon: 52.53 },
      { name: "Tabriz", lat: 38.08, lon: 46.29 },
    ],
  },
  "arabie-saoudite": {
    mainIso3: "SAU",
    neighbors: { JOR: "Jordanie", IRQ: "Irak", KWT: "Koweït", QAT: "Qatar", ARE: "Émirats arabes unis", OMN: "Oman", YEM: "Yémen" },
    cities: [
      { name: "Riyad", lat: 24.71, lon: 46.72 },
      { name: "Djeddah", lat: 21.54, lon: 39.19 },
      { name: "Médine", lat: 24.47, lon: 39.61 },
      { name: "Dammam", lat: 26.43, lon: 50.1 },
      { name: "La Mecque", lat: 21.42, lon: 39.83 },
    ],
  },
  yemen: {
    mainIso3: "YEM",
    neighbors: { SAU: "Arabie saoudite", OMN: "Oman" },
    cities: [
      { name: "Sanaa", lat: 15.35, lon: 44.21 },
      { name: "Aden", lat: 12.78, lon: 45.03 },
      { name: "Taïz", lat: 13.58, lon: 44.02 },
      { name: "Hodeïda", lat: 14.8, lon: 42.95 },
    ],
  },
  koweit: {
    mainIso3: "KWT",
    neighbors: { IRQ: "Irak", SAU: "Arabie saoudite" },
    cities: [
      { name: "Koweït City", lat: 29.38, lon: 47.98 },
      { name: "Al Ahmadi", lat: 29.08, lon: 48.08 },
    ],
  },
  qatar: {
    mainIso3: "QAT",
    neighbors: { SAU: "Arabie saoudite" },
    cities: [
      { name: "Doha", lat: 25.29, lon: 51.53 },
      { name: "Al Rayyan", lat: 25.29, lon: 51.42 },
    ],
  },
  "emirats-arabes-unis": {
    mainIso3: "ARE",
    neighbors: { SAU: "Arabie saoudite", OMN: "Oman" },
    cities: [
      { name: "Abou Dabi", lat: 24.45, lon: 54.37 },
      { name: "Dubaï", lat: 25.2, lon: 55.27 },
      { name: "Sharjah", lat: 25.35, lon: 55.41 },
    ],
  },
  oman: {
    mainIso3: "OMN",
    neighbors: { SAU: "Arabie saoudite", ARE: "Émirats arabes unis", YEM: "Yémen" },
    cities: [
      { name: "Mascate", lat: 23.61, lon: 58.54 },
      { name: "Salalah", lat: 17.02, lon: 54.09 },
      { name: "Sohar", lat: 24.35, lon: 56.71 },
    ],
  },
  turquie: {
    mainIso3: "TUR",
    neighbors: { SYR: "Syrie", IRQ: "Irak", GRC: "Grèce", BGR: "Bulgarie" },
    cities: [
      { name: "Ankara", lat: 39.93, lon: 32.85 },
      { name: "Istanbul", lat: 41.01, lon: 28.98 },
      { name: "Izmir", lat: 38.42, lon: 27.14 },
      { name: "Antalya", lat: 36.9, lon: 30.71 },
    ],
  },
  egypte: {
    mainIso3: "EGY",
    neighbors: { LBY: "Libye", SDN: "Soudan", ISR: "Israël" },
    cities: [
      { name: "Le Caire", lat: 30.04, lon: 31.24 },
      { name: "Alexandrie", lat: 31.2, lon: 29.92 },
      { name: "Gizeh", lat: 29.99, lon: 31.21 },
      { name: "Louxor", lat: 25.68, lon: 32.64 },
      { name: "Assouan", lat: 24.09, lon: 32.9 },
    ],
  },

  // --- Indopacifique (generated batch — see lib/countries/*.ts header
  // comments; neighbors auto-detected from bounding-box proximity against
  // the world GeoJSON, no hardcoded city markers at this scale) ---
  chine: { mainIso3: "CHN", neighbors: { AFG: "Afghanistan", BGD: "Bangladesh", BTN: "Bhutan", IND: "Inde", JPN: "Japon", KAZ: "Kazakhstan", KGZ: "Kirghizistan", KHM: "Cambodge", KOR: "Corée du Sud", LAO: "Laos", MMR: "Myanmar", MNG: "Mongolie", NPL: "Népal", PAK: "Pakistan", PHL: "Philippines", PRK: "Corée du Nord", RUS: "Russie", THA: "Thaïlande", TJK: "Tadjikistan", TWN: "Taïwan", UZB: "Ouzbékistan", VNM: "Vietnam" }, cities: [] },
  japon: { mainIso3: "JPN", neighbors: { CHN: "Chine", KOR: "Corée du Sud", PRK: "Corée du Nord", RUS: "Russie" }, cities: [] },
  "coree-du-sud": { mainIso3: "KOR", neighbors: { CHN: "Chine", JPN: "Japon", PRK: "Corée du Nord" }, cities: [] },
  "coree-du-nord": { mainIso3: "PRK", neighbors: { CHN: "Chine", JPN: "Japon", KOR: "Corée du Sud", RUS: "Russie" }, cities: [] },
  taiwan: { mainIso3: "TWN", neighbors: { CHN: "Chine" }, cities: [] },
  mongolie: { mainIso3: "MNG", neighbors: { CHN: "Chine", KAZ: "Kazakhstan", RUS: "Russie" }, cities: [] },
  myanmar: { mainIso3: "MMR", neighbors: { BGD: "Bangladesh", BTN: "Bhoutan", CHN: "Chine", IND: "Inde", KHM: "Cambodge", LAO: "Laos", THA: "Thaïlande", VNM: "Vietnam" }, cities: [] },
  thailande: { mainIso3: "THA", neighbors: { CHN: "Chine", IDN: "Indonésie", IND: "Inde", KHM: "Cambodge", LAO: "Laos", MMR: "Myanmar", MYS: "Malaisie", VNM: "Vietnam" }, cities: [] },
  vietnam: { mainIso3: "VNM", neighbors: { CHN: "Chine", KHM: "Cambodge", LAO: "Laos", THA: "Thaïlande" }, cities: [] },
  laos: { mainIso3: "LAO", neighbors: { CHN: "Chine", KHM: "Cambodge", MMR: "Myanmar", THA: "Thaïlande", VNM: "Vietnam" }, cities: [] },
  cambodge: { mainIso3: "KHM", neighbors: { LAO: "Laos", THA: "Thaïlande", VNM: "Vietnam" }, cities: [] },
  malaisie: { mainIso3: "MYS", neighbors: { BRN: "Brunei", IDN: "Indonésie", PHL: "Philippines", THA: "Thaïlande" }, cities: [] },
  indonesie: { mainIso3: "IDN", neighbors: { AUS: "Australie", BRN: "Brunei", IND: "Inde", MYS: "Malaisie", PHL: "Philippines", PNG: "Papouasie-Nouvelle-Guinée", THA: "Thaïlande", TLS: "Timor oriental" }, cities: [] },
  philippines: { mainIso3: "PHL", neighbors: { CHN: "Chine", IDN: "Indonésie", MYS: "Malaisie" }, cities: [] },
  brunei: { mainIso3: "BRN", neighbors: { IDN: "Indonésie", MYS: "Malaisie" }, cities: [] },
  "timor-oriental": { mainIso3: "TLS", neighbors: { IDN: "Indonésie" }, cities: [] },

  // --- Amérique du Sud (generated batch, same discipline as above) ---
  argentine: { mainIso3: "ARG", neighbors: { BOL: "Bolivie", BRA: "Brésil", CHL: "Chili", FLK: "Îles Malouines", PRY: "Paraguay", URY: "Uruguay" }, cities: [] },
  bolivie: { mainIso3: "BOL", neighbors: { ARG: "Argentine", BRA: "Brésil", CHL: "Chili", PER: "Pérou", PRY: "Paraguay" }, cities: [] },
  bresil: { mainIso3: "BRA", neighbors: { ARG: "Argentine", BOL: "Bolivie", CHL: "Chili", COL: "Colombie", ECU: "Équateur", GUF: "Guyane française", GUY: "Guyana", PAN: "Panama", PER: "Pérou", PRY: "Paraguay", SUR: "Suriname", URY: "Uruguay", VEN: "Venezuela" }, cities: [] },
  chili: { mainIso3: "CHL", neighbors: { ARG: "Argentine", BOL: "Bolivie", BRA: "Brésil", PER: "Pérou" }, cities: [] },
  colombie: { mainIso3: "COL", neighbors: { BRA: "Brésil", ECU: "Équateur", PAN: "Panama", PER: "Pérou", VEN: "Venezuela" }, cities: [] },
  equateur: { mainIso3: "ECU", neighbors: { COL: "Colombie", PER: "Pérou" }, cities: [] },
  "guyane-francaise": { mainIso3: "GUF", neighbors: { BRA: "Brésil", SUR: "Suriname" }, cities: [] },
  guyana: { mainIso3: "GUY", neighbors: { BRA: "Brésil", SUR: "Suriname", VEN: "Venezuela" }, cities: [] },
  perou: { mainIso3: "PER", neighbors: { BOL: "Bolivie", BRA: "Brésil", CHL: "Chili", COL: "Colombie", ECU: "Équateur", VEN: "Venezuela" }, cities: [] },
  paraguay: { mainIso3: "PRY", neighbors: { ARG: "Argentine", BOL: "Bolivie", BRA: "Brésil" }, cities: [] },
  suriname: { mainIso3: "SUR", neighbors: { BRA: "Brésil", GUF: "Guyane française", GUY: "Guyana" }, cities: [] },
  uruguay: { mainIso3: "URY", neighbors: { ARG: "Argentine", BRA: "Brésil" }, cities: [] },
  venezuela: { mainIso3: "VEN", neighbors: { BRA: "Brésil", COL: "Colombie", GUY: "Guyana", PER: "Pérou", TTO: "Trinité-et-Tobago" }, cities: [] },

  // Europe (+ Caucase, non couvert par une autre zone) — voisins auto-détectés,
  // Russie restaurée manuellement là où le bug de l'antiméridien l'excluait.
  albanie: { mainIso3: "ALB", neighbors: { BIH: "Bosnie-Herzégovine", GRC: "Grèce", HRV: "Croatie", "CS-KM": "Kosovo", MKD: "Macédoine du Nord", MNE: "Monténégro", SRB: "Serbie" }, cities: [] },
  armenie: { mainIso3: "ARM", neighbors: { AZE: "Azerbaïdjan", GEO: "Géorgie", IRN: "Iran", KAZ: "Kazakhstan", TUR: "Turquie" }, cities: [] },
  autriche: { mainIso3: "AUT", neighbors: { CHE: "Suisse", CZE: "Tchéquie", DEU: "Allemagne", FRA: "France", HRV: "Croatie", HUN: "Hongrie", ITA: "Italie", POL: "Pologne", SVK: "Slovaquie", SVN: "Slovénie" }, cities: [] },
  azerbaidjan: { mainIso3: "AZE", neighbors: { ARM: "Arménie", GEO: "Géorgie", IRN: "Iran", KAZ: "Kazakhstan", TUR: "Turquie", RUS: "Russie" }, cities: [] },
  belgique: { mainIso3: "BEL", neighbors: { DEU: "Allemagne", FRA: "France", LUX: "Luxembourg", NLD: "Pays-Bas" }, cities: [] },
  bulgarie: { mainIso3: "BGR", neighbors: { GRC: "Grèce", MKD: "Macédoine du Nord", ROU: "Roumanie", SRB: "Serbie", TUR: "Turquie", UKR: "Ukraine" }, cities: [] },
  "bosnie-herzegovine": { mainIso3: "BIH", neighbors: { ALB: "Albanie", HRV: "Croatie", ITA: "Italie", MNE: "Monténégro", SRB: "Serbie", SVN: "Slovénie" }, cities: [] },
  bielorussie: { mainIso3: "BLR", neighbors: { LTU: "Lituanie", LVA: "Lettonie", POL: "Pologne", SWE: "Suède", UKR: "Ukraine", RUS: "Russie" }, cities: [] },
  suisse: { mainIso3: "CHE", neighbors: { AUT: "Autriche", DEU: "Allemagne", FRA: "France", ITA: "Italie" }, cities: [] },
  // Chypre n'a pas de frontière terrestre exploitable dans ce jeu de données
  // (l'id "-99" du GeoJSON source est partagé par Chypre du Nord et le
  // Somaliland, ce qui rendrait le rendu ambigu) — aucun voisin affiché.
  chypre: { mainIso3: "CYP", neighbors: {}, cities: [] },
  tchequie: { mainIso3: "CZE", neighbors: { AUT: "Autriche", DEU: "Allemagne", HUN: "Hongrie", POL: "Pologne", SVK: "Slovaquie" }, cities: [] },
  allemagne: { mainIso3: "DEU", neighbors: { AUT: "Autriche", BEL: "Belgique", CHE: "Suisse", CZE: "Tchéquie", DNK: "Danemark", FRA: "France", ITA: "Italie", LUX: "Luxembourg", NLD: "Pays-Bas", POL: "Pologne", SVN: "Slovénie", SWE: "Suède" }, cities: [] },
  danemark: { mainIso3: "DNK", neighbors: { DEU: "Allemagne", NOR: "Norvège", SWE: "Suède" }, cities: [] },
  espagne: { mainIso3: "ESP", neighbors: { DZA: "Algérie", FRA: "France", MAR: "Maroc", PRT: "Portugal" }, cities: [] },
  estonie: { mainIso3: "EST", neighbors: { FIN: "Finlande", LVA: "Lettonie", NOR: "Norvège", SWE: "Suède", RUS: "Russie" }, cities: [] },
  finlande: { mainIso3: "FIN", neighbors: { EST: "Estonie", NOR: "Norvège", SWE: "Suède", RUS: "Russie" }, cities: [] },
  france: { mainIso3: "FRA", neighbors: { AUT: "Autriche", BEL: "Belgique", CHE: "Suisse", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", ITA: "Italie", LUX: "Luxembourg", NLD: "Pays-Bas" }, cities: [] },
  "royaume-uni": { mainIso3: "GBR", neighbors: { FRA: "France", IRL: "Irlande" }, cities: [] },
  georgie: { mainIso3: "GEO", neighbors: { ARM: "Arménie", AZE: "Azerbaïdjan", KAZ: "Kazakhstan", TUR: "Turquie", RUS: "Russie" }, cities: [] },
  grece: { mainIso3: "GRC", neighbors: { ALB: "Albanie", BGR: "Bulgarie", "CS-KM": "Kosovo", MKD: "Macédoine du Nord", MNE: "Monténégro", SRB: "Serbie", TUR: "Turquie" }, cities: [] },
  croatie: { mainIso3: "HRV", neighbors: { ALB: "Albanie", AUT: "Autriche", BIH: "Bosnie-Herzégovine", HUN: "Hongrie", ITA: "Italie", MNE: "Monténégro", SRB: "Serbie", SVN: "Slovénie" }, cities: [] },
  hongrie: { mainIso3: "HUN", neighbors: { AUT: "Autriche", CZE: "Tchéquie", HRV: "Croatie", ITA: "Italie", POL: "Pologne", ROU: "Roumanie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", UKR: "Ukraine" }, cities: [] },
  irlande: { mainIso3: "IRL", neighbors: { GBR: "Royaume-Uni" }, cities: [] },
  islande: { mainIso3: "ISL", neighbors: { GRL: "Groenland" }, cities: [] },
  italie: { mainIso3: "ITA", neighbors: { ALB: "Albanie", AUT: "Autriche", BIH: "Bosnie-Herzégovine", CHE: "Suisse", DEU: "Allemagne", DZA: "Algérie", FRA: "France", HRV: "Croatie", HUN: "Hongrie", MLT: "Malte", MNE: "Monténégro", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", TUN: "Tunisie" }, cities: [] },
  kosovo: { mainIso3: "CS-KM", neighbors: { ALB: "Albanie", GRC: "Grèce", MKD: "Macédoine du Nord", MNE: "Monténégro", SRB: "Serbie" }, cities: [] },
  lituanie: { mainIso3: "LTU", neighbors: { BLR: "Biélorussie", LVA: "Lettonie", POL: "Pologne", SWE: "Suède", RUS: "Russie" }, cities: [] },
  luxembourg: { mainIso3: "LUX", neighbors: { BEL: "Belgique", DEU: "Allemagne", FRA: "France" }, cities: [] },
  lettonie: { mainIso3: "LVA", neighbors: { BLR: "Biélorussie", EST: "Estonie", LTU: "Lituanie", NOR: "Norvège", SWE: "Suède", RUS: "Russie" }, cities: [] },
  moldavie: { mainIso3: "MDA", neighbors: { ROU: "Roumanie", UKR: "Ukraine" }, cities: [] },
  "macedoine-du-nord": { mainIso3: "MKD", neighbors: { ALB: "Albanie", BGR: "Bulgarie", GRC: "Grèce", "CS-KM": "Kosovo", MNE: "Monténégro", SRB: "Serbie" }, cities: [] },
  malte: { mainIso3: "MLT", neighbors: {}, cities: [] },
  montenegro: { mainIso3: "MNE", neighbors: { ALB: "Albanie", BIH: "Bosnie-Herzégovine", GRC: "Grèce", HRV: "Croatie", ITA: "Italie", "CS-KM": "Kosovo", MKD: "Macédoine du Nord", ROU: "Roumanie", SRB: "Serbie" }, cities: [] },
  "pays-bas": { mainIso3: "NLD", neighbors: { BEL: "Belgique", DEU: "Allemagne", FRA: "France" }, cities: [] },
  norvege: { mainIso3: "NOR", neighbors: { BLR: "Biélorussie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", LTU: "Lituanie", LVA: "Lettonie", SWE: "Suède", RUS: "Russie" }, cities: [] },
  pologne: { mainIso3: "POL", neighbors: { AUT: "Autriche", BLR: "Biélorussie", CZE: "Tchéquie", DEU: "Allemagne", HUN: "Hongrie", LTU: "Lituanie", SVK: "Slovaquie", SWE: "Suède", UKR: "Ukraine", RUS: "Russie" }, cities: [] },
  portugal: { mainIso3: "PRT", neighbors: { DZA: "Algérie", ESP: "Espagne" }, cities: [] },
  roumanie: { mainIso3: "ROU", neighbors: { BGR: "Bulgarie", BIH: "Bosnie-Herzégovine", HUN: "Hongrie", "CS-KM": "Kosovo", MDA: "Moldavie", MNE: "Monténégro", SRB: "Serbie", SVK: "Slovaquie", UKR: "Ukraine" }, cities: [] },
  russie: { mainIso3: "RUS", neighbors: { NOR: "Norvège", FIN: "Finlande", EST: "Estonie", LVA: "Lettonie", LTU: "Lituanie", POL: "Pologne", BLR: "Biélorussie", UKR: "Ukraine", GEO: "Géorgie", AZE: "Azerbaïdjan", KAZ: "Kazakhstan", CHN: "Chine", MNG: "Mongolie", PRK: "Corée du Nord" }, cities: [] },
  serbie: { mainIso3: "SRB", neighbors: { ALB: "Albanie", BGR: "Bulgarie", BIH: "Bosnie-Herzégovine", HRV: "Croatie", HUN: "Hongrie", ITA: "Italie", "CS-KM": "Kosovo", MKD: "Macédoine du Nord", MNE: "Monténégro", ROU: "Roumanie", UKR: "Ukraine" }, cities: [] },
  slovaquie: { mainIso3: "SVK", neighbors: { AUT: "Autriche", CZE: "Tchéquie", HUN: "Hongrie", POL: "Pologne", ROU: "Roumanie", UKR: "Ukraine" }, cities: [] },
  slovenie: { mainIso3: "SVN", neighbors: { AUT: "Autriche", BIH: "Bosnie-Herzégovine", HRV: "Croatie", HUN: "Hongrie", ITA: "Italie" }, cities: [] },
  suede: { mainIso3: "SWE", neighbors: { BLR: "Biélorussie", DEU: "Allemagne", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", LTU: "Lituanie", LVA: "Lettonie", NOR: "Norvège", POL: "Pologne" }, cities: [] },
  ukraine: { mainIso3: "UKR", neighbors: { BGR: "Bulgarie", BLR: "Biélorussie", GEO: "Géorgie", HUN: "Hongrie", "CS-KM": "Kosovo", MDA: "Moldavie", POL: "Pologne", ROU: "Roumanie", SRB: "Serbie", SVK: "Slovaquie", RUS: "Russie" }, cities: [] },

  // Afrique — voisins auto-détectés par proximité de boîte englobante.
  angola: { mainIso3: "AGO", neighbors: { BWA: "Botswana", COD: "République démocratique du Congo", COG: "République du Congo", GAB: "Gabon", NAM: "Namibie", ZMB: "Zambie" }, cities: [] },
  burundi: { mainIso3: "BDI", neighbors: { COD: "République démocratique du Congo", RWA: "Rwanda", TZA: "Tanzanie" }, cities: [] },
  benin: { mainIso3: "BEN", neighbors: { BFA: "Burkina Faso", GHA: "Ghana", MLI: "Mali", NER: "Niger", NGA: "Nigeria", TGO: "Togo" }, cities: [] },
  "burkina-faso": { mainIso3: "BFA", neighbors: { BEN: "Bénin", CIV: "Côte d'Ivoire", GHA: "Ghana", MLI: "Mali", MRT: "Mauritanie", NER: "Niger", NGA: "Nigeria", TGO: "Togo" }, cities: [] },
  botswana: { mainIso3: "BWA", neighbors: { AGO: "Angola", MOZ: "Mozambique", NAM: "Namibie", ZAF: "Afrique du Sud", ZMB: "Zambie", ZWE: "Zimbabwe" }, cities: [] },
  "republique-centrafricaine": { mainIso3: "CAF", neighbors: { CMR: "Cameroun", COD: "République démocratique du Congo", COG: "République du Congo", GAB: "Gabon", NER: "Niger", NGA: "Nigeria", SDN: "Soudan", SSD: "Soudan du Sud", TCD: "Tchad" }, cities: [] },
  "cote-d-ivoire": { mainIso3: "CIV", neighbors: { BFA: "Burkina Faso", GHA: "Ghana", GIN: "Guinée", LBR: "Liberia", MLI: "Mali" }, cities: [] },
  cameroun: { mainIso3: "CMR", neighbors: { CAF: "République centrafricaine", COD: "République démocratique du Congo", COG: "République du Congo", GAB: "Gabon", GNQ: "Guinée équatoriale", NER: "Niger", NGA: "Nigeria", TCD: "Tchad" }, cities: [] },
  "republique-democratique-du-congo": { mainIso3: "COD", neighbors: { AGO: "Angola", BDI: "Burundi", CAF: "République centrafricaine", CMR: "Cameroun", COG: "République du Congo", GAB: "Gabon", GNQ: "Guinée équatoriale", MOZ: "Mozambique", MWI: "Malawi", NGA: "Nigeria", RWA: "Rwanda", SSD: "Soudan du Sud", TZA: "Tanzanie", UGA: "Ouganda", ZMB: "Zambie" }, cities: [] },
  "republique-du-congo": { mainIso3: "COG", neighbors: { AGO: "Angola", CAF: "République centrafricaine", CMR: "Cameroun", COD: "République démocratique du Congo", GAB: "Gabon", GNQ: "Guinée équatoriale", NGA: "Nigeria" }, cities: [] },
  djibouti: { mainIso3: "DJI", neighbors: { ERI: "Érythrée", ETH: "Éthiopie", SOM: "Somalie", YEM: "Yémen" }, cities: [] },
  algerie: { mainIso3: "DZA", neighbors: { ESP: "Espagne", ITA: "Italie", LBY: "Libye", MAR: "Maroc", MLI: "Mali", MRT: "Mauritanie", NER: "Niger", PRT: "Portugal", ESH: "Sahara occidental", TCD: "Tchad", TUN: "Tunisie" }, cities: [] },
  erythree: { mainIso3: "ERI", neighbors: { DJI: "Djibouti", ETH: "Éthiopie", SAU: "Arabie saoudite", SDN: "Soudan", SOM: "Somalie", YEM: "Yémen" }, cities: [] },
  ethiopie: { mainIso3: "ETH", neighbors: { DJI: "Djibouti", ERI: "Érythrée", KEN: "Kenya", SDN: "Soudan", SSD: "Soudan du Sud", SOM: "Somalie", UGA: "Ouganda", YEM: "Yémen" }, cities: [] },
  gabon: { mainIso3: "GAB", neighbors: { AGO: "Angola", CAF: "République centrafricaine", CMR: "Cameroun", COD: "République démocratique du Congo", COG: "République du Congo", GNQ: "Guinée équatoriale" }, cities: [] },
  ghana: { mainIso3: "GHA", neighbors: { BEN: "Bénin", BFA: "Burkina Faso", CIV: "Côte d'Ivoire", MLI: "Mali", TGO: "Togo" }, cities: [] },
  guinee: { mainIso3: "GIN", neighbors: { CIV: "Côte d'Ivoire", GNB: "Guinée-Bissau", LBR: "Liberia", MLI: "Mali", SEN: "Sénégal", SLE: "Sierra Leone" }, cities: [] },
  gambie: { mainIso3: "GMB", neighbors: { SEN: "Sénégal" }, cities: [] },
  "guinee-bissau": { mainIso3: "GNB", neighbors: { GIN: "Guinée", SEN: "Sénégal" }, cities: [] },
  "guinee-equatoriale": { mainIso3: "GNQ", neighbors: { CMR: "Cameroun", COG: "République du Congo", GAB: "Gabon" }, cities: [] },
  kenya: { mainIso3: "KEN", neighbors: { ETH: "Éthiopie", SSD: "Soudan du Sud", SOM: "Somalie", TZA: "Tanzanie", UGA: "Ouganda" }, cities: [] },
  liberia: { mainIso3: "LBR", neighbors: { CIV: "Côte d'Ivoire", GIN: "Guinée", SLE: "Sierra Leone" }, cities: [] },
  libye: { mainIso3: "LBY", neighbors: { DZA: "Algérie", EGY: "Égypte", NER: "Niger", SDN: "Soudan", TCD: "Tchad", TUN: "Tunisie" }, cities: [] },
  lesotho: { mainIso3: "LSO", neighbors: { ZAF: "Afrique du Sud" }, cities: [] },
  maroc: { mainIso3: "MAR", neighbors: { DZA: "Algérie", ESP: "Espagne", MLI: "Mali", MRT: "Mauritanie", PRT: "Portugal", ESH: "Sahara occidental" }, cities: [] },
  madagascar: { mainIso3: "MDG", neighbors: {}, cities: [] },
  mali: { mainIso3: "MLI", neighbors: { BEN: "Bénin", BFA: "Burkina Faso", CIV: "Côte d'Ivoire", DZA: "Algérie", GHA: "Ghana", GIN: "Guinée", MAR: "Maroc", MRT: "Mauritanie", NER: "Niger", NGA: "Nigeria", ESH: "Sahara occidental", SEN: "Sénégal", SLE: "Sierra Leone", TGO: "Togo" }, cities: [] },
  mozambique: { mainIso3: "MOZ", neighbors: { BWA: "Botswana", COD: "République démocratique du Congo", MWI: "Malawi", SWZ: "Eswatini", TZA: "Tanzanie", ZAF: "Afrique du Sud", ZMB: "Zambie", ZWE: "Zimbabwe" }, cities: [] },
  mauritanie: { mainIso3: "MRT", neighbors: { BFA: "Burkina Faso", DZA: "Algérie", GMB: "Gambie", MAR: "Maroc", MLI: "Mali", ESH: "Sahara occidental", SEN: "Sénégal" }, cities: [] },
  malawi: { mainIso3: "MWI", neighbors: { MOZ: "Mozambique", TZA: "Tanzanie", ZMB: "Zambie", ZWE: "Zimbabwe" }, cities: [] },
  namibie: { mainIso3: "NAM", neighbors: { AGO: "Angola", BWA: "Botswana", ZAF: "Afrique du Sud", ZMB: "Zambie", ZWE: "Zimbabwe" }, cities: [] },
  niger: { mainIso3: "NER", neighbors: { BEN: "Bénin", BFA: "Burkina Faso", CAF: "République centrafricaine", CMR: "Cameroun", DZA: "Algérie", GHA: "Ghana", LBY: "Libye", MLI: "Mali", NGA: "Nigeria", TCD: "Tchad", TGO: "Togo" }, cities: [] },
  nigeria: { mainIso3: "NGA", neighbors: { BEN: "Bénin", BFA: "Burkina Faso", CAF: "République centrafricaine", CMR: "Cameroun", COD: "République démocratique du Congo", COG: "République du Congo", MLI: "Mali", NER: "Niger", TCD: "Tchad", TGO: "Togo" }, cities: [] },
  rwanda: { mainIso3: "RWA", neighbors: { BDI: "Burundi", COD: "République démocratique du Congo", TZA: "Tanzanie", UGA: "Ouganda" }, cities: [] },
  "sahara-occidental": { mainIso3: "ESH", neighbors: { DZA: "Algérie", MAR: "Maroc", MLI: "Mali", MRT: "Mauritanie" }, cities: [] },
  soudan: { mainIso3: "SDN", neighbors: { CAF: "République centrafricaine", EGY: "Égypte", ERI: "Érythrée", ETH: "Éthiopie", LBY: "Libye", SAU: "Arabie saoudite", SSD: "Soudan du Sud", TCD: "Tchad" }, cities: [] },
  "soudan-du-sud": { mainIso3: "SSD", neighbors: { CAF: "République centrafricaine", COD: "République démocratique du Congo", ETH: "Éthiopie", KEN: "Kenya", SDN: "Soudan", TCD: "Tchad", UGA: "Ouganda" }, cities: [] },
  senegal: { mainIso3: "SEN", neighbors: { GIN: "Guinée", GMB: "Gambie", GNB: "Guinée-Bissau", MLI: "Mali", MRT: "Mauritanie" }, cities: [] },
  "sierra-leone": { mainIso3: "SLE", neighbors: { GIN: "Guinée", LBR: "Liberia", MLI: "Mali" }, cities: [] },
  somalie: { mainIso3: "SOM", neighbors: { DJI: "Djibouti", ERI: "Érythrée", ETH: "Éthiopie", KEN: "Kenya", TZA: "Tanzanie", YEM: "Yémen" }, cities: [] },
  eswatini: { mainIso3: "SWZ", neighbors: { MOZ: "Mozambique", ZAF: "Afrique du Sud" }, cities: [] },
  tchad: { mainIso3: "TCD", neighbors: { CAF: "République centrafricaine", CMR: "Cameroun", EGY: "Égypte", LBY: "Libye", NER: "Niger", NGA: "Nigeria", SDN: "Soudan", SSD: "Soudan du Sud" }, cities: [] },
  togo: { mainIso3: "TGO", neighbors: { BEN: "Bénin", BFA: "Burkina Faso", GHA: "Ghana", MLI: "Mali" }, cities: [] },
  tanzanie: { mainIso3: "TZA", neighbors: { BDI: "Burundi", COD: "République démocratique du Congo", KEN: "Kenya", MOZ: "Mozambique", MWI: "Malawi", RWA: "Rwanda", SOM: "Somalie", UGA: "Ouganda", ZMB: "Zambie" }, cities: [] },
  ouganda: { mainIso3: "UGA", neighbors: { COD: "République démocratique du Congo", ETH: "Éthiopie", KEN: "Kenya", RWA: "Rwanda", SSD: "Soudan du Sud", TZA: "Tanzanie" }, cities: [] },
  "afrique-du-sud": { mainIso3: "ZAF", neighbors: { BWA: "Botswana", LSO: "Lesotho", MOZ: "Mozambique", NAM: "Namibie", SWZ: "Eswatini", ZWE: "Zimbabwe" }, cities: [] },
  zambie: { mainIso3: "ZMB", neighbors: { AGO: "Angola", BWA: "Botswana", COD: "République démocratique du Congo", MOZ: "Mozambique", MWI: "Malawi", NAM: "Namibie", TZA: "Tanzanie", ZWE: "Zimbabwe" }, cities: [] },
  zimbabwe: { mainIso3: "ZWE", neighbors: { BWA: "Botswana", MOZ: "Mozambique", MWI: "Malawi", NAM: "Namibie", ZAF: "Afrique du Sud", ZMB: "Zambie" }, cities: [] },
  tunisie: { mainIso3: "TUN", neighbors: { DZA: "Algérie", ITA: "Italie", LBY: "Libye" }, cities: [] },
};

export function getCountryGeoConfig(slug: string): CountryGeoConfig | undefined {
  return COUNTRY_GEO_CONFIG[slug];
}
