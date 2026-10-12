"use client";

import { useState, type FormEvent } from "react";
import {
  CUSTOM_RELATION_KEY,
  getRelationType,
  RELATION_FAMILY_LABELS,
  RELATION_TYPES,
  resolveRelationType,
  type RelationFamily,
} from "@/lib/investigation/relationTypes";
import {
  ENTITY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
  type EntityType,
  type InvestigationEntity,
  type Relation,
  type RelationStatus,
  type Source,
} from "@/lib/investigation/types";
import styles from "./EntityForm.module.css";

export interface RelationFormValues {
  sourceEntityId: string;
  targetEntityId: string;
  /** Clé du catalogue, ou CUSTOM_RELATION_KEY pour un libellé libre. */
  typeKey: string;
  label: string;
  status: RelationStatus;
  confidence: number;
  justifyingSourceId: string | null;
  /** Le trait du graphe affiche la lecture inverse du type. */
  labelInverse: boolean;
  period: string;
}

interface RelationFormProps {
  entities: InvestigationEntity[];
  sources: Source[];
  initial?: Relation;
  /** Entité à pré-sélectionner comme source (création depuis une fiche). */
  defaultSourceId?: string;
  submitLabel: string;
  onSubmit: (values: RelationFormValues) => void;
  onCancel: () => void;
}

const FAMILIES = Object.keys(RELATION_FAMILY_LABELS) as RelationFamily[];

/** Valeurs d'une relation existante pour l'édition : son type, sinon celui que son libellé reproduit. */
function initialType(initial: Relation | undefined): string {
  if (!initial) return "works_with";
  if (getRelationType(initial.typeKey)) return initial.typeKey as string;
  const resolved = resolveRelationType(initial);
  return resolved && !resolved.reversed ? resolved.type.key : CUSTOM_RELATION_KEY;
}

