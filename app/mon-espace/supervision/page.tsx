import EspaceTitle from "@/components/espace/EspaceTitle";
import SupervisionApp from "@/components/supervision/SupervisionApp";

// SUPERVISION : les veilles personnalisées du compte (branche supervision-v1, pas encore dans la version publique).
export default function EspaceSupervisionPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <EspaceTitle section="supervision">Supervision</EspaceTitle>
      <SupervisionApp />
    </div>
  );
}
