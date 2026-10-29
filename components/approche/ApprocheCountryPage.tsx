import Link from "next/link";
import Header from "@/components/equinoxe/Header";
import type { CountryMapData } from "@/components/country-profile/CountryMap";
import { containsDemo } from "@/lib/approche/demo";
import { formatDate } from "@/lib/approche/formatters";
import { DefenseModuleSchema, EconomyModuleSchema, IssuesModuleSchema, OutlookModuleSchema, OverviewModuleSchema, RelationsModuleSchema, type Modules } from "@/lib/approche/modules";
import type { CountryData } from "@/lib/approche/schema";
import { type ApprocheTab } from "@/lib/approche/tabs";
import { claimViews, metricViews, pendingObservations, relationViews, sourceViewMap } from "@/lib/approche/view";
import { zoneHomeHref } from "@/lib/homeZones";
import { getZone } from "@/lib/zones";
import { DemoBanner } from "./DemoBanner";
import DefenseTab from "./DefenseTab";
import EconomyTab from "./EconomyTab";
import Hero from "./Hero";
import IssuesTab from "./IssuesTab";
import OutlookTab from "./OutlookTab";
import OverviewTab from "./OverviewTab";
import RelationsTab from "./RelationsTab";
import TabBanner from "./TabBanner";
import TabNav from "./TabNav";
import type { MediaMap } from "./Visual";
import styles from "./Approche.module.css";

interface ApprocheCountryPageProps {
  data: CountryData;
  iso2?: string;
  tab: ApprocheTab;
  map: CountryMapData;
  /** Modules à afficher : ceux de la fiche réelle, complétés par la démonstration si elle est activée (preview seulement). */
  modules: Modules;
}

/** Ouverture de chaque onglet : titre, sous-titre et pictogramme génériques (jamais propres à un pays). */
const BANNERS: Record<Exclude<ApprocheTab, "overview">, { title: string; subtitle: string; icon: string; hue: number }> = {
  relations: { title: "Relations internationales", subtitle: "Organisations, accords documentés et réseau diplomatique", icon: "handshake", hue: 215 },
  economy: { title: "Économie et ressources", subtitle: "Structure productive, énergie, commerce et infrastructures", icon: "chart", hue: 200 },
  defense: { title: "Défense et sécurité", subtitle: "Forces, implantations, équipements et sécurité intérieure", icon: "shield", hue: 225 },
  issues: { title: "Enjeux stratégiques", subtitle: "Dossiers, zones d'intérêt et échéances", icon: "target", hue: 45 },
  outlook: { title: "Vulnérabilités et perspectives", subtitle: "Fragilités documentées, SWOT et scénarios narratifs", icon: "radar", hue: 262 },
};

