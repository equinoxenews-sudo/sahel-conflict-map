import {
  CanvasCard,
  CanvasLink,
  Dossier,
  GraphShape,
  InvestigationData,
  InvestigationEntity,
  Note,
  Relation,
  Source,
  emptyInvestigationData,
} from "./types";
import { isCoverImage } from "./cover";
import { extractImageIds, replaceImageIds } from "./imageRefs";
import { applyGraphSlice, type GraphSlice } from "./graphHistory";
import type { MergePlan } from "./merge";
import { applyEntityMerge } from "./mergeData";
import { replaceCitationIds } from "./citations";
import { deleteFile, getFile, putFile } from "./fileStore";
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
  /** Photo de présentation du dossier (data URL) ; `null` la retire. */
  setDossierCover(id: string, cover: string | null): void;
  deleteDossier(id: string): void;
  /** « Ignorer » une paire de doublons possibles : elle n'est plus suggérée. */
  dismissDuplicate(dossierId: string, pairKey: string): void;

  addSource(input: Omit<Source, "id" | "createdAt">): Source;
  updateSource(id: string, patch: Partial<Omit<Source, "id" | "dossierId" | "createdAt">>): void;
  deleteSource(id: string): void;

  addEntity(input: Omit<InvestigationEntity, "id" | "createdAt">): InvestigationEntity;
  updateEntity(id: string, patch: Partial<Omit<InvestigationEntity, "id" | "dossierId" | "createdAt">>): void;
  deleteEntity(id: string): void;
  /** Déplace plusieurs fiches d'un seul coup (mise en page automatique) : une seule écriture. */
  setEntityPositions(positions: Record<string, { x: number; y: number }>): void;

  addRelation(input: Omit<Relation, "id" | "createdAt">): Relation;
  updateRelation(id: string, patch: Partial<Omit<Relation, "id" | "dossierId" | "createdAt">>): void;
  deleteRelation(id: string): void;

  addNote(input: Omit<Note, "id" | "createdAt" | "updatedAt">): Note;
  updateNote(id: string, patch: Partial<Omit<Note, "id" | "dossierId" | "createdAt">>): void;
  deleteNote(id: string): void;
  /** Fixe l'ordre de la liste des notes et fiches (ordre manuel) sans changer leur date de modification. */
  setNoteOrders(orders: Record<string, number>): void;

  addCanvasCard(input: Omit<CanvasCard, "id">): CanvasCard;
  updateCanvasCard(id: string, patch: Partial<Omit<CanvasCard, "id" | "dossierId">>): void;
  deleteCanvasCard(id: string): void;

  addCanvasLink(input: Omit<CanvasLink, "id">): CanvasLink;
  deleteCanvasLink(id: string): void;

  addShape(input: Omit<GraphShape, "id" | "createdAt">): GraphShape;
  updateShape(id: string, patch: Partial<Omit<GraphShape, "id" | "dossierId" | "createdAt">>): void;
  /** Change plusieurs formes d'un coup (ordre des couches) : une seule écriture. */
  setShapeLayers(layers: Record<string, number>): void;
  deleteShape(id: string): void;

  /** Fusionne la seconde fiche dans la principale, d'un seul bloc. Renvoie les données avant et après
   * (pour « Annuler la fusion »), ou null si la fusion est impossible. */
  mergeEntities(primaryId: string, secondaryId: string, plan: MergePlan): { before: InvestigationData; after: InvestigationData } | null;
  /** Annule une fusion : rétablit `before` si rien n'a changé depuis `after`. Renvoie false sinon. */
  restoreSnapshot(before: InvestigationData, after: InvestigationData): boolean;
  /** Annuler / rétablir dans le graphe : remet les fiches, relations et formes du dossier dans l'état de l'instantané. */
  restoreGraph(dossierId: string, slice: GraphSlice): void;
  /** JSON du dossier ; les images importées y sont incluses (en data URL) pour qu'un export les emporte. */
  exportDossier(dossierId: string, options?: { includeFiles?: boolean }): Promise<string>;
  /** Returns the imported dossier's id. Par défaut les identifiants sont régénérés (le dossier arrive en
   * copie « (importé) »). Avec `keepIds`, le dossier garde ses identifiants et REMPLACE celui qui porte le
   * même identifiant (récupération depuis la copie en ligne). */
  importDossier(json: string, options?: { keepIds?: boolean }): Promise<string>;
}

