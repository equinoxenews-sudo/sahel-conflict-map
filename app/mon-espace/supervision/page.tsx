import SectionGate from "@/components/espace/SectionGate";
import SupervisionList from "@/components/supervision/SupervisionList";

// Rubrique réservée au compte du fondateur (décision du 09/11/2026) : le contenu réel passe par SectionGate, le droit est vérifié
// côté serveur à chaque affichage (voir components/espace/SectionGate.tsx et tests/espace-access.test.ts).
export default function EspaceSupervisionPage() {
  return (
    <SectionGate
      section="supervision"
      soon={{
        title: "Supervision",
        summary: "Une veille sur mesure : vous décrivez ce que vous voulez suivre, l'IA met en place une surveillance strictement limitée à votre sujet.",
        points: [
          "Vous décrivez votre veille (pays, objectif, thèmes), puis vous composez librement votre tableau de bord de modules.",
          "Carte, flux d'informations, chronologie, alertes, statistiques, résumé, assistant et notes : vous ne gardez que ce qui vous sert.",
          "Votre tableau de bord est enregistré et vous le retrouvez sur tous vos appareils.",
        ],
      }}
    >
      <SupervisionList />
    </SectionGate>
  );
}