// Formulaire de relation : deux entités, un type du catalogue (qui se lit dans les
// deux sens) ou un libellé libre, un statut, une confiance, une source, une période.
export default function RelationForm({
  entities,
  sources,
  initial,
  defaultSourceId,
  submitLabel,
  onSubmit,
  onCancel,
}: RelationFormProps) {
  const [sourceEntityId, setSourceEntityId] = useState(initial?.sourceEntityId ?? defaultSourceId ?? "");
  const [targetEntityId, setTargetEntityId] = useState(initial?.targetEntityId ?? "");
  const [typeKey, setTypeKey] = useState(initialType(initial));
  const [label, setLabel] = useState(initial && initialType(initial) === CUSTOM_RELATION_KEY ? initial.label : "");
  const [status, setStatus] = useState<RelationStatus>(initial?.status ?? "hypothesis");
  const [confidence, setConfidence] = useState(initial?.confidence ?? 50);
  const [justifyingSourceId, setJustifyingSourceId] = useState(initial?.justifyingSourceId ?? "");
  const [period, setPeriod] = useState(initial?.period ?? "");
  const [labelInverse, setLabelInverse] = useState(initial?.labelInverse === true);

  const type = getRelationType(typeKey);
  const sourceName = entities.find((e) => e.id === sourceEntityId)?.name;
  const targetName = entities.find((e) => e.id === targetEntityId)?.name;
  const custom = typeKey === CUSTOM_RELATION_KEY;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sourceEntityId || !targetEntityId || sourceEntityId === targetEntityId) return;
    if (custom && !label.trim()) return;
    onSubmit({
      sourceEntityId,
      targetEntityId,
      typeKey,
      label: custom ? label.trim() : (type?.label ?? label.trim()),
      status,
      confidence,
      justifyingSourceId: justifyingSourceId || null,
      labelInverse: !custom && type !== null && !type.symmetric && labelInverse,
      period: period.trim(),
    });
  }

  // Entités classées par type (Personnes, Organisations…), puis par ordre alphabétique dans chaque type.
  const entityGroups = (Object.keys(ENTITY_TYPE_LABELS) as EntityType[])
    .map((entityType) => ({
      type: entityType,
      items: entities
        .filter((entity) => entity.type === entityType)
        .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })),
    }))
    .filter((group) => group.items.length > 0);
  const entityOptions = entityGroups.map((group) => (
    <optgroup key={group.type} label={`${ENTITY_TYPE_LABELS[group.type]} (${group.items.length})`}>
      {group.items.map((entity) => (
        <option key={entity.id} value={entity.id}>
          {entity.name}
        </option>
      ))}
    </optgroup>
  ));
  const sortedSources = [...sources].sort((a, b) => a.title.localeCompare(b.title, "fr", { sensitivity: "base" }));

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Source</span>
          <select className={styles.control} value={sourceEntityId} onChange={(e) => setSourceEntityId(e.target.value)} required>
            <option value="">—</option>
            {entityOptions}
          </select>
        </label>
        <button
          type="button"
          className={styles.secondary}
          title="Inverser le sens de la relation"
          onClick={() => {
            setSourceEntityId(targetEntityId);
            setTargetEntityId(sourceEntityId);
          }}
          style={{ alignSelf: "flex-end" }}
        >
          ⇄
        </button>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Cible</span>
          <select className={styles.control} value={targetEntityId} onChange={(e) => setTargetEntityId(e.target.value)} required>
            <option value="">—</option>
            {entityOptions}
          </select>
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Nature de la relation</span>
        <select className={styles.control} value={typeKey} onChange={(e) => setTypeKey(e.target.value)}>
          {FAMILIES.map((family) => (
            <optgroup key={family} label={RELATION_FAMILY_LABELS[family]}>
              {RELATION_TYPES.filter((candidate) => candidate.family === family).map((candidate) => (
                <option key={candidate.key} value={candidate.key}>
                  {candidate.symmetric ? candidate.label : `${candidate.label} / ${candidate.inverse}`}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM_RELATION_KEY}>Autre (texte libre)</option>
        </select>
      </label>

      {custom ? (
        <label className={styles.field}>
          <span className={styles.label}>Libellé (se lit de la source vers la cible)</span>
          <input className={styles.control} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex : a rencontré, a vendu du matériel à…" required />
        </label>
      ) : null}

      {sourceName && targetName ? (
        !custom && type && !type.symmetric ? (
          <fieldset className={styles.reading}>
            <legend className={styles.label}>Lecture affichée sur le graphe</legend>
            <label className={styles.readingOption}>
              <input type="radio" name="reading" checked={!labelInverse} onChange={() => setLabelInverse(false)} />
              <span>
                <strong>{sourceName}</strong> {type.label} <strong>{targetName}</strong>
              </span>
            </label>
            <label className={styles.readingOption}>
              <input type="radio" name="reading" checked={labelInverse} onChange={() => setLabelInverse(true)} />
              <span>
                <strong>{targetName}</strong> {type.inverse} <strong>{sourceName}</strong>
              </span>
            </label>
            <span className={styles.readingHint}>
              Les deux phrases disent la même chose ; le trait du graphe affiche « {labelInverse ? type.inverse : type.label} ».
              Les deux lectures restent visibles dans les fiches.
            </span>
          </fieldset>
        ) : (
          <p className={styles.preview}>
            <strong>{sourceName}</strong> {custom ? label || "…" : type?.label} <strong>{targetName}</strong>
          </p>
        )
      ) : null}

      <div className={styles.row}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Statut</span>
          <select className={styles.control} value={status} onChange={(e) => setStatus(e.target.value as RelationStatus)}>
            {(Object.keys(RELATION_STATUS_LABELS) as RelationStatus[]).map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate === "hypothesis" ? "Supposée (pointillé)" : "Documentée"}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Période (facultatif)</span>
          <input className={styles.control} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="ex : depuis 2021" />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Confiance ({confidence} %)</span>
        <input type="range" min={0} max={100} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Source justificative</span>
        <select className={styles.control} value={justifyingSourceId} onChange={(e) => setJustifyingSourceId(e.target.value)}>
          <option value="">Aucune</option>
          {sortedSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.title}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary}>
          {submitLabel}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
