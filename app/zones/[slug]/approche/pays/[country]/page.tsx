import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ApprocheCountryPage from "@/components/approche/ApprocheCountryPage";
import CountryProfilePage from "@/components/country-profile/CountryProfilePage";
import { getDemoModules, mergeModules } from "@/lib/approche/demo";
import { approcheMetadata, loadCountryPage } from "@/lib/approche/loadPage";
import { listApprocheCountries } from "@/lib/approche/repository";

// Pré-rendue (ISR) : pour un pays migré vers le modèle sourcé (data/approche/), la page est construite au déploiement ;
// les autres pays se construisent à la première visite, comme avant.
export const revalidate = 3600;

type Params = { slug: string; country: string };

export function generateStaticParams(): Params[] {
  return listApprocheCountries().map(({ slug, zoneSlug }) => ({ slug: zoneSlug, country: slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, country } = await params;
  const loaded = loadCountryPage(slug, country);
  return loaded?.approche ? approcheMetadata(loaded.approche) : {};
}

export default async function CountryPage({ params }: { params: Promise<Params> }) {
  const { slug, country: countrySlug } = await params;
  const loaded = loadCountryPage(slug, countrySlug);
  if (!loaded) notFound();

  // Pays migré : fiche à six onglets (vue d'ensemble ici, autres onglets en sous-pages). Les autres gardent l'ancienne fiche.
  if (loaded.approche) return <ApprocheCountryPage data={loaded.approche} iso2={loaded.country.iso2} tab="overview" map={loaded.map} modules={mergeModules(loaded.approche.modules, await getDemoModules(loaded.approche.countryCode))} />;
  return <CountryProfilePage country={loaded.country} map={loaded.map} />;
}
