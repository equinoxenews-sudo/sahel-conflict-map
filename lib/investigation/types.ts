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
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
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
  /** Coordonnées rattachées à la fiche (e-mail, téléphone, comptes, lieux…). */
  attributes?: EntityAttribute[];
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

export interface Relation {
  id: string;
  dossierId: string;
  sourceEntityId: string;
  targetEntityId: string;
  label: string;
  status: RelationStatus;
  justifyingSourceId: string | null;
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
export interface InvestigationData {
  version: 1;
  dossiers: Dossier[];
  sources: Source[];
  entities: InvestigationEntity[];
  relations: Relation[];
  notes: Note[];
  canvasCards: CanvasCard[];
  canvasLinks: CanvasLink[];
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
  };
}
