import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
