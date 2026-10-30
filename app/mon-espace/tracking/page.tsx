import ComingSoon from "@/components/espace/ComingSoon";

// Rubrique réservée au compte du fondateur : quand elle s'ouvrira, le contenu réel DOIT passer par SectionGate (voir
// components/espace/SectionGate.tsx et tests/espace-access.test.ts, qui le vérifie).
export default function EspaceTrackingPage() {
  return (
    <ComingSoon
      section="tracking"
      title="Tracking"
      summary="Le suivi de navires et d'avions que vous choisissez."
      points={[
        "Vous inscrivez les appareils ou les navires à suivre (immatriculation, code, numéro IMO).",
        "Un contrôle quotidien de leurs déplacements, avec une alerte quand quelque chose change.",
        "Les avions viendront en premier, les navires ensuite.",
      ]}
    />
  );
}
