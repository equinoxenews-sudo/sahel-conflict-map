import { Suspense } from "react";
import SectionGate from "@/components/espace/SectionGate";
import OsintSearchPanel from "@/components/investigation/OsintSearchPanel";

// INVESTIGATION : la recherche OSINT. Pour l'instant, la recherche par type d'entrée qui ouvre les outils externes ;
// la version avec résultats directs dans Équinoxe viendra ensuite. Rubrique réservée au compte du fondateur : les autres
// comptes voient « Bientôt » (la porte est côté serveur, voir SectionGate).
export default function EspaceInvestigationPage() {
  return (
    <SectionGate
      section="investigation"
      soon={{
        title: "Investigation",
        summary: "La recherche en sources ouvertes : vous saisissez ce que vous cherchez, Équinoxe prépare la recherche dans les outils adaptés.",
        points: [
          "Vous choisissez le type d'entrée (nom, pseudonyme, organisation, domaine ou adresse IP, lieu, navire, portefeuille numérique ou mot-clé).",
          "Les outils de recherche externes les plus pertinents s'ouvrent avec votre requête déjà saisie, et vous pouvez enregistrer ce que vous trouvez comme source dans l'un de vos dossiers.",
          "Les résultats affichés directement dans Équinoxe, reliés à vos dossiers et à vos graphes, viendront dans un second temps.",
        ],
      }}
    >
      <Suspense fallback={null}>
        <OsintSearchPanel />
      </Suspense>
    </SectionGate>
  );
}
