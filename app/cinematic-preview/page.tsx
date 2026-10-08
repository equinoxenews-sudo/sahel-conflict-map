import type { Metadata } from "next";
import CinematicIntro from "@/components/cinematic/CinematicIntro";

// Prototype expérimental : page autonome, hors index des moteurs de recherche,
// qui ne lit ni n'écrit aucune donnée.
export const metadata: Metadata = {
  title: "ÉQUINOXE — Aperçu de l'introduction",
  robots: { index: false, follow: false },
};

export default function CinematicPreviewPage() {
  return <CinematicIntro />;
}
