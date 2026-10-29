import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import ApprocheCountryPage from "@/components/approche/ApprocheCountryPage";
import { getDemoModules, mergeModules } from "@/lib/approche/demo";
import { approcheMetadata, loadCountryPage } from "@/lib/approche/loadPage";
import { listApprocheCountries } from "@/lib/approche/repository";
import { APPROCHE_TABS, tabHref, type ApprocheTab } from "@/lib/approche/tabs";

// Onglets d'une fiche pays migrée (`…/pays/france/defense`) : sous-pages pré-rendues au déploiement, avec la même
// régénération que la page du pays. Un pays non migré ou un onglet inconnu donne une page introuvable.
export const revalidate = 3600;
export const dynamicParams = false;
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

type Params = { slug: string; country: string; tab: string };

const OTHER_TABS = APPROCHE_TABS.filter((tab) => tab.key !== "overview");

export function generateStaticParams(): Params[] {
  return listApprocheCountries().flatMap(({ slug, zoneSlug }) => OTHER_TABS.map((tab) => ({ slug: zoneSlug, country: slug, tab: tab.key })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, country, tab } = await params;
  const loaded = loadCountryPage(slug, country);
  const label = OTHER_TABS.find((item) => item.key === tab)?.label;
  return loaded?.approche && label ? approcheMetadata(loaded.approche, label) : {};
}

export default async function CountryTabPage({ params }: { params: Promise<Params> }) {
  const { slug, country: countrySlug, tab } = await params;
  if (tab === "overview") redirect(tabHref(`/zones/${slug}/approche/pays/${countrySlug}`, "overview"));
  const known = OTHER_TABS.find((item) => item.key === tab);
  const loaded = loadCountryPage(slug, countrySlug);
  if (!known || !loaded?.approche) notFound();
  return <ApprocheCountryPage data={loaded.approche} iso2={loaded.country.iso2} tab={known.key as ApprocheTab} map={loaded.map} modules={mergeModules(loaded.approche.modules, await getDemoModules(loaded.approche.countryCode))} />;
}