/** Fichier d'export : le dossier plus ses images importées, par identifiant. */
interface ExportBundle extends InvestigationData {
  images?: Record<string, string>;
  /** Documents-preuves des sources, par identifiant de fichier (data URL). Absents d'une sauvegarde automatique. */
  files?: Record<string, string>;
}

// Le stockage des images est asynchrone et indépendant de localStorage : une
// erreur de suppression ne doit jamais bloquer la mise à jour des données.
function discardImages(ids: (string | undefined)[]): void {
  for (const id of ids) if (id) void deleteImage(id).catch(() => undefined);
}

// Même principe pour les documents-preuves des sources.
function discardFiles(ids: (string | undefined)[]): void {
  for (const id of ids) if (id) void deleteFile(id).catch(() => undefined);
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

function parseRaw(raw: string | null): InvestigationData | null {
  if (!raw) return emptyInvestigationData();
  try {
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
      shapes: parsed.shapes ?? [],
    };
  } catch {
    return null;
  }
}

function readRaw(): InvestigationData {
  try {
    return parseRaw(window.localStorage.getItem(STORAGE_KEY)) ?? emptyInvestigationData();
  } catch {
    return emptyInvestigationData();
  }
}

/** Données du navigateur à l'instant T, ou null si elles sont illisibles (on n'écrase alors rien). */
function readLatest(): { data: InvestigationData; raw: string | null } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data = parseRaw(raw);
    return data ? { data, raw } : null;
  } catch {
    return null;
  }
}

