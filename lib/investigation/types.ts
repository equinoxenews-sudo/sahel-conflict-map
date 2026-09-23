// Core data model for Équinoxe Investigation (V1, localStorage-backed —
// see storage.ts). Every id is a client-generated string (crypto.randomUUID)
// since there is no server assigning ids in this version.

export type EntityType = "person" | "organization" | "location" | "event" | "document" | "account";

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: "Personne",
  organization: "Organisation",
  location: "Lieu",
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
