"use client";

import { FLAG_COUNTRIES } from "@/lib/countryFlagIndex";
import { SOCIAL_PLATFORMS } from "@/lib/investigation/attributes";
import {
  ATTRIBUTE_KIND_LABELS,
  RELATION_STATUS_LABELS,
  type AttributeKind,
  type EntityAttribute,
  type RelationStatus,
  type Source,
  type SocialPlatform,
} from "@/lib/investigation/types";
import styles from "./AttributesEditor.module.css";

interface AttributesEditorProps {
  value: EntityAttribute[];
  onChange: (next: EntityAttribute[]) => void;
  sources: Source[];
}

const VALUE_PLACEHOLDER: Record<AttributeKind, string> = {
  email: "adresse@exemple.org",
  phone: "+33 6 12 34 56 78",
  social: "Pseudo (sans le @)",
  website: "https://…",
  location: "Ville, région, site précis",
  identifier: "Valeur",
};

function newAttribute(): EntityAttribute {
  return { id: crypto.randomUUID(), kind: "email", value: "", status: "documented" };
}

// Une ligne par coordonnée : e-mail, téléphone, compte de réseau social, site,
// lieu ou identifiant. Chacune a son statut (documentée ou supposée, qui devient
// un pointillé sur le graphe) et, si on le souhaite, la source qui l'établit.
export default function AttributesEditor({ value, onChange, sources }: AttributesEditorProps) {
  function patch(id: string, change: Partial<EntityAttribute>) {
    onChange(value.map((attribute) => (attribute.id === id ? { ...attribute, ...change } : attribute)));
  }

  function changeKind(attribute: EntityAttribute, kind: AttributeKind) {
    // Les champs propres à un autre type sont vidés pour ne pas rester cachés dans la fiche.
    patch(attribute.id, {
      kind,
      platform: kind === "social" ? (attribute.platform ?? "facebook") : undefined,
      secondary: kind === "social" ? attribute.secondary : undefined,
      url: kind === "social" ? attribute.url : undefined,
      countryIso2: kind === "location" ? attribute.countryIso2 : undefined,
      label: kind === "identifier" ? attribute.label : undefined,
    });
  }

  return (
    <div className={styles.editor}>
      {value.map((attribute) => (
        <div key={attribute.id} className={styles.card}>
          <div className={styles.row}>
            <select
              className={styles.control}
              value={attribute.kind}
              onChange={(e) => changeKind(attribute, e.target.value as AttributeKind)}
              aria-label="Type de coordonnée"
            >
              {(Object.keys(ATTRIBUTE_KIND_LABELS) as AttributeKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {ATTRIBUTE_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            {attribute.kind === "social" ? (
              <select
                className={styles.control}
                value={attribute.platform ?? "facebook"}
                onChange={(e) => patch(attribute.id, { platform: e.target.value as SocialPlatform })}
                aria-label="Réseau social"
              >
                {(Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[]).map((platform) => (
                  <option key={platform} value={platform}>
                    {SOCIAL_PLATFORMS[platform].label}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              className={styles.control}
              value={attribute.status}
              onChange={(e) => patch(attribute.id, { status: e.target.value as RelationStatus })}
              aria-label="Statut"
            >
              {(Object.keys(RELATION_STATUS_LABELS) as RelationStatus[]).map((status) => (
                <option key={status} value={status}>
                  {status === "hypothesis" ? "Supposée (pointillé)" : "Documentée"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.remove}
              onClick={() => onChange(value.filter((item) => item.id !== attribute.id))}
              aria-label="Supprimer cette coordonnée"
              title="Supprimer cette coordonnée"
            >
              ×
            </button>
          </div>

          {attribute.kind === "identifier" ? (
            <input
              className={styles.control}
              value={attribute.label ?? ""}
              onChange={(e) => patch(attribute.id, { label: e.target.value })}
              placeholder="Nom de l'identifiant (ex : Immatriculation, N° de série)"
              aria-label="Nom de l'identifiant"
            />
          ) : null}

          <div className={styles.row}>
            <input
              className={`${styles.control} ${styles.grow}`}
              value={attribute.value}
              onChange={(e) => patch(attribute.id, { value: e.target.value })}
              placeholder={VALUE_PLACEHOLDER[attribute.kind]}
              aria-label="Valeur"
            />
            {attribute.kind === "social" ? (
              <input
                className={`${styles.control} ${styles.narrow}`}
                value={attribute.secondary ?? ""}
                onChange={(e) => patch(attribute.id, { secondary: e.target.value })}
                placeholder="Identifiant (ID)"
                aria-label="Identifiant numérique du compte"
              />
            ) : null}
            {attribute.kind === "location" ? (
              <select
                className={`${styles.control} ${styles.narrow}`}
                value={attribute.countryIso2 ?? ""}
                onChange={(e) => patch(attribute.id, { countryIso2: e.target.value || undefined })}
                aria-label="Pays du lieu"
              >
                <option value="">Pays (drapeau)</option>
                {FLAG_COUNTRIES.map((country) => (
                  <option key={country.iso2} value={country.iso2}>
                    {country.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {attribute.kind === "social" ? (
            <input
              className={styles.control}
              value={attribute.url ?? ""}
              onChange={(e) => patch(attribute.id, { url: e.target.value })}
              placeholder="Adresse du profil (facultatif, sinon déduite du pseudo)"
              aria-label="Adresse du profil"
            />
          ) : null}

          {sources.length > 0 ? (
            <select
              className={styles.control}
              value={attribute.sourceId ?? ""}
              onChange={(e) => patch(attribute.id, { sourceId: e.target.value || undefined })}
              aria-label="Source"
            >
              <option value="">Aucune source liée</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => onChange([...value, newAttribute()])}>
        + Ajouter une coordonnée (e-mail, téléphone, réseau social, lieu…)
      </button>
    </div>
  );
}
