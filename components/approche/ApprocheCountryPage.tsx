import Link from "next/link";
import Header from "@/components/equinoxe/Header";
import CountryFlag from "@/components/country-profile/CountryFlag";
import type { CountryMapData } from "@/components/country-profile/CountryMap";
import { containsDemo } from "@/lib/approche/demo";
import { formatDate } from "@/lib/approche/formatters";
import { DefenseModuleSchema, EconomyModuleSchema, IssuesModuleSchema, OutlookModuleSchema, OverviewModuleSchema, RelationsModuleSchema, type Modules } from "@/lib/approche/modules";
import type { CountryData } from "@/lib/approche/schema";
import { APPROCHE_TABS, tabHref, type ApprocheTab } from "@/lib/approche/tabs";
import { claimViews, metricViews, pendingObservations, relationViews, sourceViewMap } from "@/lib/approche/view";
import { zoneHomeHref } from "@/lib/homeZones";
import { getZone } from "@/lib/zones";
import { DemoBanner } from "./DemoBanner";
import DefenseTab from "./DefenseTab";
import EconomyTab from "./EconomyTab";
import IssuesTab from "./IssuesTab";
import OutlookTab from "./OutlookTab";
import OverviewTab from "./OverviewTab";
import RelationsTab from "./RelationsTab";
import styles from "./Approche.module.css";

interface ApprocheCountryPageProps {
  data: CountryData;
  iso2?: string;
  tab: ApprocheTab;
  map: CountryMapData;
  /** Modules à afficher : ceux de la fiche réelle, complétés par la démonstration si elle est activée (preview seulement). */
  modules: Modules;
}

// Fiche pays au nouveau modèle : en-tête, six onglets (sous-pages pré-rendues), contenu de l'onglet actif et bandeau de
// provenance. Le texte des valeurs vient des observations publiées et des modules ; rien n'est écrit en dur. Si des éléments de
// démonstration sont présents, un bandeau permanent l'indique et chaque composant concerné porte une marque « démo » discrète.
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

        <header className={styles.hero}>
          <div className={styles.heroTitle}>
            <CountryFlag iso2={iso2} name={data.name} />
            <div>
              <h1>{data.name}</h1>
              {data.officialName ? <p className={styles.officialName}>{data.officialName}</p> : null}
            </div>
          </div>
          {claims.length > 0 ? <p className={styles.dek}>{claims.map((claim) => claim.statement).join(" ")}</p> : null}
          <p className={styles.heroNote}>Fiche en cours de construction : seules les données vérifiées et sourcées sont affichées comme telles.</p>
        </header>

        <nav className={styles.tabs} aria-label="Sections de la fiche">
          {APPROCHE_TABS.map((item) => (
            <Link key={item.key} href={tabHref(basePath, item.key)} scroll={false} className={item.key === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab} aria-current={item.key === tab ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        {tab === "overview" ? <OverviewTab metrics={metrics} pending={pendingKeys} map={map} module={modules.overview ?? OverviewModuleSchema.parse({})} sources={sources} /> : null}
        {tab === "relations" ? <RelationsTab metrics={metrics} pending={pendingKeys} relations={relationViews(data)} map={(modules.relations ?? RelationsModuleSchema.parse({})).map} sources={sources} /> : null}
        {tab === "economy" ? <EconomyTab metrics={metrics} module={modules.economy ?? EconomyModuleSchema.parse({})} sources={sources} /> : null}
        {tab === "defense" ? <DefenseTab defense={modules.defense ?? DefenseModuleSchema.parse({})} metrics={metrics} sources={sources} /> : null}
        {tab === "issues" ? <IssuesTab issues={modules.issues ?? IssuesModuleSchema.parse({})} metrics={metrics} sources={sources} /> : null}
        {tab === "outlook" ? <OutlookTab outlook={modules.outlook ?? OutlookModuleSchema.parse({})} metrics={metrics} sources={sources} /> : null}

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
        </footer>
      </div>
    </main>
  );
}
