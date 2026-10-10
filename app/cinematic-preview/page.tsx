import type { Metadata } from "next";
import CinematicIntro from "@/components/cinematic/CinematicIntro";
import { getZoneBriefs } from "@/lib/cinematic/zoneBriefs";

// Prototype expérimental : page autonome, hors index des moteurs de recherche.
// Elle ne fait que lire les derniers articles (même source que la page d'accueil) : rien n'est écrit.
export const metadata: Metadata = {
  title: "ÉQUINOXE — Aperçu de l'introduction",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

export default async function CinematicPreviewPage() {
  const briefs = await getZoneBriefs();
  return <CinematicIntro briefs={briefs} />;
}
