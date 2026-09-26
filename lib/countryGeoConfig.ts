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
};

export function getCountryGeoConfig(slug: string): CountryGeoConfig | undefined {
  return COUNTRY_GEO_CONFIG[slug];
}
