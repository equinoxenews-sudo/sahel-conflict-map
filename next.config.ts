import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Outils d'essai du globe (jeu d'événements synthétiques ?evenements-test=…, accès au globe pour les contrôles manuels) :
  // jamais en production. Le regroupement des événements, lui, est actif partout (interrupteur d'urgence : variable
  // NEXT_PUBLIC_GLOBE_CLUSTERING = « 0 » dans Vercel, puis redéploiement).
  env: { NEXT_PUBLIC_GLOBE_TEST_TOOLS: process.env.VERCEL_ENV === "production" ? "0" : "1" },
  // L'espace « Investigation » est devenu « Mon espace » (menu de gauche : notes, graph, investigation, supervision,
  // tracking, outils). Les anciennes adresses, y compris celles enregistrées dans des favoris, y mènent toujours.
  async redirects() {
    return [
      { source: "/investigation", destination: "/mon-espace", permanent: false },
      { source: "/investigation/dossiers", destination: "/mon-espace/notes", permanent: false },
      { source: "/investigation/dossiers/:id", destination: "/mon-espace/dossier/:id", permanent: false },
      { source: "/investigation/recherche", destination: "/mon-espace/investigation", permanent: false },
      { source: "/investigation/toolbox", destination: "/mon-espace/outils", permanent: false },
    ];
  },
};

export default nextConfig;
