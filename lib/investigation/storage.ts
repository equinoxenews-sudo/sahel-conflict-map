import {
  CanvasCard,
  CanvasLink,
  Dossier,
  InvestigationData,
  InvestigationEntity,
  Note,
  Relation,
  Source,
  emptyInvestigationData,
} from "./types";
import { extractImageIds, replaceImageIds } from "./imageRefs";
import type { MergePlan } from "./merge";
import { applyEntityMerge } from "./mergeData";
import { blobToDataUrl, dataUrlToBlob, deleteImage, getImage, putImage } from "./imageStore";

const STORAGE_KEY = "equinoxe-investigation-v1";

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Everything the UI needs to read/write investigation data. The only
 * implementation today is localStorage-backed (`createLocalStorageEngine`)
 * — no auth/RLS exists yet in this project (see plan notes), so real
 * dossiers must never live in a public Supabase table. Keeping every
 * read/write behind this interface means a future Supabase+auth
 * implementation can be swapped in without touching any component.
 */
export interface InvestigationStorage {
  load(): InvestigationData;
  /** Registers a change listener, returns an unsubscribe function — the shape useSyncExternalStore wants. */
  subscribe(listener: () => void): () => void;

  createDossier(name: string, description: string): Dossier;
  renameDossier(id: string, name: string, description: string): void;
  deleteDossier(id: string): void;
  /** « Ignorer » une paire de doublons possibles : elle n'est plus suggérée. */
  dismissDuplicate(dossierId: string, pairKey: string): void;

  addSource(input: Omit<Source, "id" | "createdAt">): Source;
  updateSource(id: string, patch: Partial<Omit<Source, "id" | "dossierId" | "createdAt">>): void;
  deleteSource(id: string): void;

  addEntity(input: Omit<InvestigationEntity, "id" | "createdAt">): InvestigationEntity;
  updateEntity(id: string, patch: Partial<Omit<InvestigationEntity, "id" | "dossierId" | "createdAt">>): void;
  deleteEntity(id: string): void;

  addRelation(input: Omit<Relation, "id" | "createdAt">): Relation;
  updateRelation(id: string, patch: Partial<Omit<Relation, "id" | "dossierId" | "createdAt">>): void;
  deleteRelation(id: string): void;

  addNote(input: Omit<Note, "id" | "createdAt" | "updatedAt">): Note;
  updateNote(id: string, patch: Partial<Omit<Note, "id" | "dossierId" | "createdAt">>): void;
  deleteNote(id: string): void;

  addCanvasCard(input: Omit<CanvasCard, "id">): CanvasCard;
  updateCanvasCard(id: string, patch: Partial<Omit<CanvasCard, "id" | "dossierId">>): void;
  deleteCanvasCard(id: string): void;

  addCanvasLink(input: Omit<CanvasLink, "id">): CanvasLink;
  deleteCanvasLink(id: string): void;

  /** Fusionne la seconde fiche dans la principale, d'un seul bloc. Renvoie les données avant et après
   * (pour « Annuler la fusion »), ou null si la fusion est impossible. */
  mergeEntities(primaryId: string, secondaryId: string, plan: MergePlan): { before: InvestigationData; after: InvestigationData } | null;
  /** Annule une fusion : rétablit `before` si rien n'a changé depuis `after`. Renvoie false sinon. */
  restoreSnapshot(before: InvestigationData, after: InvestigationData): boolean;
  /** JSON du dossier ; les images importées y sont incluses (en data URL) pour qu'un export les emporte. */
  exportDossier(dossierId: string): Promise<string>;
  /** Returns the imported dossier's new id (ids are regenerated to avoid collisions). */
  importDossier(json: string): Promise<string>;
}

/** Fichier d'export : le dossier plus ses images importées, par identifiant. */
interface ExportBundle extends InvestigationData {
  images?: Record<string, string>;
}

// Le stockage des images est asynchrone et indépendant de localStorage : une
// erreur de suppression ne doit jamais bloquer la mise à jour des données.
function discardImages(ids: (string | undefined)[]): void {
  for (const id of ids) if (id) void deleteImage(id).catch(() => undefined);
}

type Listener = () => void;

function remapAttributeRef(
  ref: Note["attributeRef"],
  entityIdMap: Map<string, string>,
  attributeIdMap: Map<string, string>
): Note["attributeRef"] {
  if (!ref) return undefined;
  const entityId = entityIdMap.get(ref.entityId);
  const attributeId = attributeIdMap.get(ref.attributeId);
  return entityId && attributeId ? { entityId, attributeId } : undefined;
}

