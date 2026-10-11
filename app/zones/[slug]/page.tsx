import { notFound, redirect } from "next/navigation";
import { zoneHomeHref } from "@/lib/homeZones";
import { getZone } from "@/lib/zones";

// La page de zone « vue d'ensemble » n'existe plus : la fiche de zone de l'accueil (globe centré,
// derniers articles, accès à Approche / Actualités / Analyse) la remplace. Les anciennes adresses
// et les favoris renvoient à l'accueil, zone au centre et sans introduction.
export default async function ZonePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getZone(slug)) notFound();
  redirect(zoneHomeHref(slug));
}