// Fiche pays au nouveau modèle : en-tête immersif, six onglets (sous-pages pré-rendues), contenu de l'onglet actif et bandeau de
// provenance. Le texte des valeurs vient des observations publiées et des modules ; rien n'est écrit en dur. Si des éléments de
// démonstration sont présents, un bandeau permanent l'indique et chaque section concernée porte une marque « démo » discrète.
export default function ApprocheCountryPage({ data, iso2, tab, map, modules }: ApprocheCountryPageProps) {
  const zone = getZone(data.zoneSlug);
  const basePath = `/zones/${data.zoneSlug}/approche/pays/${data.slug}`;
  const metrics = metricViews(data);
  const claims = claimViews(data);
  const pending = pendingObservations(data);
  const pendingKeys = new Set(pending.map((item) => item.key));
  const sources = sourceViewMap(data);
  const sourceCount = data.sources.length;
  const demoActive = containsDemo(modules);
  const media: MediaMap = Object.fromEntries((modules.media?.assets ?? []).map((asset) => [asset.id, asset]));
  const hero = modules.hero;
  const bannerAsset = tab === "overview" ? null : media[hero?.bannerImages?.[tab] ?? ""];

  return (
    <main className={styles.main}>
      <Header />
      {demoActive ? <DemoBanner /> : null}

      <div className={styles.topBar}>
        <Link href={`/zones/${data.zoneSlug}/approche`} className={styles.back}>
          &lsaquo; Retour
        </Link>
        <span className={styles.topBarTitle}>{(zone?.name ?? data.zoneSlug).toUpperCase()} — Approche</span>
      </div>

      <div className={styles.page}>
        <nav className={styles.breadcrumb} aria-label="Fil d'Ariane">
          <Link href={zoneHomeHref(data.zoneSlug)}>{zone?.name ?? data.zoneSlug}</Link>
          <span>/</span>
          <Link href={`/zones/${data.zoneSlug}/approche`}>Approche</Link>
          <span>/</span>
          <span>{data.name}</span>
        </nav>

        <Hero
          name={data.name}
          officialName={data.officialName}
          iso2={iso2}
          region={zone?.name ?? data.zoneSlug}
          hero={hero}
          asset={media[hero?.imageId ?? ""]}
          demoActive={demoActive}
          statements={claims.map((claim) => claim.statement)}
          metrics={metrics}
        />

        <TabNav basePath={basePath} active={tab} />

        <div key={tab} className={styles.tabPanel}>
          {tab !== "overview" ? <TabBanner {...BANNERS[tab]} asset={bannerAsset} demoActive={demoActive} /> : null}
          {tab === "overview" ? <OverviewTab metrics={metrics} pending={pendingKeys} map={map} module={modules.overview ?? OverviewModuleSchema.parse({})} sources={sources} /> : null}
          {tab === "relations" ? <RelationsTab metrics={metrics} pending={pendingKeys} relations={relationViews(data)} map={(modules.relations ?? RelationsModuleSchema.parse({})).map} presenceMap={(modules.relations ?? RelationsModuleSchema.parse({})).presenceMap} sources={sources} /> : null}
          {tab === "economy" ? <EconomyTab metrics={metrics} module={modules.economy ?? EconomyModuleSchema.parse({})} sources={sources} media={media} demoActive={demoActive} /> : null}
          {tab === "defense" ? <DefenseTab defense={modules.defense ?? DefenseModuleSchema.parse({})} metrics={metrics} sources={sources} media={media} demoActive={demoActive} /> : null}
          {tab === "issues" ? <IssuesTab issues={modules.issues ?? IssuesModuleSchema.parse({})} metrics={metrics} sources={sources} media={media} demoActive={demoActive} /> : null}
          {tab === "outlook" ? <OutlookTab outlook={modules.outlook ?? OutlookModuleSchema.parse({})} metrics={metrics} sources={sources} media={media} demoActive={demoActive} /> : null}
        </div>

        <footer className={styles.provenance} id="sources">
          <div>
            <span className={styles.provLabel}>Dernière vérification de la fiche</span>
            <strong>{formatDate(data.lastCheckedAt)}</strong>
          </div>
          <div>
            <span className={styles.provLabel}>Sources consultées</span>
            <strong>{sourceCount}</strong>
          </div>
          <div>
            <span className={styles.provLabel}>Valeurs en attente de vérification</span>
            <strong>{pending.length}</strong>
          </div>
          <p>
            Chaque valeur cliquable ouvre sa source, sa période, son périmètre et sa méthode. Les dates de mesure, de publication de la source et de vérification de la fiche sont distinctes. Les données provenant de SIPRI ne sont pas utilisées (licence commerciale requise).
          </p>
          {(modules.media?.assets ?? []).length > 0 ? (
            <p>
              Images : {(modules.media?.assets ?? []).map((asset) => `${asset.subject || asset.alt} — ${asset.credit ?? asset.author ?? "crédit à renseigner"} (${asset.licenseStatus === "cleared" ? "licence confirmée" : "licence à confirmer"})`).join(" · ")}
            </p>
          ) : null}
        </footer>
      </div>
    </main>
  );
}
