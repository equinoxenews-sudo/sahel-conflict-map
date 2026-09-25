// Catalogue of OSINT search connectors. Every one of these is a link out
// to a free, publicly-reachable tool — none of them are wired to a paid
// API, and none of them fabricate results. `mode` tells the UI (and the
// user) exactly what clicking it does:
//   - "external_link": opens the tool in a new tab, query pre-filled
//     when a `searchUrlTemplate` exists.
//   - "manual_import": the target can't be queried directly (no public
//     search API, or blocks cross-origin requests) — the tool is still
//     useful, but the analyst has to go copy/paste what they find into
//     a Source by hand.
//   - "integration": this app itself makes a request to the tool (only
//     used where the target explicitly allows cross-origin reads — see
//     the RDAP lookup in the Toolbox, not in this catalogue).
//
// Extending this list is just appending an object — no code changes
// needed elsewhere.

export type InputType =
  | "keyword"
  | "name"
  | "username"
  | "organization"
  | "domain_ip"
  | "location"
  | "vessel"
  | "wallet";

export const INPUT_TYPE_LABELS: Record<InputType, string> = {
  keyword: "Mot-clé / hashtag",
  name: "Nom",
  username: "Pseudonyme / user ID",
  organization: "Organisation",
  domain_ip: "Domaine / IP",
  location: "Lieu",
  vessel: "Navire (IMO/MMSI)",
  wallet: "Adresse de portefeuille",
};

export type ConnectorCategory =
  | "actualites"
  | "telegram"
  | "youtube"
  | "bluesky"
  | "reddit"
  | "github"
  | "registres"
  | "archives"
  | "geoint"
  | "maritime"
  | "blockchain"
  | "domaines";

export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  actualites: "Actualités",
  telegram: "Telegram public",
  youtube: "YouTube",
  bluesky: "Bluesky",
  reddit: "Reddit",
  github: "GitHub",
  registres: "Registres d'entreprises",
  archives: "Archives web",
  geoint: "GEOINT",
  maritime: "Maritime",
  blockchain: "Blockchain",
  domaines: "Analyse de domaines",
};

export type ConnectorMode = "external_link" | "manual_import" | "integration";

export const CONNECTOR_MODE_LABELS: Record<ConnectorMode, string> = {
  external_link: "Lien externe",
  manual_import: "Import manuel",
  integration: "Intégration réelle",
};

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  acceptedInputTypes: InputType[];
  url: string;
  /** {query} is replaced with the encoded search text when present. */
  searchUrlTemplate?: string;
  mode: ConnectorMode;
  limits: string;
  status: "active" | "planned";
}

