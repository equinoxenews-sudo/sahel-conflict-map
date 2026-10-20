"use client";

import { useState } from "react";
import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import { phraseFrom } from "@/lib/investigation/relationTypes";
import { RELATION_STATUS_LABELS, type InvestigationEntity, type Relation, type Source } from "@/lib/investigation/types";
import CitePicker from "./CitePicker";
import RelationForm, { type RelationFormValues } from "./RelationForm";
import SourceReference from "./SourceReference";
import styles from "./NotesWorkspace.module.css";

interface RelationsSectionProps {
  entity: InvestigationEntity;
  relations: Relation[];
  entities: InvestigationEntity[];
  sources: Source[];
  onOpenEntityFiche: (entityId: string) => void;
  onShowInGraph: (entityId: string) => void;
  /** Fiche fermée (cadenas) : les relations se lisent mais ne se modifient plus. */
  readOnly?: boolean;
}

function toStored(values: RelationFormValues) {
  return {
    sourceEntityId: values.sourceEntityId,
    targetEntityId: values.targetEntityId,
    typeKey: values.typeKey === "custom" ? undefined : values.typeKey,
    label: values.label,
    status: values.status,
    confidence: values.confidence,
    justifyingSourceId: values.justifyingSourceId,
    labelInverse: values.labelInverse || undefined,
    period: values.period || undefined,
  };
}

// Relations d'une fiche, lues du point de vue de l'entité : « dirige → APN-W »,
// « est dirigé par → Isidore ». Chaque ligne ouvre la fiche de l'autre entité.
export default function RelationsSection({
  entity,
  relations,
  entities,
  sources,
  onOpenEntityFiche,
  onShowInGraph,
  readOnly = false,
}: RelationsSectionProps) {
  const storage = useInvestigationStorage();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  const mine = relations.filter((relation) => relation.sourceEntityId === entity.id || relation.targetEntityId === entity.id);

  return (
    <div className={styles.relations}>
      <div className={styles.relationsHeader}>
        <span className={styles.backTitle}>Relations ({mine.length})</span>
        {readOnly ? null : (
          <button type="button" className={styles.ghost} onClick={() => setAdding((value) => !value)}>
            {adding ? "Fermer" : "+ Ajouter une relation"}
          </button>
        )}
      </div>

      {adding ? (
        <div className={styles.ficheForm}>
          <RelationForm
            entities={entities}
            sources={sources}
            defaultSourceId={entity.id}
            submitLabel="Ajouter"
            onSubmit={(values) => {
              storage.addRelation({ dossierId: entity.dossierId, ...toStored(values) });
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : null}

      {mine.length === 0 && !adding ? <span className={styles.backEmpty}>Aucune relation. Ajoute-en une ou trace un lien dans le graphe.</span> : null}

      <ul className={styles.relationList}>
        {mine.map((relation) => {
          const phrase = phraseFrom(relation, entity.id);
          const other = entities.find((candidate) => candidate.id === phrase?.otherId);
          if (!phrase || !other) return null;
          const source = sources.find((candidate) => candidate.id === relation.justifyingSourceId);

          if (editingId === relation.id) {
            return (
              <li key={relation.id} className={styles.ficheForm}>
                <RelationForm
                  entities={entities}
                  sources={sources}
                  initial={relation}
                  submitLabel="Enregistrer"
                  onSubmit={(values) => {
                    storage.updateRelation(relation.id, toStored(values));
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            );
          }

          return (
            <li key={relation.id} className={styles.relationRow}>
              <span className={styles.relationPhrase}>
                {phrase.outgoing || relation.typeKey ? null : <span className={styles.relationFrom}>←</span>}
                <em>{phrase.text}</em>
                <span aria-hidden> → </span>
                <button type="button" className={styles.wikiLink} onClick={() => onOpenEntityFiche(other.id)} title="Ouvrir la fiche">
                  {other.name}
                </button>
              </span>
              <span className={styles.relationMeta}>
                {RELATION_STATUS_LABELS[relation.status]}
                {relation.period ? ` · ${relation.period}` : ""} · confiance {relation.confidence} %
              </span>
              {/* Source qui justifie le lien : un lien (URL), un document PDF ou une image. */}
              <div className={styles.relationSource}>
                {source ? (
                  <SourceReference
                    source={source}
                    onRemove={readOnly ? undefined : () => storage.updateRelation(relation.id, { justifyingSourceId: null })}
                  />
                ) : readOnly ? null : (
                  <button type="button" className={styles.linkBtn} onClick={() => setPickingId(pickingId === relation.id ? null : relation.id)}>
                    + Ajouter une source (lien, document ou image)
                  </button>
                )}
                {pickingId === relation.id && !readOnly ? (
                  <CitePicker
                    heading="Source de cette relation"
                    submitLabel="Créer et utiliser"
                    dossierId={entity.dossierId}
                    sources={sources}
                    onPick={(sourceId) => {
                      storage.updateRelation(relation.id, { justifyingSourceId: sourceId });
                      setPickingId(null);
                    }}
                    onClose={() => setPickingId(null)}
                  />
                ) : null}
              </div>
              <span className={styles.relationActions}>
                <button type="button" className={styles.linkBtn} onClick={() => onShowInGraph(entity.id)}>
                  graphe
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => setEditingId(relation.id)}>
                  modifier
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => window.confirm("Supprimer cette relation ?") && storage.deleteRelation(relation.id)}
                >
                  supprimer
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
