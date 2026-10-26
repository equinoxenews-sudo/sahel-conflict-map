import { Suspense } from "react";
import DossierWorkspace from "@/components/espace/DossierWorkspace";

export default function EspaceDossierPage() {
  return (
    <Suspense fallback={null}>
      <DossierWorkspace />
    </Suspense>
  );
}
