"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { createContext, useContext } from "react";
import { FLAG_COUNTRIES } from "@/lib/countryFlagIndex";
import { attributeLink, groupAttributes } from "@/lib/investigation/attributes";
import { ENTITY_TYPE_LABELS, type EntityAttribute, type InvestigationEntity } from "@/lib/investigation/types";
import AttributeIcon from "./AttributeIcon";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import { useEntityImage } from "./useEntityImage";
import styles from "./EntityNode.module.css";

export type EntityNodeData = {
  entity: InvestigationEntity;
  /** Noms des autres fiches qui portent la même valeur, par identifiant de coordonnée. */
  sharedWith: Record<string, string[]>;
} & Record<string, unknown>;

/** Ouvre la page d'une coordonnée ; absent = pas de bouton « ↗ » sur les cartes. Passé par un
 * contexte plutôt que par les données des cartes, pour ne pas les reconstruire à chaque rendu. */
export const OpenAttributeContext = createContext<((entityId: string, attributeId: string) => void) | undefined>(undefined);
export type EntityFlowNode = Node<EntityNodeData, "entityCard">;

/** Pays d'une fiche : son nom français et le libellé à afficher à côté du drapeau. */
export function countryOf(entity: Pick<InvestigationEntity, "countryIso2" | "countryLabel">) {
  if (!entity.countryIso2) return null;
  const country = FLAG_COUNTRIES.find((c) => c.iso2 === entity.countryIso2);
  if (!country) return null;
  return { iso2: country.iso2, name: country.name, label: entity.countryLabel?.trim() || country.name };
}

function AttributeValue({
  attribute,
  sharedWith,
  onOpen,
}: {
  attribute: EntityAttribute;
  sharedWith?: string[];
  onOpen?: () => void;
}) {
  const link = attributeLink(attribute);
  const country = FLAG_COUNTRIES.find((c) => c.iso2 === attribute.countryIso2);
  const text =
    attribute.kind === "social"
      ? `@ : ${attribute.value.replace(/^@+/, "")}`
      : attribute.kind === "identifier" && attribute.label
        ? `${attribute.label} : ${attribute.value}`
        : attribute.value;
  const supposed = attribute.status === "hypothesis";

  return (
    <span className={styles.value}>
      {link ? (
        <a
          href={link}
          className={`${styles.link} nodrag`}
          {...(link.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          onClick={(event) => event.stopPropagation()}
        >
          {text}
        </a>
      ) : (
        text
      )}
      {attribute.kind === "social" && attribute.secondary ? <span className={styles.secondary}> ID : {attribute.secondary}</span> : null}
      {country ? <HexFlag iso2={country.iso2} name={country.name} /> : null}
      {supposed ? (
        <span className={styles.supposed} title="Information supposée, non confirmée">
          ?
        </span>
      ) : null}
      {onOpen ? (
        <button
          type="button"
          className={`${styles.pageBtn} nodrag`}
          title="Ouvrir la page de cette coordonnée (notes, liens, captures d'écran)"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          ↗
        </button>
      ) : null}
      {sharedWith && sharedWith.length > 0 ? (
        <span className={styles.shared} title={`Même valeur sur : ${sharedWith.join(", ")}`}>
          ⛓ {sharedWith.length}
        </span>
      ) : null}
    </span>
  );
}

// Carte de la maquette : pastille ronde au cadre doré qui chevauche une carte
// sombre (type en capitales dorées, nom, rôle, nationalité et drapeau). Sous
// elle pendent les coordonnées (e-mail, téléphone, comptes, lieux), reliées
// par un trait vertical : plein si elles sont documentées, en pointillé si
// elles sont supposées. Les liens du graphe s'accrochent au centre de la
// pastille : dessinée au-dessus des traits, elle masque leur extrémité.
export default function EntityNode({ data, selected }: NodeProps<EntityFlowNode>) {
  const { entity, sharedWith } = data;
  const onOpenAttribute = useContext(OpenAttributeContext);
  const image = useEntityImage(entity.imageId, entity.imageUrl);
  const country = countryOf(entity);
  const groups = groupAttributes(entity.attributes ?? []);

  return (
    <div className={selected ? `${styles.node} ${styles.selected}` : styles.node}>
      <div className={styles.head}>
        <Handle type="target" position={Position.Left} className={styles.handle} isConnectable={false} />
        <Handle type="source" position={Position.Left} className={styles.handle} isConnectable={false} />

        <div className={styles.avatar}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className={styles.avatarImage} referrerPolicy="no-referrer" draggable={false} />
          ) : (
            <EntityTypeIcon type={entity.type} />
          )}
        </div>

        <div className={styles.card}>
          <span className={styles.type}>{ENTITY_TYPE_LABELS[entity.type].toUpperCase()}</span>
          <span className={styles.name}>{entity.name}</span>
          {entity.role ? <span className={styles.role}>{entity.role}</span> : null}
          {country ? (
            <span className={styles.country}>
              {country.label}
              <HexFlag iso2={country.iso2} name={country.name} />
            </span>
          ) : null}
        </div>
      </div>

      {groups.length > 0 ? (
        <div className={styles.attrs}>
          {groups.map((group) => {
            const allSupposed = group.items.every((item) => item.status === "hypothesis");
            return (
              <div key={group.key} className={allSupposed ? `${styles.attrRow} ${styles.attrRowSupposed}` : styles.attrRow}>
                <div className={styles.attrBox}>
                  <AttributeIcon kind={group.kind} platform={group.platform} />
                  <div className={styles.attrText}>
                    <span className={styles.attrTitle}>{group.title.toUpperCase()}</span>
                    {group.items.map((attribute) => (
                      <AttributeValue
                        key={attribute.id}
                        attribute={attribute}
                        sharedWith={sharedWith[attribute.id]}
                        onOpen={onOpenAttribute ? () => onOpenAttribute(entity.id, attribute.id) : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
