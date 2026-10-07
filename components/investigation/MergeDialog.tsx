"use client";

import { useMemo, useState } from "react";
import { FLAG_COUNTRIES } from "@/lib/countryFlagIndex";
import { planEntityMerge, type MergeChoices, type Side } from "@/lib/investigation/merge";
import { ENTITY_TYPE_LABELS, type InvestigationEntity } from "@/lib/investigation/types";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import { useEntityImage } from "./useEntityImage";
import styles from "./MergeDialog.module.css";

interface MergeDialogProps {
  primary: InvestigationEntity;
  secondary: InvestigationEntity;
  /** Nombre de relations de la seconde fiche qui seront déplacées. */
  movedRelations: number;
  /** Les deux fiches ont chacune un texte : ils seront réunis. */
  bothHaveText: boolean;
  onSwap: () => void;
  onCancel: () => void;
  onConfirm: (choices: MergeChoices) => void;
}

function Thumb({ entity }: { entity: InvestigationEntity }) {
  const image = useEntityImage(entity.imageId, entity.imageUrl);
  return (
    <span className={styles.thumb}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" referrerPolicy="no-referrer" />
      ) : (
        <EntityTypeIcon type={entity.type} size={20} />
      )}
    </span>
  );
}

function countryText(entity: InvestigationEntity) {
  const country = FLAG_COUNTRIES.find((c) => c.iso2 === entity.countryIso2);
  return country ? (
    <span className={styles.country}>
      {entity.countryLabel?.trim() || country.name}
      <HexFlag iso2={country.iso2} name={country.name} />
    </span>
  ) : null;
}

function Choice({
  name,
  value,
  current,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  current: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className={current === value ? `${styles.choice} ${styles.choiceOn}` : styles.choice}>
      <input type="radio" name={name} checked={current === value} onChange={onSelect} />
      <span className={styles.choiceBody}>{children}</span>
    </label>
  );
}

// Fusion manuelle : la fiche principale absorbe la seconde. Pour chaque champ en
// conflit, on choisit la valeur à garder ; un résumé dit ce qui sera repris avant
// de valider. La fusion reste annulable depuis le graphe.
export default function MergeDialog({ primary, secondary, movedRelations, bothHaveText, onSwap, onCancel, onConfirm }: MergeDialogProps) {
  const [choices, setChoices] = useState<MergeChoices>({
    name: "primary",
    role: "primary",
    country: "primary",
    image: primary.imageId || primary.imageUrl ? "primary" : secondary.imageId || secondary.imageUrl ? "secondary" : "none",
  });
  const plan = useMemo(() => planEntityMerge(primary, secondary, choices), [primary, secondary, choices]);

  const set = <K extends keyof MergeChoices>(field: K, value: MergeChoices[K]) => setChoices((current) => ({ ...current, [field]: value }));
  const differs = (a: unknown, b: unknown) => (a ?? "") !== (b ?? "");

  const hasImage = (e: InvestigationEntity) => Boolean(e.imageId || e.imageUrl);
  const side = (label: string, entity: InvestigationEntity, which: Side) => (
    <span>
      <span className={styles.sideTag}>{which === "primary" ? "Principale" : "Absorbée"}</span> {label}
      <span className={styles.sub}> — {entity.name}</span>
    </span>
  );

  return (
    <div className={styles.overlay} role="dialog" aria-label="Fusionner deux fiches">
      <div className={styles.dialog}>
        <h2 className={styles.title}>Fusionner deux fiches</h2>
        <p className={styles.lead}>
          <strong>{primary.name}</strong> ({ENTITY_TYPE_LABELS[primary.type]}) absorbe <strong>{secondary.name}</strong>. Rien n&apos;est perdu : les
          valeurs que tu n&apos;as pas retenues restent comme alias ou dans le texte, et la fusion est annulable.{" "}
          <button type="button" className={styles.link} onClick={onSwap}>
            Garder l&apos;autre fiche comme principale
          </button>
        </p>

        {differs(primary.name, secondary.name) ? (
          <fieldset className={styles.field}>
            <legend>Nom</legend>
            <Choice name="name" value="primary" current={choices.name} onSelect={() => set("name", "primary")}>
              {primary.name}
            </Choice>
            <Choice name="name" value="secondary" current={choices.name} onSelect={() => set("name", "secondary")}>
              {secondary.name}
            </Choice>
          </fieldset>
        ) : null}

        {differs(primary.role, secondary.role) ? (
          <fieldset className={styles.field}>
            <legend>Sous le nom</legend>
            <Choice name="role" value="primary" current={choices.role} onSelect={() => set("role", "primary")}>
              {primary.role || <em>vide</em>}
            </Choice>
            <Choice name="role" value="secondary" current={choices.role} onSelect={() => set("role", "secondary")}>
              {secondary.role || <em>vide</em>}
            </Choice>
          </fieldset>
        ) : null}

        {differs(primary.countryIso2, secondary.countryIso2) ? (
          <fieldset className={styles.field}>
            <legend>Pays</legend>
            <Choice name="country" value="primary" current={choices.country} onSelect={() => set("country", "primary")}>
              {countryText(primary) ?? <em>aucun</em>}
            </Choice>
            <Choice name="country" value="secondary" current={choices.country} onSelect={() => set("country", "secondary")}>
              {countryText(secondary) ?? <em>aucun</em>}
            </Choice>
          </fieldset>
        ) : null}

        {hasImage(primary) || hasImage(secondary) ? (
          <fieldset className={styles.field}>
            <legend>Image</legend>
            <Choice name="image" value="primary" current={choices.image} onSelect={() => set("image", "primary")}>
              <Thumb entity={primary} /> {side("image de", primary, "primary")}
            </Choice>
            <Choice name="image" value="secondary" current={choices.image} onSelect={() => set("image", "secondary")}>
              <Thumb entity={secondary} /> {side("image de", secondary, "secondary")}
            </Choice>
            <Choice name="image" value="none" current={choices.image} onSelect={() => set("image", "none")}>
              Aucune image
            </Choice>
          </fieldset>
        ) : null}

        <div className={styles.summary}>
          <strong>Ce qui sera repris</strong>
          <ul>
            <li>
              {plan.attributesAdded} coordonnée{plan.attributesAdded > 1 ? "s" : ""} ajoutée{plan.attributesAdded > 1 ? "s" : ""}
              {plan.attributesAbsorbed > 0
                ? `, ${plan.attributesAbsorbed} déjà présente${plan.attributesAbsorbed > 1 ? "s" : ""} (la mieux établie est conservée)`
                : ""}
            </li>
            <li>
              {movedRelations} relation{movedRelations > 1 ? "s" : ""} déplacée{movedRelations > 1 ? "s" : ""} vers « {plan.patch.name} »
            </li>
            <li>{bothHaveText ? "Les deux textes sont réunis, le second sous « Fusionné depuis… »." : "La fiche texte existante est conservée."}</li>
            <li>Les liens [[…]] qui désignaient la fiche absorbée sont mis à jour.</li>
            <li>
              Alias : {plan.patch.aliases.length > 0 ? plan.patch.aliases.join(", ") : "aucun"}
            </li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => onConfirm(choices)}>
            Fusionner
          </button>
          <button type="button" className={styles.secondary} onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