export const CONNECTORS: Connector[] = [
  // --- Actualités ---
  {
    id: "google-news",
    name: "Google News",
    category: "actualites",
    acceptedInputTypes: ["keyword", "name", "organization", "location"],
    url: "https://news.google.com",
    searchUrlTemplate: "https://news.google.com/search?q={query}",
    mode: "external_link",
    limits: "Résultats dépendants de l'indexation Google, pas d'accès exhaustif.",
    status: "active",
  },
  {
    id: "bing-news",
    name: "Bing News",
    category: "actualites",
    acceptedInputTypes: ["keyword", "name", "organization", "location"],
    url: "https://www.bing.com/news",
    searchUrlTemplate: "https://www.bing.com/news/search?q={query}",
    mode: "external_link",
    limits: "Couverture différente de Google, utile en recoupement.",
    status: "active",
  },
  {
    id: "gdelt-doc",
    name: "GDELT DOC 2.0",
    category: "actualites",
    acceptedInputTypes: ["keyword", "organization", "location"],
    url: "https://api.gdeltproject.org/api/v2/doc/doc",
    searchUrlTemplate: "https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=artlist&format=html",
    mode: "external_link",
    limits: "Base déjà utilisée par le site principal (sync GDELT) — ici en consultation manuelle libre.",
    status: "active",
  },

  // --- Telegram public ---
  {
    id: "telegram-web-preview",
    name: "Aperçu web d'un canal Telegram",
    category: "telegram",
    acceptedInputTypes: ["username"],
    url: "https://t.me/s/",
    searchUrlTemplate: "https://t.me/s/{query}",
    mode: "external_link",
    limits: "Fonctionne uniquement pour un canal public dont on connaît déjà le nom (pas un moteur de recherche global).",
    status: "active",
  },
  {
    id: "telegram-google-site",
    name: "Recherche Google sur t.me",
    category: "telegram",
    acceptedInputTypes: ["keyword", "name", "organization"],
    url: "https://www.google.com",
    searchUrlTemplate: "https://www.google.com/search?q=site:t.me+{query}",
    mode: "external_link",
    limits: "Dépend de l'indexation Google des canaux publics, très partielle.",
    status: "active",
  },

  // --- YouTube ---
  {
    id: "youtube-search",
    name: "Recherche YouTube",
    category: "youtube",
    acceptedInputTypes: ["keyword", "name", "organization", "username"],
    url: "https://www.youtube.com",
    searchUrlTemplate: "https://www.youtube.com/results?search_query={query}",
    mode: "external_link",
    limits: "Résultats triés par pertinence YouTube, pas de tri chronologique fiable sans compte.",
    status: "active",
  },
  {
    id: "youtube-channel-guess",
    name: "Chaîne YouTube (par identifiant)",
    category: "youtube",
    acceptedInputTypes: ["username"],
    url: "https://www.youtube.com",
    searchUrlTemplate: "https://www.youtube.com/@{query}",
    mode: "external_link",
    limits: "Fonctionne seulement si l'identifiant correspond exactement au handle @ de la chaîne.",
    status: "active",
  },

  // --- Bluesky ---
  {
    id: "bluesky-search",
    name: "Recherche Bluesky",
    category: "bluesky",
    acceptedInputTypes: ["keyword", "name", "username"],
    url: "https://bsky.app",
    searchUrlTemplate: "https://bsky.app/search?q={query}",
    mode: "external_link",
    limits: "La recherche publique Bluesky ne couvre que les posts publics, pas d'historique complet garanti.",
    status: "active",
  },
  {
    id: "bluesky-profile-guess",
    name: "Profil Bluesky (handle)",
    category: "bluesky",
    acceptedInputTypes: ["username"],
    url: "https://bsky.app",
    searchUrlTemplate: "https://bsky.app/profile/{query}",
    mode: "external_link",
    limits: "Nécessite le handle exact (ex: nom.bsky.social).",
    status: "active",
  },

  // --- Reddit ---
  {
    id: "reddit-search",
    name: "Recherche Reddit",
    category: "reddit",
    acceptedInputTypes: ["keyword", "name", "organization"],
    url: "https://www.reddit.com",
    searchUrlTemplate: "https://www.reddit.com/search/?q={query}",
    mode: "external_link",
    limits: "Recherche officielle Reddit, souvent moins complète que des outils tiers d'archivage.",
    status: "active",
  },
  {
    id: "reddit-user",
    name: "Profil Reddit (u/username)",
    category: "reddit",
    acceptedInputTypes: ["username"],
    url: "https://www.reddit.com",
    searchUrlTemplate: "https://www.reddit.com/user/{query}",
    mode: "external_link",
    limits: "Ne montre que l'historique encore visible publiquement (posts/commentaires supprimés absents).",
    status: "active",
  },

  // --- GitHub ---
  {
    id: "github-users",
    name: "GitHub — utilisateurs",
    category: "github",
    acceptedInputTypes: ["username", "name"],
    url: "https://github.com/search",
    searchUrlTemplate: "https://github.com/search?q={query}&type=users",
    mode: "external_link",
    limits: "Ne couvre que les profils publics et champs de profil renseignés.",
    status: "active",
  },
  {
    id: "github-code",
    name: "GitHub — code et dépôts",
    category: "github",
    acceptedInputTypes: ["keyword", "organization", "domain_ip"],
    url: "https://github.com/search",
    searchUrlTemplate: "https://github.com/search?q={query}&type=repositories",
    mode: "external_link",
    limits: "Utile pour retrouver des identifiants/domaines commités par erreur dans du code public.",
    status: "active",
  },

  // --- Registres d'entreprises ---
  {
    id: "opencorporates",
    name: "OpenCorporates",
    category: "registres",
    acceptedInputTypes: ["organization", "name"],
    url: "https://opencorporates.com",
    searchUrlTemplate: "https://opencorporates.com/companies?q={query}",
    mode: "external_link",
    limits: "Base collaborative de registres officiels mondiaux — couverture inégale selon les pays.",
    status: "active",
  },
  {
    id: "annuaire-entreprises-fr",
    name: "Annuaire des entreprises (France)",
    category: "registres",
    acceptedInputTypes: ["organization"],
    url: "https://annuaire-entreprises.data.gouv.fr",
    searchUrlTemplate: "https://annuaire-entreprises.data.gouv.fr/rechercher?terme={query}",
    mode: "external_link",
    limits: "Données officielles françaises (INSEE/INPI), France uniquement.",
    status: "active",
  },
  {
    id: "companies-house-uk",
    name: "Companies House (UK)",
    category: "registres",
    acceptedInputTypes: ["organization"],
    url: "https://find-and-update.company-information.service.gov.uk",
    searchUrlTemplate: "https://find-and-update.company-information.service.gov.uk/search?q={query}",
    mode: "external_link",
    limits: "Registre officiel britannique uniquement.",
    status: "active",
  },
  {
    id: "sec-edgar",
    name: "SEC EDGAR (full text search)",
    category: "registres",
    acceptedInputTypes: ["organization", "name"],
    url: "https://www.sec.gov/cgi-bin/srqsb",
    searchUrlTemplate: "https://efts.sec.gov/LATEST/search-index?q={query}",
    mode: "external_link",
    limits: "Documents déposés auprès du régulateur boursier américain uniquement.",
    status: "active",
  },

  // --- Archives web ---
  {
    id: "wayback-machine",
    name: "Wayback Machine",
    category: "archives",
    acceptedInputTypes: ["domain_ip", "keyword"],
    url: "https://web.archive.org",
    searchUrlTemplate: "https://web.archive.org/web/*/{query}",
    mode: "external_link",
    limits: "Snapshots dépendants de ce que le robot d'Archive.org a effectivement capturé.",
    status: "active",
  },
  {
    id: "archive-today",
    name: "archive.today",
    category: "archives",
    acceptedInputTypes: ["domain_ip"],
    url: "https://archive.ph",
    searchUrlTemplate: "https://archive.ph/{query}",
    mode: "external_link",
    limits: "Utile pour des pages retirées ailleurs — pas d'archivage automatique déclenché par ce lien.",
    status: "active",
  },

  // --- GEOINT ---
  {
    id: "google-maps",
    name: "Google Maps",
    category: "geoint",
    acceptedInputTypes: ["location"],
    url: "https://www.google.com/maps",
    searchUrlTemplate: "https://www.google.com/maps/search/{query}",
    mode: "external_link",
    limits: "",
    status: "active",
  },
  {
    id: "osm-nominatim",
    name: "OpenStreetMap (Nominatim)",
    category: "geoint",
    acceptedInputTypes: ["location"],
    url: "https://nominatim.openstreetmap.org",
    searchUrlTemplate: "https://nominatim.openstreetmap.org/ui/search.html?q={query}",
    mode: "external_link",
    limits: "Géocodage communautaire, précision variable selon les zones.",
    status: "active",
  },
  {
    id: "suncalc",
    name: "SunCalc (analyse d'ombres/horaires)",
    category: "geoint",
    acceptedInputTypes: ["location"],
    url: "https://www.suncalc.org",
    mode: "manual_import",
    limits: "Pas de recherche par texte — se positionner manuellement sur la carte pour estimer une heure de prise de vue.",
    status: "active",
  },

  // --- Maritime ---
  {
    id: "marinetraffic",
    name: "MarineTraffic",
    category: "maritime",
    acceptedInputTypes: ["vessel", "name"],
    url: "https://www.marinetraffic.com",
    searchUrlTemplate: "https://www.marinetraffic.com/en/ais/index/search/all/keyword:{query}",
    mode: "external_link",
    limits: "Positions AIS temps réel limitées sans compte ; historique payant.",
    status: "active",
  },
  {
    id: "vesselfinder",
    name: "VesselFinder",
    category: "maritime",
    acceptedInputTypes: ["vessel", "name"],
    url: "https://www.vesselfinder.com",
    searchUrlTemplate: "https://www.vesselfinder.com/vessels?name={query}",
    mode: "external_link",
    limits: "Alternative à MarineTraffic, mêmes limites de couverture AIS gratuite.",
    status: "active",
  },
  {
    id: "equinoxe-tracking",
    name: "Suivi navires Équinoxe (déjà en base)",
    category: "maritime",
    acceptedInputTypes: ["vessel", "name"],
    url: "/zones/tracking",
    mode: "external_link",
    limits: "Positions déjà collectées par le site principal (chokepoints maritimes suivis) — périmètre restreint, pas une recherche globale.",
    status: "active",
  },

  // --- Blockchain ---
  {
    id: "etherscan",
    name: "Etherscan (Ethereum)",
    category: "blockchain",
    acceptedInputTypes: ["wallet"],
    url: "https://etherscan.io",
    searchUrlTemplate: "https://etherscan.io/address/{query}",
    mode: "external_link",
    limits: "Ethereum et jetons ERC-20 uniquement.",
    status: "active",
  },
  {
    id: "blockchain-com-explorer",
    name: "Blockchain.com Explorer (Bitcoin)",
    category: "blockchain",
    acceptedInputTypes: ["wallet"],
    url: "https://www.blockchain.com/explorer",
    searchUrlTemplate: "https://www.blockchain.com/explorer/addresses/btc/{query}",
    mode: "external_link",
    limits: "Bitcoin uniquement.",
    status: "active",
  },
  {
    id: "oxt-me",
    name: "OXT (analyse de clusters Bitcoin)",
    category: "blockchain",
    acceptedInputTypes: ["wallet"],
    url: "https://oxt.me",
    searchUrlTemplate: "https://oxt.me/address/{query}",
    mode: "external_link",
    limits: "Bitcoin uniquement, projet communautaire à disponibilité variable.",
    status: "active",
  },

  // --- Analyse de domaines ---
  {
    id: "whois",
    name: "WHOIS (who.is)",
    category: "domaines",
    acceptedInputTypes: ["domain_ip"],
    url: "https://who.is",
    searchUrlTemplate: "https://who.is/whois/{query}",
    mode: "external_link",
    limits: "De nombreux registrars masquent désormais les données WHOIS (RGPD).",
    status: "active",
  },
  {
    id: "crt-sh",
    name: "crt.sh (certificats TLS/SSL)",
    category: "domaines",
    acceptedInputTypes: ["domain_ip"],
    url: "https://crt.sh",
    searchUrlTemplate: "https://crt.sh/?q={query}",
    mode: "external_link",
    limits: "Journaux de transparence des certificats — révèle souvent des sous-domaines non publics.",
    status: "active",
  },
  {
    id: "urlscan",
    name: "urlscan.io",
    category: "domaines",
    acceptedInputTypes: ["domain_ip"],
    url: "https://urlscan.io",
    searchUrlTemplate: "https://urlscan.io/search/#{query}",
    mode: "external_link",
    limits: "Scans déjà soumis par d'autres utilisateurs ; lancer un nouveau scan expose l'URL publiquement.",
    status: "active",
  },
  {
    id: "securitytrails",
    name: "SecurityTrails (historique DNS)",
    category: "domaines",
    acceptedInputTypes: ["domain_ip"],
    url: "https://securitytrails.com",
    searchUrlTemplate: "https://securitytrails.com/domain/{query}/dns",
    mode: "manual_import",
    limits: "Palier gratuit très limité, compte requis au-delà.",
    status: "active",
  },
];

export function connectorsForInputType(inputType: InputType): Connector[] {
  return CONNECTORS.filter((c) => c.acceptedInputTypes.includes(inputType));
}

export function buildConnectorUrl(connector: Connector, query: string): string {
  if (!connector.searchUrlTemplate) return connector.url;
  return connector.searchUrlTemplate.replace("{query}", encodeURIComponent(query));
}
