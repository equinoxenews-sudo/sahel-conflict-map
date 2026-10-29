import Link from "next/link";
import Header from "@/components/equinoxe/Header";
import CountryFlag from "@/components/country-profile/CountryFlag";
import type { CountryMapData } from "@/components/country-profile/CountryMap";
import { formatDate } from "@/lib/approche/formatters";
import type { CountryData } from "@/lib/approche/schema";
import { APPROCHE_TABS, tabHref, type ApprocheTab } from "@/lib/approche/tabs";
import { claimViews, metricViews, pendingObservations, relationViews } from "@/lib/approche/view";
import { zoneHomeHref } from "@/lib/homeZones";
import { getZone } from "@/lib/zones";
import OverviewTab from "./OverviewTab";
import RelationsTab from "./RelationsTab";
import styles from "./Approche.module.css";

interface ApprocheCountryPageProps {
  data: CountryData;
  iso2?: string;
  tab: ApprocheTab;
  map: CountryMapData;
}

const COMING: Record<Exclude<ApprocheTab, "overview" | "relations">, string> = {
  economy: "Structure de l'économie, énergie, commerce et dépendances, avec leurs séries sourcées",
  defense: "Forces armées, opérations datées et sécurité intérieure, d'après les publications officielles",
  issues: "Dossiers stratégiques rédigés, sourcés et datés",
  outlook: "Vulnérabilités documentées, SWOT et scénarios qualitatifs sans probabilités",
};

// Fiche pays au nouveau modèle : en-tête, six onglets (état dans l'URL, ?tab=), contenu de l'onglet actif et bandeau de
// provenance. Le texte des valeurs vient des observations publiées ; rien n'est écrit en dur.
export default function ApprocheCountryPage({ data, iso2, tab, map }: ApprocheCountryPageProps) {
  const zone = getZone(data.zoneSlug);
  const basePath = `/zones/${data.zoneSlug}/approche/pays/${data.slug}`;
  const metrics = metricViews(data);
  const claims = claimViews(data);
  const pending = pendingObservations(data);
  const pendingKeys = new Set(pending.map((item) => item.key));
  const sourceCount = data.sources.length;

  return (
    <main className={styles.main}>
      <Header />

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
          {claims.length > 0 ? (
            <p className={styles.dek}>
              {claims.map((claim) => claim.statement).join(" ")}
            </p>
          ) : null}
          <p className={styles.heroNote}>Fiche en cours de construction : seules les données vérifiées et sourcées sont affichées.</p>
        </header>

        <nav className={styles.tabs} aria-label="Sections de la fiche">
          {APPROCHE_TABS.map((item) => (
            <Link key={item.key} href={tabHref(basePath, item.key)} scroll={false} className={item.key === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab} aria-current={item.key === tab ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        {tab === "overview" ? (
          <OverviewTab metrics={metrics} pending={pendingKeys} map={map} />
        ) : tab === "relations" ? (
          <RelationsTab metrics={metrics} pending={pendingKeys} relations={relationViews(data)} />
        ) : (
          <section className={styles.card} aria-live="polite">
            <h2>{APPROCHE_TABS.find((item) => item.key === tab)?.label}</h2>
            <p className={styles.cardNote}>
              Cet onglet sera alimenté dans une prochaine étape : {COMING[tab as Exclude<ApprocheTab, "overview" | "relations">]}. Aucune donnée n&apos;est affichée tant qu&apos;elle n&apos;est pas sourcée.
            </p>
          </section>
        )}

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
