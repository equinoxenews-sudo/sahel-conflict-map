"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FLAG_COUNTRIES } from "@/lib/countryFlagIndex";
import { deleteImage } from "@/lib/investigation/imageStore";
import {
  ENTITY_TYPE_LABELS,
  type EntityAttribute,
  type EntityType,
  type InvestigationEntity,
  type Source,
} from "@/lib/investigation/types";
import AttributesEditor from "./AttributesEditor";
import ImagePicker, { type PickedImage } from "./ImagePicker";
import styles from "./EntityForm.module.css";

export interface EntityFormValues {
  type: EntityType;
  name: string;
  role: string;
  countryIso2: string;
  countryLabel: string;
  aliases: string[];
  notes: string;
  imageId?: string;
  imageUrl?: string;
  attributes: EntityAttribute[];
}

/** Champs d'une entité à enregistrer d'après le formulaire (vide = champ retiré). */
export function entityPatchFromValues(values: EntityFormValues) {
  return {
    type: values.type,
    name: values.name,
    aliases: values.aliases,
    notes: values.notes,
    role: values.role || undefined,
    countryIso2: values.countryIso2 || undefined,
    countryLabel: values.countryLabel || undefined,
    imageId: values.imageId,
    imageUrl: values.imageUrl,
    attributes: values.attributes.length > 0 ? values.attributes : undefined,
  };
}

interface EntityFormProps {
  /** Fiche à modifier ; absente pour une création. */
  initial?: InvestigationEntity;
  submitLabel: string;
  /** Sources du dossier, proposées pour justifier une coordonnée. */
  sources?: Source[];
  onSubmit: (values: EntityFormValues) => void;
  onCancel: () => void;
}

const ROLE_PLACEHOLDER: Record<EntityType, string> = {
  person: "Fonction (ex : Parc Manager)",
  organization: "Nature (ex : ONG, ministère, unité)",
  location: "Précision (ex : ville, région, site)",
  building: "Nature (ex : base, entrepôt, siège)",
  equipment: "Modèle ou catégorie (ex : drone, véhicule blindé)",
  event: "Date ou lieu",
  document: "Nature du document",
  account: "Plateforme",
};

export default function EntityForm({ initial, submitLabel, sources = [], onSubmit, onCancel }: EntityFormProps) {
  const [type, setType] = useState<EntityType>(initial?.type ?? "person");
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [countryIso2, setCountryIso2] = useState(initial?.countryIso2 ?? "");
  const [countryLabel, setCountryLabel] = useState(initial?.countryLabel ?? "");
  const [aliases, setAliases] = useState(initial?.aliases.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [attributes, setAttributes] = useState<EntityAttribute[]>(initial?.attributes ?? []);
  const [image, setImage] = useState<PickedImage>({ imageId: initial?.imageId, imageUrl: initial?.imageUrl });

  // Images importées pendant la saisie : celles qu'on n'enregistre finalement
  // pas (image remplacée, saisie annulée) sont supprimées d'IndexedDB.
  const createdImages = useRef<string[]>([]);
  const submitted = useRef(false);
  useEffect(
    () => () => {
      if (submitted.current) return;
      for (const id of createdImages.current) void deleteImage(id).catch(() => undefined);
    },
    []
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    submitted.current = true;
    for (const id of createdImages.current) {
      if (id !== image.imageId) void deleteImage(id).catch(() => undefined);
    }
    onSubmit({
      type,
      name: name.trim(),
      role: role.trim(),
      countryIso2,
      countryLabel: countryLabel.trim(),
      aliases: aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
      notes: notes.trim(),
      imageId: image.imageId,
      imageUrl: image.imageUrl,
      // Une ligne sans valeur n'est pas une coordonnée : elle n'est pas enregistrée.
      attributes: attributes
        .filter((attribute) => attribute.value.trim() !== "")
        .map((attribute) => ({ ...attribute, value: attribute.value.trim() })),
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Type</span>
          <select className={styles.control} value={type} onChange={(e) => setType(e.target.value as EntityType)}>
            {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((key) => (
              <option key={key} value={key}>
                {ENTITY_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Nom</span>
          <input className={styles.control} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Sous le nom</span>
        <input className={styles.control} value={role} onChange={(e) => setRole(e.target.value)} placeholder={ROLE_PLACEHOLDER[type]} />
      </label>

      <div className={styles.row}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Pays (drapeau)</span>
          <select className={styles.control} value={countryIso2} onChange={(e) => setCountryIso2(e.target.value)}>
            <option value="">Aucun</option>
            {FLAG_COUNTRIES.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span className={styles.label}>Libellé affiché</span>
          <input
            className={styles.control}
            value={countryLabel}
            onChange={(e) => setCountryLabel(e.target.value)}
            placeholder="ex : Béninois (sinon le nom du pays)"
            disabled={!countryIso2}
          />
        </label>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Image</span>
        <ImagePicker value={image} onChange={setImage} onCreated={(id) => createdImages.current.push(id)} />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Coordonnées</span>
        <AttributesEditor value={attributes} onChange={setAttributes} sources={sources} />
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Alias (séparés par des virgules)</span>
        <input className={styles.control} value={aliases} onChange={(e) => setAliases(e.target.value)} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Notes</span>
        <textarea className={styles.control} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
