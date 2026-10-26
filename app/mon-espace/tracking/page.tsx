import ComingSoon from "@/components/espace/ComingSoon";

export default function EspaceTrackingPage() {
  return (
    <ComingSoon
      section="tracking"
      title="Tracking"
      summary="Le suivi de navires et d'avions que vous choisissez."
      points={[
        "Vous inscrivez les appareils ou les navires à suivre (immatriculation, code, numéro IMO).",
        "Un contrôle quotidien de leurs déplacements, avec une alerte quand quelque chose change.",
        "Les avions viendront en premier ; les navires demandent une source de données maritimes dont les conditions d'usage sont à confirmer.",
      ]}
    />
  );
}
