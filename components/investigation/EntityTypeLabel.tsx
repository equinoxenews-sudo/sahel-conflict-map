import { ENTITY_TYPE_LABELS, type EntityType } from "@/lib/investigation/types";
import EntityTypeIcon from "./EntityTypeIcon";

// Le type d'une fiche avec son petit logo : l'œil reconnaît un lieu, une entreprise ou une personne avant de lire.
export default function EntityTypeLabel({ type, upper = false, size = 13 }: { type: EntityType; upper?: boolean; size?: number }) {
  const label = ENTITY_TYPE_LABELS[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <EntityTypeIcon type={type} size={size} />
      <span>{upper ? label.toUpperCase() : label}</span>
    </span>
  );
}