function readRaw(): InvestigationData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyInvestigationData();
    const parsed = JSON.parse(raw) as Partial<InvestigationData>;
    return {
      version: 1,
      dossiers: parsed.dossiers ?? [],
      sources: parsed.sources ?? [],
      entities: parsed.entities ?? [],
      relations: parsed.relations ?? [],
      notes: parsed.notes ?? [],
      canvasCards: parsed.canvasCards ?? [],
      canvasLinks: parsed.canvasLinks ?? [],
    };
  } catch {
    return emptyInvestigationData();
  }
}

function writeRaw(data: InvestigationData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Creates a localStorage-backed InvestigationStorage. Mutations
 * read-modify-write an in-memory cached copy (fine at this scale: one
 * analyst, browser-local, no concurrent writers) and notify subscribers so
 * React components can re-render — see InvestigationContext.tsx.
 *
 * `load()` must return the exact same object reference across calls until
 * something actually changes — useSyncExternalStore calls it on every
 * render to check for consistency, and a fresh object each time (e.g.
 * re-parsing localStorage on every call) makes it loop forever. `cached`
 * is only ever replaced by `mutate()`, right before it calls `emit()`.
 */
export function createLocalStorageEngine(): InvestigationStorage {
  const listeners = new Set<Listener>();
  let cached: InvestigationData = readRaw();

  function emit() {
    for (const l of listeners) l();
  }

  function mutate(fn: (data: InvestigationData) => void): void {
    const next = { ...cached };
    fn(next);
    writeRaw(next);
    cached = next;
    emit();
  }

  return {
    load: () => cached,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    // Every mutation below replaces the arrays/objects it touches instead
    // of mutating them in place (push, Object.assign on a found item...).
    // Hook consumers (InvestigationContext.tsx) memoize on array identity,
    // so an in-place push would leave `data.entities` pointing at the same
    // array reference and the change would never be picked up.

    createDossier(name, description) {
      const dossier: Dossier = {
        id: newId(),
        name,
        description,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      mutate((data) => {
        data.dossiers = [...data.dossiers, dossier];
      });
      return dossier;
    },

    renameDossier(id, name, description) {
      mutate((data) => {
        data.dossiers = data.dossiers.map((d) =>
          d.id === id ? { ...d, name, description, updatedAt: nowIso() } : d
        );
      });
    },

    deleteDossier(id) {
      discardImages([
        ...cached.entities.filter((e) => e.dossierId === id).map((e) => e.imageId),
        ...cached.notes.filter((n) => n.dossierId === id).flatMap((n) => extractImageIds(n.body)),
      ]);
      mutate((data) => {
        data.dossiers = data.dossiers.filter((d) => d.id !== id);
        data.sources = data.sources.filter((s) => s.dossierId !== id);
        data.entities = data.entities.filter((e) => e.dossierId !== id);
        data.relations = data.relations.filter((r) => r.dossierId !== id);
        data.notes = data.notes.filter((n) => n.dossierId !== id);
        data.canvasCards = data.canvasCards.filter((c) => c.dossierId !== id);
        data.canvasLinks = data.canvasLinks.filter((l) => l.dossierId !== id);
      });
    },

    dismissDuplicate(dossierId, pairKey) {
      mutate((data) => {
        data.dossiers = data.dossiers.map((d) =>
          d.id === dossierId ? { ...d, dismissedDuplicates: [...new Set([...(d.dismissedDuplicates ?? []), pairKey])] } : d
        );
      });
    },

    mergeEntities(primaryId, secondaryId, plan) {
      const merged = applyEntityMerge(cached, primaryId, secondaryId, plan);
      if (!merged) return null;
      const before = cached;
      mutate((data) => {
        data.entities = merged.entities;
        data.relations = merged.relations;
        data.notes = merged.notes;
      });
      return { before, after: cached };
    },

    restoreSnapshot(before, after) {
      // Refusé si autre chose a été modifié depuis : on n'écrase jamais un travail plus récent.
      if (cached !== after) return false;
      writeRaw(before);
      cached = before;
      emit();
      return true;
    },

    addSource(input) {
      const source: Source = { ...input, id: newId(), createdAt: nowIso() };
      mutate((data) => {
        data.sources = [...data.sources, source];
      });
      return source;
    },
    updateSource(id, patch) {
      mutate((data) => {
        data.sources = data.sources.map((s) => (s.id === id ? { ...s, ...patch } : s));
      });
    },
    deleteSource(id) {
      mutate((data) => {
        data.sources = data.sources.filter((s) => s.id !== id);
      });
    },

    addEntity(input) {
      const entity: InvestigationEntity = { ...input, id: newId(), createdAt: nowIso() };
      mutate((data) => {
        data.entities = [...data.entities, entity];
      });
      return entity;
    },
    updateEntity(id, patch) {
      // Une image importée remplacée ou retirée est supprimée d'IndexedDB.
      const previous = cached.entities.find((e) => e.id === id);
      if (previous?.imageId && "imageId" in patch && patch.imageId !== previous.imageId) discardImages([previous.imageId]);
      // Une coordonnée supprimée : sa page est conservée, elle devient une note libre.
      const kept = new Set((patch.attributes ?? previous?.attributes ?? []).map((a) => a.id));
      const removed = "attributes" in patch ? (previous?.attributes ?? []).filter((a) => !kept.has(a.id)).map((a) => a.id) : [];
      mutate((data) => {
        data.entities = data.entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
        if (removed.length > 0) {
          data.notes = data.notes.map((n) => (n.attributeRef && removed.includes(n.attributeRef.attributeId) ? { ...n, attributeRef: undefined } : n));
        }
      });
    },
    deleteEntity(id) {
      discardImages([cached.entities.find((e) => e.id === id)?.imageId]);
      mutate((data) => {
        // La fiche texte d'une entité supprimée est conservée : elle devient une note libre.
        data.notes = data.notes.map((n) => ({
          ...n,
          entityId: n.entityId === id ? undefined : n.entityId,
          attributeRef: n.attributeRef?.entityId === id ? undefined : n.attributeRef,
        }));
        data.entities = data.entities.filter((e) => e.id !== id);
        data.relations = data.relations.filter((r) => r.sourceEntityId !== id && r.targetEntityId !== id);
      });
    },

    addRelation(input) {
      const relation: Relation = { ...input, id: newId(), createdAt: nowIso() };
      mutate((data) => {
        data.relations = [...data.relations, relation];
      });
      return relation;
    },
    updateRelation(id, patch) {
      mutate((data) => {
        data.relations = data.relations.map((r) => (r.id === id ? { ...r, ...patch } : r));
      });
    },
    deleteRelation(id) {
      mutate((data) => {
        data.relations = data.relations.filter((r) => r.id !== id);
      });
    },

    addNote(input) {
      const note: Note = { ...input, id: newId(), createdAt: nowIso(), updatedAt: nowIso() };
      mutate((data) => {
        data.notes = [...data.notes, note];
      });
      return note;
    },
    updateNote(id, patch) {
      mutate((data) => {
        data.notes = data.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: nowIso() } : n));
      });
    },
    deleteNote(id) {
      const note = cached.notes.find((n) => n.id === id);
      if (note) discardImages(extractImageIds(note.body));
      mutate((data) => {
        data.notes = data.notes.filter((n) => n.id !== id);
      });
    },

    addCanvasCard(input) {
      const card: CanvasCard = { ...input, id: newId() };
      mutate((data) => {
        data.canvasCards = [...data.canvasCards, card];
      });
      return card;
    },
    updateCanvasCard(id, patch) {
      mutate((data) => {
        data.canvasCards = data.canvasCards.map((c) => (c.id === id ? { ...c, ...patch } : c));
      });
    },
    deleteCanvasCard(id) {
      mutate((data) => {
        data.canvasCards = data.canvasCards.filter((c) => c.id !== id);
        data.canvasLinks = data.canvasLinks.filter((l) => l.fromCardId !== id && l.toCardId !== id);
      });
    },

    addCanvasLink(input) {
      const link: CanvasLink = { ...input, id: newId() };
      mutate((data) => {
        data.canvasLinks = [...data.canvasLinks, link];
      });
      return link;
    },
    deleteCanvasLink(id) {
      mutate((data) => {
        data.canvasLinks = data.canvasLinks.filter((l) => l.id !== id);
      });
    },

    async exportDossier(dossierId) {
      const data = cached;
      const entities = data.entities.filter((e) => e.dossierId === dossierId);
      const images: Record<string, string> = {};
      const notes = data.notes.filter((n) => n.dossierId === dossierId);
      const imageIds = [...entities.flatMap((e) => (e.imageId ? [e.imageId] : [])), ...notes.flatMap((n) => extractImageIds(n.body))];
      for (const imageId of new Set(imageIds)) {
        const blob = await getImage(imageId).catch(() => null);
        if (blob) images[imageId] = await blobToDataUrl(blob);
      }
      const bundle: ExportBundle = {
        version: 1,
        images,
        dossiers: data.dossiers.filter((d) => d.id === dossierId),
        sources: data.sources.filter((s) => s.dossierId === dossierId),
        entities,
        relations: data.relations.filter((r) => r.dossierId === dossierId),
        notes,
        canvasCards: data.canvasCards.filter((c) => c.dossierId === dossierId),
        canvasLinks: data.canvasLinks.filter((l) => l.dossierId === dossierId),
      };
      return JSON.stringify(bundle, null, 2);
    },

    async importDossier(json) {
      const parsed = JSON.parse(json) as ExportBundle;
      // Chaque image du fichier reçoit un nouvel identifiant, comme le reste.
      const imageIdMap = new Map<string, string>();
      for (const [oldId, dataUrl] of Object.entries(parsed.images ?? {})) {
        try {
          imageIdMap.set(oldId, await putImage(await dataUrlToBlob(dataUrl)));
        } catch {
          // image illisible : la fiche s'importe sans elle
        }
      }
      const newDossierId = newId();
      const entityIdMap = new Map<string, string>();
      const attributeIdMap = new Map<string, string>();
      const sourceIdMap = new Map<string, string>();
      const cardIdMap = new Map<string, string>();

      const [importedDossier] = parsed.dossiers;
      const newDossier: Dossier = {
        id: newDossierId,
        name: importedDossier ? `${importedDossier.name} (importé)` : "Dossier importé",
        description: importedDossier?.description ?? "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      const newSources: Source[] = (parsed.sources ?? []).map((s) => {
        const id = newId();
        sourceIdMap.set(s.id, id);
        return { ...s, id, dossierId: newDossierId };
      });
      const newEntities: InvestigationEntity[] = (parsed.entities ?? []).map((e) => {
        const id = newId();
        entityIdMap.set(e.id, id);
        return {
          ...e,
          id,
          dossierId: newDossierId,
          imageId: e.imageId ? imageIdMap.get(e.imageId) : undefined,
          // Les sources reçoivent de nouveaux identifiants : les coordonnées qui s'y réfèrent suivent.
          attributes: e.attributes?.map((attribute) => {
            const attributeId = newId();
            attributeIdMap.set(attribute.id, attributeId);
            return {
              ...attribute,
              id: attributeId,
              sourceId: attribute.sourceId ? sourceIdMap.get(attribute.sourceId) : undefined,
            };
          }),
        };
      });
      const newRelations: Relation[] = (parsed.relations ?? [])
        .map((r) => {
          const sourceEntityId = entityIdMap.get(r.sourceEntityId);
          const targetEntityId = entityIdMap.get(r.targetEntityId);
          if (!sourceEntityId || !targetEntityId) return null;
          const relation: Relation = {
            ...r,
            id: newId(),
            dossierId: newDossierId,
            sourceEntityId,
            targetEntityId,
            justifyingSourceId: r.justifyingSourceId ? (sourceIdMap.get(r.justifyingSourceId) ?? null) : null,
          };
          return relation;
        })
        .filter((r): r is Relation => r !== null);
      const newNotes: Note[] = (parsed.notes ?? []).map((n) => ({
        ...n,
        id: newId(),
        dossierId: newDossierId,
        linkedSourceIds: n.linkedSourceIds.map((id) => sourceIdMap.get(id)).filter((id): id is string => !!id),
        linkedEntityIds: n.linkedEntityIds.map((id) => entityIdMap.get(id)).filter((id): id is string => !!id),
        entityId: n.entityId ? entityIdMap.get(n.entityId) : undefined,
        attributeRef: remapAttributeRef(n.attributeRef, entityIdMap, attributeIdMap),
        body: replaceImageIds(n.body, imageIdMap),
      }));
      const newCanvasCards: CanvasCard[] = (parsed.canvasCards ?? []).map((c) => {
        const id = newId();
        cardIdMap.set(c.id, id);
        let refId = c.refId;
        if (refId) {
          refId =
            (c.kind === "source" ? sourceIdMap.get(refId) : c.kind === "entity" ? entityIdMap.get(refId) : refId) ??
            null;
        }
        return { ...c, id, dossierId: newDossierId, refId };
      });
      const newCanvasLinks: CanvasLink[] = (parsed.canvasLinks ?? [])
        .map((l) => {
          const fromCardId = cardIdMap.get(l.fromCardId);
          const toCardId = cardIdMap.get(l.toCardId);
          if (!fromCardId || !toCardId) return null;
          const link: CanvasLink = { id: newId(), dossierId: newDossierId, fromCardId, toCardId };
          return link;
        })
        .filter((l): l is CanvasLink => l !== null);

      mutate((data) => {
        data.dossiers = [...data.dossiers, newDossier];
        data.sources = [...data.sources, ...newSources];
        data.entities = [...data.entities, ...newEntities];
        data.relations = [...data.relations, ...newRelations];
        data.notes = [...data.notes, ...newNotes];
        data.canvasCards = [...data.canvasCards, ...newCanvasCards];
        data.canvasLinks = [...data.canvasLinks, ...newCanvasLinks];
      });

      return newDossierId;
    },
  };
}
