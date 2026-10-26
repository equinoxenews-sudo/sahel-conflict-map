import ComingSoon from "@/components/espace/ComingSoon";

export default function EspaceSupervisionPage() {
  return (
    <ComingSoon
      title="Supervision"
      summary="Une veille sur mesure : vous décrivez ce que vous voulez suivre, l'IA met en place une surveillance strictement limitée à votre sujet."
      points={[
        "Une seule enquête à la fois par compte : pour en suivre une autre (par exemple El Fasher au Soudan après Boko Haram), on supprime la première puis on en ouvre une nouvelle.",
        "Vous décrivez votre demande en texte libre, puis vous précisez la zone (ou la dessinez sur la carte) et les médias à surveiller.",
        "Vous obtenez une carte de la zone avec les articles localisés, un résumé de la semaine, des indicateurs d'insécurité et des alertes sur votre téléphone ou votre messagerie.",
      ]}
    />
  );
}
