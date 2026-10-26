import { Suspense } from "react";
import OsintSearchPanel from "@/components/investigation/OsintSearchPanel";

// INVESTIGATION : la recherche OSINT. Pour l'instant, la recherche par type d'entrée qui ouvre les outils externes ;
// la version avec résultats directs dans Équinoxe viendra ensuite.
export default function EspaceInvestigationPage() {
  return (
    <Suspense fallback={null}>
      <OsintSearchPanel />
    </Suspense>
  );
}
