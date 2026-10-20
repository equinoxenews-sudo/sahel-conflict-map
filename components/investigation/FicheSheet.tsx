"use client";

import { forwardRef } from "react";
import { groupAttributes } from "@/lib/investigation/attributes";
import { sheetSize, type FicheLayout } from "@/lib/investigation/exportFiche";
import { phraseFrom } from "@/lib/investigation/relationTypes";
import { ENTITY_TYPE_LABELS, RELATION_STATUS_LABELS, type InvestigationEntity, type Note, type Relation, type Source } from "@/lib/investigation/types";
import type { WikiResolution } from "@/lib/investigation/wikilinks";
import AttributeIcon from "./AttributeIcon";
import { countryOf } from "./EntityNode";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import NoteRenderer from "./NoteRenderer";
import SourceEvidence from "./SourceEvidence";
import { useEntityImage } from "./useEntityImage";
import styles from "./FicheSheet.module.css";

interface FicheSheetProps {
  note: Note;
  /** Texte tel qu'il est écrit en ce moment (même s'il n'est pas encore enregistré). */
  body: string;
  entity: InvestigationEntity | null;
  entities: InvestigationEntity[];
  relations: Relation[];
  sources: Source[];
  dossierName: string;
  resolve: (target: string) => WikiResolution;
  background: "dark" | "light";
  layout: FicheLayout;
  /** Retire e-mails, téléphones, comptes et lieux de l'en-tête : on ne partage que le texte, les relations et les sources. */
  maskContacts: boolean;
}

const noop = () => undefined;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// La fiche « à imprimer » : titre, en-tête de l'entité, texte, relations (chacune avec sa source et son document),
// sources. Aucun bouton. Rendue hors écran pour l'export en image, dans les couleurs choisies (sombre comme à
// l'écran, ou blanc pour imprimer), en portrait, en paysage (deux colonnes, pour une diapo) ou à hauteur libre.
const FicheSheet = forwardRef<HTMLDivElement, FicheSheetProps>(function FicheSheet(
  { note, body, entity, entities, relations, sources, dossierName, resolve, background, layout, maskContacts },
  ref
) {
  const image = useEntityImage(entity?.imageId, entity?.imageUrl);
  const country = entity ? countryOf(entity) : null;
  const groups = entity && !maskContacts ? groupAttributes(entity.attributes ?? []) : [];
  const mine = entity ? relations.filter((relation) => relation.sourceEntityId === entity.id || relation.targetEntityId === entity.id) : [];
  // Une source déjà montrée sous une relation n'est pas répétée dans la liste des sources de la fiche.
  const shownUnderRelations = new Set(mine.flatMap((relation) => (relation.justifyingSourceId ? [relation.justifyingSourceId] : [])));
  const linked = note.linkedSourceIds.filter((id) => !shownUnderRelations.has(id)).flatMap((id) => {
    const source = sources.find((candidate) => candidate.id === id);
    return source ? [source] : [];
  });
  const size = sheetSize(layout);

  const header = entity ? (
    <div className={styles.header}>
      <span className={styles.avatar}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" referrerPolicy="no-referrer" />
        ) : (
          <EntityTypeIcon type={entity.type} size={34} />
        )}
      </span>
      <div className={styles.headerText}>
        <span className={styles.type}>{ENTITY_TYPE_LABELS[entity.type].toUpperCase()}</span>
        {entity.role ? <span className={styles.role}>{entity.role}</span> : null}
        {country ? (
          <span className={styles.country}>
            {country.label}
            <HexFlag iso2={country.iso2} name={country.name} />
          </span>
        ) : null}
      </div>
    </div>
  ) : null;

  const attrs =
    groups.length > 0 ? (
      <div className={styles.attrs}>
        {groups.map((group) =>
          group.items.map((attribute) => (
            <span key={attribute.id} className={styles.attr}>
              <AttributeIcon kind={group.kind} platform={group.platform} />
              <span>
                {attribute.value}
                {attribute.status === "hypothesis" ? " ?" : ""}
              </span>
            </span>
          ))
        )}
      </div>
    ) : null;

  const text = (
    <div className={styles.body} lang="fr">
      <NoteRenderer body={body} resolve={resolve} onLink={noop} sources={sources} />
    </div>
  );

  const relationList =
    mine.length > 0 && entity ? (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Relations ({mine.length})</h2>
        <ul className={styles.relations}>
          {mine.map((relation) => {
            const phrase = phraseFrom(relation, entity.id);
            const other = entities.find((candidate) => candidate.id === phrase?.otherId);
            if (!phrase || !other) return null;
            const source = sources.find((candidate) => candidate.id === relation.justifyingSourceId);
            return (
              <li key={relation.id}>
                <span>
                  <em>{phrase.text}</em> → <strong>{other.name}</strong>
                </span>
                <span className={styles.relationMeta}>
                  {RELATION_STATUS_LABELS[relation.status]}
                  {relation.period ? ` · ${relation.period}` : ""} · confiance {relation.confidence} %
                </span>
                {source ? <SourceEvidence source={source} /> : <span className={styles.noSource}>Aucune source renseignée pour ce lien.</span>}
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  const sourceList =
    linked.length > 0 ? (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{shownUnderRelations.size > 0 ? `Autres sources de la fiche (${linked.length})` : `Sources de la fiche (${linked.length})`}</h2>
        <div className={styles.sources}>
          {linked.map((source) => (
            <SourceEvidence key={source.id} source={source} />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div
      ref={ref}
      className={`${styles.sheet} ${background === "light" ? styles.light : styles.dark}`}
      style={{ width: size.width, minHeight: size.minHeight || undefined }}
    >
      <div className={styles.kicker}>Équinoxe Investigation · {dossierName}</div>
      <h1 className={styles.title}>{note.title}</h1>

      {layout === "landscape" ? (
        <div className={styles.columns}>
          <div className={styles.side}>
            {header}
            {attrs}
            {text}
          </div>
          <div className={styles.main}>
            {relationList}
            {sourceList}
          </div>
        </div>
      ) : (
        <>
          {header}
          {attrs}
          {text}
          {relationList}
          {sourceList}
        </>
      )}

      <div className={styles.footer}>
        Exporté le {dateFormat.format(new Date())}
        {maskContacts ? " · coordonnées masquées" : ""}
      </div>
    </div>
  );
});

export default FicheSheet;
