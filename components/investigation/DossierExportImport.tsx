"use client";

import { useInvestigationStorage } from "@/lib/investigation/InvestigationContext";

interface DossierExportImportProps {
  dossierId: string;
  dossierName: string;
  className?: string;
}

// Import (JSON -> new dossier) already lives on the dossiers list page —
// duplicating it here would raise the question of whether importing into
// an existing dossier merges or replaces, which V1 deliberately avoids.
export default function DossierExportImport({ dossierId, dossierName, className }: DossierExportImportProps) {
  const storage = useInvestigationStorage();

  function handleExport() {
    const json = storage.exportDossier(dossierId);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dossierName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "dossier"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className={className} onClick={handleExport}>
      Exporter en JSON
    </button>
  );
}
