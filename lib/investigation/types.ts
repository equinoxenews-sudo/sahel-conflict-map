// Core data model for Équinoxe Investigation (V1, localStorage-backed —
// see storage.ts). Every id is a client-generated string (crypto.randomUUID)
// since there is no server assigning ids in this version.

export type EntityType =
  | "person"
  | "organization"
  | "location"
  | "building"
  | "equipment"
  | "event"
  | "document"
  | "account";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Personne",
  organization: "Organisation",
  location: "Lieu",
  building: "Édifice",
  equipment: "Matériel",
  event: "Événement",
  document: "Document",
  account: "Compte public",
};

export type RelationStatus = "documented" | "hypothesis";

export const RELATION_STATUS_LABELS: Record<RelationStatus, string> = {
  documented: "Documentée",
  hypothesis: "Hypothèse",
};

// Applies to both Source and Note — keeps the observed/hypothesis/
// conclusion distinction the spec asks for wherever an analyst writes
// something down, not just on sources.
export type ClaimType = "observed" | "hypothesis" | "conclusion";

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  observed: "Information observée",
  hypothesis: "Hypothèse",
  conclusion: "Conclusion",
};

export interface Dossier {
  id: string;
  /** Paires de fiches « ignorées » dans les suggestions de doublons (clés `idA|idB`, voir duplicates.ts). */
  dismissedDuplicates?: string[];
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** Document joint à une source (PDF, photo, capture) : le fichier est dans IndexedDB (lib/investigation/fileStore.ts). */
export interface SourceFile {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export interface Source {
  id: string;
  dossierId: string;
  title: string;
  url: string;
  platform: string;
  publishedAt: string | null;
  collectedAt: string;
  summary: string;
  tags: string[];
  reliability: 1 | 2 | 3 | 4 | 5;
  notes: string;
  claimType: ClaimType;
  /** Document-preuve joint (la source peut n'avoir qu'un document, sans adresse : `url` est alors vide). */
  file?: SourceFile;
  createdAt: string;
}

export interface EntityPosition {
  x: number;
  y: number;
}

export interface InvestigationEntity {
  id: string;
  dossierId: string;
  type: EntityType;
  name: string;
  aliases: string[];
  notes: string;
  position: EntityPosition;
  createdAt: string;
  /** Ligne sous le nom sur la carte : fonction (« Parc Manager »), nature (« ONG »)… */
  role?: string;
  /** Code ISO 2 du pays (drapeau hexagonal sur la carte), voir lib/countryFlagIndex.ts. */
  countryIso2?: string;
  /** Libellé affiché à côté du drapeau (« Béninois ») ; à défaut, le nom du pays. */
  countryLabel?: string;
  /** Image importée depuis l'ordinateur : clé dans IndexedDB (lib/investigation/imageStore.ts). */
  imageId?: string;
  /** Image désignée par une adresse web ; l'image importée est prioritaire. */
  imageUrl?: string;
  /** Position épinglée : la mise en page automatique ne la déplace pas. */
  pinned?: boolean;
  /** Coordonnées rattachées à la fiche (e-mail, téléphone, comptes, lieux…). */
  attributes?: EntityAttribute[];
  /** Coordonnées repliées sur la carte du graphe (seule la carte principale reste visible). */
  attributesCollapsed?: boolean;
  /** Cadenas fermé : la fiche est enregistrée et protégée (ni déplacée, ni modifiée, ni supprimée). */
  locked?: boolean;
}

export type AttributeKind = "email" | "phone" | "social" | "website" | "location" | "identifier";

export const ATTRIBUTE_KIND_LABELS: Record<AttributeKind, string> = {
  email: "E-mail",
  phone: "Téléphone",
  social: "Réseau social",
  website: "Site web",
  location: "Localisation",
  identifier: "Identifiant",
};

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "tiktok"
  | "vk"
  | "ok"
  | "telegram"
  | "youtube"
  | "whatsapp"
  | "bluesky"
  | "reddit"
  | "github"
  | "signal"
  | "other";

/** Une coordonnée d'une fiche, avec son statut (documentée ou supposée) et sa source. */
export interface EntityAttribute {
  id: string;
  kind: AttributeKind;
  /** Réseau social, quand kind === "social". */
  platform?: SocialPlatform;
  /** Nom de l'identifiant, quand kind === "identifier" (« Immatriculation », « N° de série »…). */
  label?: string;
  /** L'adresse e-mail, le numéro, le pseudo, le lieu, l'identifiant ou l'adresse du site. */
  value: string;
  /** Réseau social : identifiant numérique du compte. */
  secondary?: string;
  /** Réseau social ou site web : adresse du profil ou de la page. */
  url?: string;
  /** Lieu : code ISO 2 du pays (drapeau hexagonal). */
  countryIso2?: string;
  /** Pointillé sur le graphe quand la coordonnée est seulement supposée. */
  status: RelationStatus;
  sourceId?: string;
}

/** Point d'ancrage d'une fiche : coins (tl, tr, bl, br) et milieux des côtés (tc, ml, mr, bc). */
export type AnchorId = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";

/** Forme du trait d'une relation : droit (par défaut), courbe ou coude. */
export type LineStyle = "straight" | "curve" | "elbow";

export interface Relation {
  id: string;
  dossierId: string;
  sourceEntityId: string;
  targetEntityId: string;
  label: string;
  status: RelationStatus;
  justifyingSourceId: string | null;
  /** Type du catalogue (lib/investigation/relationTypes.ts) ; absent = libellé libre. */
  typeKey?: string;
  /** Le trait du graphe affiche la lecture inverse du type (« est dirigé par » au lieu de « dirige »). */
  labelInverse?: boolean;
  /** Point d'ancrage du trait sur la fiche source ; absent = choisi automatiquement. */
  sourceAnchor?: AnchorId;
  /** Point d'ancrage du trait sur la fiche cible ; absent = choisi automatiquement. */
  targetAnchor?: AnchorId;
  /** Forme du trait ; absent = droit. */
  lineStyle?: LineStyle;
  /** Période de validité en texte libre (« depuis 2021 », « jusqu'en mars 2025 »). */
  period?: string;
  /** 0-100 — a manual confidence estimate, not a computed score. */
  confidence: number;
  createdAt: string;
}

export interface Note {
  id: string;
  dossierId: string;
  title: string;
  body: string;
  claimType: ClaimType;
  linkedSourceIds: string[];
  linkedEntityIds: string[];
  /** Fiche texte d'une entité du graphe : une entité a au plus une note. Absent pour une note libre. */
  entityId?: string;
  /** Page d'une coordonnée (téléphone, compte, e-mail…) d'une entité : une page par coordonnée. */
  attributeRef?: { entityId: string; attributeId: string };
  /** Cadenas fermé : la note est enregistrée et protégée contre les modifications. */
  locked?: boolean;
  /** Place dans la liste des fiches ou des notes (ordre choisi à la main) ; absent = ordre alphabétique. */
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export type CanvasCardKind = "text" | "source" | "entity" | "note";

export interface CanvasCard {
  id: string;
  dossierId: string;
  kind: CanvasCardKind;
  /** Set when kind !== "text" — id of the linked Source/Entity/Note. */
  refId: string | null;
  text: string;
  position: EntityPosition;
}

export interface CanvasLink {
  id: string;
  dossierId: string;
  fromCardId: string;
  toCardId: string;
}

/** The full shape persisted to localStorage / exported as JSON. */
/** Forme ou annotation posée librement sur le graphe (boîte à outils). */
export type ShapeKind = "rect" | "roundRect" | "ellipse" | "triangle" | "diamond" | "line" | "arrow" | "text";

export interface GraphShape {
  id: string;
  dossierId: string;
  kind: ShapeKind;
  position: { x: number; y: number };
  width: number;
  height: number;
  /** Couleur de remplissage (#rrggbb) ; absente = aucun remplissage. */
  fill?: string;
  /** Opacité du remplissage, de 0 à 1 (1 par défaut). */
  fillOpacity?: number;
  /** Couleur du contour (#rrggbb) ; absente = aucun contour. */
  stroke?: string;
  /** Épaisseur du contour en pixels (2 par défaut). */
  strokeWidth?: number;
  /** Texte écrit dans la forme (ou texte libre pour le type « text »). */
  text?: string;
  textColor?: string;
  fontSize?: number;
  /** Ligne et flèche : suit l'autre diagonale du cadre (bas-gauche vers haut-droite). */
  flipped?: boolean;
  /** Ordre des couches : les fiches du graphe sont à 0, les formes à valeur positive passent devant,
   * à valeur négative derrière. */
  z: number;
  locked?: boolean;
  createdAt: string;
}

export interface InvestigationData {
  version: 1;
  dossiers: Dossier[];
  sources: Source[];
  entities: InvestigationEntity[];
  relations: Relation[];
  notes: Note[];
  canvasCards: CanvasCard[];
  canvasLinks: CanvasLink[];
  /** Formes et annotations du graphe. */
  shapes: GraphShape[];
}

export function emptyInvestigationData(): InvestigationData {
  return {
    version: 1,
    dossiers: [],
    sources: [],
    entities: [],
    relations: [],
    notes: [],
    canvasCards: [],
    canvasLinks: [],
    shapes: [],
  };
}
