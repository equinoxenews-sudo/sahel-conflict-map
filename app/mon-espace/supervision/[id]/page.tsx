import type { Viewport } from "next";
import SectionGate from "@/components/espace/SectionGate";
import SupervisionBoard from "@/components/supervision/SupervisionBoard";

// Le site entier est calculé sur 980 px de large sur téléphone (voir app/layout.tsx) : ici on prend la vraie largeur de l'écran, sinon le
// téléphone afficherait la disposition de bureau réduite au lieu de la disposition « téléphone » (1 colonne).
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function EspaceSupervisionBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <SectionGate
      section="supervision"
      soon={{ title: "Supervision", summary: "Une veille sur mesure avec un tableau de bord de modules.", points: ["Cette rubrique n'est pas encore ouverte à votre offre."] }}
    >
      <SupervisionBoard id={id} />
    </SectionGate>
  );
}
