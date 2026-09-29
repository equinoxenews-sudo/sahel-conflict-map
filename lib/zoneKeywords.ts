/**
 * Real-world search keywords per zone, for full-text article search
 * (GDELT DOC 2.0). Distinct from lib/zones.ts's `countries` (which are
 * FIPS-mapped labels used to filter the structured Event table) — this
 * needs plain English terms a search engine would match against article
 * text.
 */
export const ZONE_KEYWORDS: Record<string, string[]> = {
  afrique: ["Mali", "Burkina Faso", "Niger", "DRC", "Sudan", "Mozambique", "Nigeria", "Somalia", "Soudan", "Somalie", "RDC", "Congo", "Sahel", "Afrique", "Africa"],
  europe: ["Ukraine", "Kosovo", "Serbia", "Serbie", "Europe", "Russie", "Russia"],
  "moyen-orient": ["Israel", "Gaza", "Syria", "Yemen", "Lebanon", "Liban", "Syrie", "Israël", "Yémen", "Iran", "Irak", "Iraq"],
  // Étendu (29 sept. 2026) à l'ensemble des pays ayant déjà une fiche pays
  // sur le site — sinon les flux régionaux plus larges ajoutés à cette
  // date (The Diplomat, MercoPress, Agência Brasil) ne remonteraient
  // presque rien, la plupart de leur couverture ne mentionnant jamais les
  // 3-7 pays d'origine de la liste précédente.
  indopacifique: [
    "Myanmar", "Philippines", "Taiwan", "North Korea", "China", "Japan", "South Korea",
    "Mongolia", "Thailand", "Vietnam", "Laos", "Cambodia", "Malaysia", "Indonesia", "Brunei", "East Timor",
  ],
  "amerique-du-sud": [
    "Colombia", "Venezuela", "Peru", "Ecuador", "Haiti", "Brazil", "Mexico",
    "Argentina", "Chile", "Uruguay", "Paraguay", "Bolivia", "Guyana", "Suriname", "Falklands",
    // Formes portugaises pour le flux Agência Brasil (titres en portugais).
    "Brasil", "Colômbia", "Equador", "México", "Uruguai", "Paraguai", "Bolívia", "Guiana",
  ],
};
