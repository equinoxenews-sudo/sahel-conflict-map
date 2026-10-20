"use client";

import { forwardRef } from "react";
import { groupAttributes } from "@/lib/investigation/attributes";
import { SHEET_WIDTH } from "@/lib/investigation/exportFiche";
import { phraseFrom } from "@/lib/investigation/relationTypes";
import { ENTITY_TYPE_LABELS, RELATION_STATUS_LABELS, type InvestigationEntity, type Note, type Relation, type Source } from "@/lib/investigation/types";
import type { WikiResolution } from "@/lib/investigation/wikilinks";
import AttributeIcon from "./AttributeIcon";
import { countryOf } from "./EntityNode";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import NoteRenderer from "./NoteRenderer";
import SourceReference from "./SourceReference";
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
  /** Retire e-mails, téléphones, comptes et lieux de l'en-tête : on ne partage que le texte, les relations et les sources. */
  maskContacts: boolean;
}

const noop = () => undefined;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// La fiche « à imprimer » : titre, en-tête de l'entité, texte, relations, sources. Aucun bouton. Rendue hors écran
// pour l'export en image, dans les couleurs choisies (sombre comme à l'écran, ou blanc pour imprimer).
const FicheSheet = forwardRef<HTMLDivElement, FicheSheetProps>(function FicheSheet(
  { note, body, entity, entities, relations, sources, dossierName, resolve, background, maskContacts },
  ref
) {
  const image = useEntityImage(entity?.imageId, entity?.imageUrl);
  const country = entity ? countryOf(entity) : null;
  const groups = entity && !maskContacts ? groupAttributes(entity.attributes ?? []) : [];
  const mine = entity ? relations.filter((relation) => relation.sourceEntityId === entity.id || relation.targetEntityId === entity.id) : [];
  const linked = note.linkedSourceIds.flatMap((id) => {
    const source = sources.find((candidate) => candidate.id === id);
    return source ? [source] : [];
  });

  return (
    <div ref={ref} className={`${styles.sheet} ${background === "light" ? styles.light : styles.dark}`} style={{ width: SHEET_WIDTH }}>
      <div className={styles.kicker}>Équinoxe Investigation · {dossierName}</div>
      <h1 className={styles.title}>{note.title}</h1>

      {entity ? (
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
      ) : null}

      {groups.length > 0 ? (
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
      ) : null}

      <div className={styles.body}>
        <NoteRenderer body={body} resolve={resolve} onLink={noop} sources={sources} />
      </div>

      {mine.length > 0 && entity ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Relations ({mine.length})</h2>
          <ul className={styles.relations}>
            {mine.map((relation) => {
              const phrase = phraseFrom(relation, entity.id);
              const other = entities.find((candidate) => candidate.id === phrase?.otherId);
              if (!phrase || !other) return null;
              return (
                <li key={relation.id}>
                  <span>
                    <em>{phrase.text}</em> → <strong>{other.name}</strong>
                  </span>
                  <span className={styles.relationMeta}>
                    {RELATION_STATUS_LABELS[relation.status]}
                    {relation.period ? ` · ${relation.period}` : ""} · confiance {relation.confidence} %
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {linked.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sources ({linked.length})</h2>
          <div className={styles.sources}>
            {linked.map((source) => (
              <SourceReference key={source.id} source={source} />
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.footer}>
        Exporté le {dateFormat.format(new Date())}
        {maskContacts ? " · coordonnées masquées" : ""}
      </div>
    </div>
  );
});

export default FicheSheet;