function writeRaw(data: InvestigationData): string {
  const raw = JSON.stringify(data);
  window.localStorage.setItem(STORAGE_KEY, raw);
  return raw;
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
  // Dernier contenu connu du navigateur : sert à détecter qu'un autre onglet a modifié les données.
  let lastRaw: string | null = null;
  try {
    lastRaw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    lastRaw = null;
  }

  function emit() {
    for (const l of listeners) l();
  }

  // Plusieurs onglets (ou une récupération depuis la copie en ligne) peuvent modifier les données
  // du navigateur : cet onglet reprend alors la version la plus récente au lieu d'écraser le travail
  // des autres avec sa copie en mémoire.
  function syncFromBrowser() {
    const latest = readLatest();
    if (!latest || latest.raw === lastRaw) return;
    lastRaw = latest.raw;
    cached = latest.data;
    emit();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === null || event.key === STORAGE_KEY) syncFromBrowser();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncFromBrowser();
    });
  }

  function mutate(fn: (data: InvestigationData) => void): void {
    // Toute modification s'applique aux données les plus récentes du navigateur, pas à la copie
    // éventuellement périmée de cet onglet.
    const latest = readLatest();
    const next = { ...(latest ? latest.data : cached) };
    fn(next);
    lastRaw = writeRaw(next);
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

    setDossierCover(id, cover) {
      mutate((data) => {
        data.dossiers = data.dossiers.map((d) => {
          if (d.id !== id) return d;
          const next: Dossier = { ...d, updatedAt: nowIso() };
          if (cover) next.coverImage = cover;
          else delete next.coverImage;
          return next;
        });
      });
    },

    deleteDossier(id) {
      discardFiles(cached.sources.filter((s) => s.dossierId === id).map((s) => s.file?.id));
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
        data.shapes = data.shapes.filter((s) => s.dossierId !== id);
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

    restoreGraph(dossierId, slice) {
      const latest = readLatest();
      const base = latest ? latest.data : cached;
      const next = applyGraphSlice(base, dossierId, slice);
      lastRaw = writeRaw(next);
      cached = next;
      emit();
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
      discardFiles([cached.sources.find((s) => s.id === id)?.file?.id]);
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
    setEntityPositions(positions) {
      mutate((data) => {
        data.entities = data.entities.map((e) => (positions[e.id] ? { ...e, position: positions[e.id] } : e));
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
    setNoteOrders(orders) {
      mutate((data) => {
        data.notes = data.notes.map((n) => (n.id in orders ? { ...n, sortOrder: orders[n.id] } : n));
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

    addShape(input) {
      const shape: GraphShape = { ...input, id: newId(), createdAt: nowIso() };
      mutate((data) => {
        data.shapes = [...data.shapes, shape];
      });
      return shape;
    },
    updateShape(id, patch) {
      mutate((data) => {
        data.shapes = data.shapes.map((s) => (s.id === id ? { ...s, ...patch } : s));
      });
    },
    setShapeLayers(layers) {
      mutate((data) => {
        data.shapes = data.shapes.map((s) => (s.id in layers ? { ...s, z: layers[s.id] } : s));
      });
    },
    deleteShape(id) {
      mutate((data) => {
        data.shapes = data.shapes.filter((s) => s.id !== id);
      });
    },

    async exportDossier(dossierId, options) {
      // Les données les plus récentes du navigateur : un onglet resté ouvert ne doit pas envoyer une version périmée.
      const data = readLatest()?.data ?? cached;
      const entities = data.entities.filter((e) => e.dossierId === dossierId);
      const images: Record<string, string> = {};
      const notes = data.notes.filter((n) => n.dossierId === dossierId);
      const imageIds = [...entities.flatMap((e) => (e.imageId ? [e.imageId] : [])), ...notes.flatMap((n) => extractImageIds(n.body))];
      for (const imageId of new Set(imageIds)) {
        const blob = await getImage(imageId).catch(() => null);
        if (blob) images[imageId] = await blobToDataUrl(blob);
      }
      // Documents-preuves : emportés dans l'export, sauf demande contraire (sauvegardes automatiques).
      const files: Record<string, string> = {};
      if (options?.includeFiles !== false) {
        for (const source of data.sources.filter((s) => s.dossierId === dossierId)) {
          if (!source.file) continue;
          const blob = await getFile(source.file.id).catch(() => null);
          if (blob) files[source.file.id] = await blobToDataUrl(blob);
        }
      }
      const bundle: ExportBundle = {
        version: 1,
        images,
        files,
        dossiers: data.dossiers.filter((d) => d.id === dossierId),
        sources: data.sources.filter((s) => s.dossierId === dossierId),
        entities,
        relations: data.relations.filter((r) => r.dossierId === dossierId),
        notes,
        canvasCards: data.canvasCards.filter((c) => c.dossierId === dossierId),
        canvasLinks: data.canvasLinks.filter((l) => l.dossierId === dossierId),
        shapes: (data.shapes ?? []).filter((s) => s.dossierId === dossierId),
      };
      return JSON.stringify(bundle, null, 2);
    },

    async importDossier(json, options) {
      const parsed = JSON.parse(json) as ExportBundle;
      const keep = options?.keepIds === true;
      const mint = (oldId: string) => (keep ? oldId : newId());
      // Chaque image du fichier reçoit un nouvel identifiant, comme le reste.
      const imageIdMap = new Map<string, string>();
      for (const [oldId, dataUrl] of Object.entries(parsed.images ?? {})) {
        try {
          imageIdMap.set(oldId, await putImage(await dataUrlToBlob(dataUrl), keep ? oldId : undefined));
        } catch {
          // image illisible : la fiche s'importe sans elle
        }
      }
      // Documents-preuves du fichier : même traitement que les images (nouvel identifiant, sauf récupération en ligne).
      const fileIdMap = new Map<string, string>();
      for (const [oldId, dataUrl] of Object.entries(parsed.files ?? {})) {
        try {
          fileIdMap.set(oldId, await putFile(await dataUrlToBlob(dataUrl), keep ? oldId : undefined));
        } catch {
          // document illisible : la source s'importe sans lui
        }
      }
      const [importedDossier] = parsed.dossiers;
      const newDossierId = keep && importedDossier ? importedDossier.id : newId();
      const entityIdMap = new Map<string, string>();
      const attributeIdMap = new Map<string, string>();
      const sourceIdMap = new Map<string, string>();
      const cardIdMap = new Map<string, string>();

      const newDossier: Dossier = {
        id: newDossierId,
        name: importedDossier ? (keep ? importedDossier.name : `${importedDossier.name} (importé)`) : "Dossier importé",
        description: importedDossier?.description ?? "",
        ...(isCoverImage(importedDossier?.coverImage) ? { coverImage: importedDossier.coverImage } : {}),
        createdAt: keep && importedDossier ? importedDossier.createdAt : nowIso(),
        updatedAt: keep && importedDossier ? importedDossier.updatedAt : nowIso(),
        ...(keep && importedDossier?.dismissedDuplicates ? { dismissedDuplicates: importedDossier.dismissedDuplicates } : {}),
      };

      const newSources: Source[] = (parsed.sources ?? []).map((s) => {
        const id = mint(s.id);
        sourceIdMap.set(s.id, id);
        return { ...s, id, dossierId: newDossierId, ...(s.file ? { file: { ...s.file, id: fileIdMap.get(s.file.id) ?? s.file.id } } : {}) };
      });
      const newEntities: InvestigationEntity[] = (parsed.entities ?? []).map((e) => {
        const id = mint(e.id);
        entityIdMap.set(e.id, id);
        return {
          ...e,
          id,
          dossierId: newDossierId,
          imageId: e.imageId ? imageIdMap.get(e.imageId) : undefined,
          // Les sources reçoivent de nouveaux identifiants : les coordonnées qui s'y réfèrent suivent.
          attributes: e.attributes?.map((attribute) => {
            const attributeId = mint(attribute.id);
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
            id: mint(r.id),
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
        id: mint(n.id),
        dossierId: newDossierId,
        linkedSourceIds: n.linkedSourceIds.map((id) => sourceIdMap.get(id)).filter((id): id is string => !!id),
        linkedEntityIds: n.linkedEntityIds.map((id) => entityIdMap.get(id)).filter((id): id is string => !!id),
        entityId: n.entityId ? entityIdMap.get(n.entityId) : undefined,
        attributeRef: remapAttributeRef(n.attributeRef, entityIdMap, attributeIdMap),
        body: replaceCitationIds(replaceImageIds(n.body, imageIdMap), sourceIdMap),
      }));
      const newCanvasCards: CanvasCard[] = (parsed.canvasCards ?? []).map((c) => {
        const id = mint(c.id);
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
          const link: CanvasLink = { id: mint(l.id), dossierId: newDossierId, fromCardId, toCardId };
          return link;
        })
        .filter((l): l is CanvasLink => l !== null);

      const newShapes: GraphShape[] = (parsed.shapes ?? []).map((s) => ({ ...s, id: mint(s.id), dossierId: newDossierId }));

      mutate((data) => {
        if (keep) {
          // Récupération depuis la copie en ligne : la version locale du même dossier est remplacée.
          data.dossiers = data.dossiers.filter((d) => d.id !== newDossierId);
          data.sources = data.sources.filter((x) => x.dossierId !== newDossierId);
          data.entities = data.entities.filter((x) => x.dossierId !== newDossierId);
          data.relations = data.relations.filter((x) => x.dossierId !== newDossierId);
          data.notes = data.notes.filter((x) => x.dossierId !== newDossierId);
          data.canvasCards = data.canvasCards.filter((x) => x.dossierId !== newDossierId);
          data.canvasLinks = data.canvasLinks.filter((x) => x.dossierId !== newDossierId);
          data.shapes = data.shapes.filter((x) => x.dossierId !== newDossierId);
        }
        data.dossiers = [...data.dossiers, newDossier];
        data.sources = [...data.sources, ...newSources];
        data.entities = [...data.entities, ...newEntities];
        data.relations = [...data.relations, ...newRelations];
        data.notes = [...data.notes, ...newNotes];
        data.canvasCards = [...data.canvasCards, ...newCanvasCards];
        data.canvasLinks = [...data.canvasLinks, ...newCanvasLinks];
        data.shapes = [...data.shapes, ...newShapes];
      });

      return newDossierId;
    },
  };
}
