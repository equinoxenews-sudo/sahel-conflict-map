"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { FLAG_COUNTRIES } from "@/lib/countryFlagIndex";
import { ENTITY_TYPE_LABELS, type InvestigationEntity } from "@/lib/investigation/types";
import EntityTypeIcon from "./EntityTypeIcon";
import HexFlag from "./HexFlag";
import { useEntityImage } from "./useEntityImage";
import styles from "./EntityNode.module.css";

export type EntityNodeData = { entity: InvestigationEntity } & Record<string, unknown>;
export type EntityFlowNode = Node<EntityNodeData, "entityCard">;

/** Pays d'une fiche : son nom français et le libellé à afficher à côté du drapeau. */
export function countryOf(entity: Pick<InvestigationEntity, "countryIso2" | "countryLabel">) {
  if (!entity.countryIso2) return null;
  const country = FLAG_COUNTRIES.find((c) => c.iso2 === entity.countryIso2);
  if (!country) return null;
  return { iso2: country.iso2, name: country.name, label: entity.countryLabel?.trim() || country.name };
}

// Carte de la maquette : pastille ronde au cadre doré qui chevauche une carte
// sombre (type en capitales dorées, nom, rôle, nationalité et drapeau). Les
// liens s'accrochent au centre de la pastille : la pastille, dessinée au-dessus
// des traits, masque leur extrémité.
export default function EntityNode({ data, selected }: NodeProps<EntityFlowNode>) {
  const { entity } = data;
  const image = useEntityImage(entity.imageId, entity.imageUrl);
  const country = countryOf(entity);

  return (
    <div className={selected ? `${styles.node} ${styles.selected}` : styles.node}>
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
  );
}
