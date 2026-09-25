import Link from "next/link";
import Header from "@/components/equinoxe/Header";
import type { CountryMapData } from "@/lib/countryMaps";
import { getZone } from "@/lib/zones";
import type { CountryProfile } from "@/types/country";
import CountryEventCard from "./CountryEventCard";
import CountryMap from "./CountryMap";
import CountrySection from "./CountrySection";
import CountrySourcesList from "./CountrySourcesList";
import EntityCard from "./EntityCard";
import InfrastructureTable from "./InfrastructureTable";
import styles from "./CountryProfilePage.module.css";

interface CountryProfilePageProps {
  country: CountryProfile;
  map: CountryMapData;
}

const NAV_ITEMS = [
  { id: "vue-ensemble", label: "Vue d'ensemble" },
  { id: "politique", label: "Politique" },
  { id: "securite", label: "Sécurité" },
  { id: "economie", label: "Économie" },
  { id: "infrastructures", label: "Infrastructures" },
  { id: "societe", label: "Société" },
  { id: "environnement", label: "Environnement" },
  { id: "acteurs", label: "Acteurs clés" },
  { id: "evenements", label: "Événements" },
  { id: "sources", label: "Sources" },
];

// The single generic template every country profile renders through —
// per the brief, adding a country later means adding a CountryProfile
// data object (lib/countries/<slug>.ts) + a CountryMapData entry, never a
// new page component.
export default function CountryProfilePage({ country, map }: CountryProfilePageProps) {
  const zone = getZone(country.zoneSlug);
  const kpis = [
    { label: "Capitale", value: country.capital },
    { label: "Population", value: country.population },
    { label: "Superficie", value: country.area },
    { label: "Langue", value: country.languages?.join(", ") },
    { label: "Monnaie", value: country.currency },
    { label: "Régime", value: country.government },
  ].filter((k) => k.value);

  return (
    <main className={styles.main}>
      <Header />

      <div className={styles.topBar}>
        <Link href={`/zones/${country.zoneSlug}/approche`} className={styles.back}>
          &lsaquo; Retour
        </Link>
        <h1 className={styles.topBarTitle}>
          {(zone?.name ?? country.zoneSlug).toUpperCase()} — Approche
        </h1>
      </div>

      <div className={styles.headerWrap}>
        <div className={styles.breadcrumb}>
          <Link href={`/zones/${country.zoneSlug}`}>{zone?.name ?? country.zoneSlug}</Link>
          <span>/</span>
          <Link href={`/zones/${country.zoneSlug}/approche`}>Approche</Link>
          <span>/</span>
          <span>{country.name}</span>
        </div>

        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>{country.name.toUpperCase()}</h2>
            {country.officialName && <p className={styles.officialName}>{country.officialName}</p>}
          </div>
          <div className={styles.statusBlock}>
            <div className={styles.statusCard}>
              <span className={styles.statusLabel}>Dernière mise à jour</span>
              <span className={styles.statusValue}>{country.updatedAt}</span>
            </div>
            <div className={styles.statusCard}>
              <span className={styles.statusLabel}>Sources</span>
              <span className={styles.statusValue}>{country.sources.length}</span>
            </div>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={styles.navItem}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className={styles.body}>
        {/* Synthèse : carte + "En bref" + KPIs */}
        <div className={styles.synthesisGrid}>
          <CountryMap data={map} />
          <div className={styles.briefPanel}>
            <span className={styles.demoTag}>Contenu de démonstration</span>
            <h3 className={styles.briefTitle}>En bref</h3>
            {country.overview?.summary && <p className={styles.briefText}>{country.overview.summary}</p>}
            <div className={styles.kpiGrid}>
              {kpis.map((kpi) => (
                <div key={kpi.label} className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>{kpi.label}</span>
                  <span className={styles.kpiValue}>{kpi.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <CountrySection id="vue-ensemble" title="Repères">
          <div className={styles.cardGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoCardTitle}>Repères géographiques</span>
              {country.capital && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Capitale</span>
                  <span className={styles.fieldValue}>{country.capital}</span>
                </div>
              )}
              {country.overview?.coastline && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Façade maritime</span>
                  <span className={styles.fieldValue}>{country.overview.coastline}</span>
                </div>
              )}
              {country.overview?.territorialOrganization && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Organisation territoriale</span>
                  <span className={styles.fieldValue}>{country.overview.territorialOrganization}</span>
                </div>
              )}
              {country.timezone && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Fuseau horaire</span>
                  <span className={styles.fieldValue}>{country.timezone}</span>
                </div>
              )}
            </div>
            {country.overview?.majorCities && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Principales villes</span>
                <div className={styles.tagList}>
                  {country.overview.majorCities.map((c) => (
                    <span key={c} className={styles.tag}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {country.overview?.neighbors && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Pays voisins</span>
                <div className={styles.tagList}>
                  {country.overview.neighbors.map((c) => (
                    <span key={c} className={styles.tag}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {country.overview?.context && country.overview.context.length > 0 && (
            <div className={styles.infoCard}>
              <span className={styles.infoCardTitle}>Contexte général</span>
              {country.overview.context.map((p, i) => (
                <p key={i} className={styles.bodyText}>
                  {p}
                </p>
              ))}
            </div>
          )}
        </CountrySection>

        <CountrySection id="politique" title="Politique &amp; institutions">
          <div className={styles.cardGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoCardTitle}>Institutions</span>
              {country.politics?.system && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Système politique</span>
                  <span className={styles.fieldValue}>{country.politics.system}</span>
                </div>
              )}
              {country.politics?.headOfState && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Chef de l&apos;État</span>
                  <span className={styles.fieldValue}>{country.politics.headOfState}</span>
                </div>
              )}
              {country.politics?.headOfGovernment && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Chef du gouvernement</span>
                  <span className={styles.fieldValue}>{country.politics.headOfGovernment}</span>
                </div>
              )}
              {country.politics?.parliament && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Parlement</span>
                  <span className={styles.fieldValue}>{country.politics.parliament}</span>
                </div>
              )}
              {country.politics?.constitution && (
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Constitution</span>
                  <span className={styles.fieldValue}>{country.politics.constitution}</span>
                </div>
              )}
            </div>

            {country.politics?.foreignRelations && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Relations extérieures</span>
                <div className={styles.tagList}>
                  {country.politics.foreignRelations.map((r) => (
                    <span key={r} className={styles.tag}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {country.politics?.actors && country.politics.actors.length > 0 && (
            <div>
              <span className={styles.infoCardTitle}>Acteurs politiques</span>
              <div className={styles.entityGrid} style={{ marginTop: 10 }}>
                {country.politics.actors.map((a) => (
                  <EntityCard key={a.name} entity={a} />
                ))}
              </div>
            </div>
          )}
        </CountrySection>

        <CountrySection id="securite" title="Sécurité">
          <div className={styles.securityBanner}>
            <div className={styles.securityBars}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={i < 3 ? `${styles.securityBar} ${styles.securityBarActive}` : styles.securityBar} />
              ))}
            </div>
            <span className={styles.securityLabel}>
              Niveau de contexte sécuritaire — représentation générique, pas une notation officielle
            </span>
          </div>

          {country.security?.overview && <p className={styles.bodyText}>{country.security.overview}</p>}

          <div className={styles.cardGrid}>
            {country.security?.conflicts && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Conflits / tensions</span>
                <ul className={styles.list}>
                  {country.security.conflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {country.security?.hotspots && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Zones sensibles</span>
                <ul className={styles.list}>
                  {country.security.hotspots.map((h) => (
                    <li key={h.name}>
                      {h.name}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {country.security?.armedActors && country.security.armedActors.length > 0 && (
            <div>
              <span className={styles.infoCardTitle}>Acteurs armés</span>
              <div className={styles.entityGrid} style={{ marginTop: 10 }}>
                {country.security.armedActors.map((a) => (
                  <EntityCard key={a.name} entity={a} />
                ))}
              </div>
            </div>
          )}

          {country.security?.foreignPresence && country.security.foreignPresence.length > 0 && (
            <div>
              <span className={styles.infoCardTitle}>Présences militaires étrangères</span>
              <div className={styles.entityGrid} style={{ marginTop: 10 }}>
                {country.security.foreignPresence.map((a) => (
                  <EntityCard key={a.name} entity={a} />
                ))}
              </div>
            </div>
          )}
        </CountrySection>

        <CountrySection id="economie" title="Économie &amp; ressources">
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>PIB</span>
              <span className={styles.kpiValue}>{country.economy?.gdp ?? "—"}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Croissance</span>
              <span className={styles.kpiValue}>{country.economy?.growth ?? "—"}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Inflation</span>
              <span className={styles.kpiValue}>{country.economy?.inflation ?? "—"}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Monnaie</span>
              <span className={styles.kpiValue}>{country.currency ?? "—"}</span>
            </div>
          </div>

          <div className={styles.cardGrid}>
            {country.economy?.mainSectors && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Principaux secteurs</span>
                <div className={styles.tagList}>
                  {country.economy.mainSectors.map((s) => (
                    <span key={s} className={styles.tag}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {country.economy?.resources && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Ressources</span>
                <div className={styles.tagList}>
                  {country.economy.resources.map((s) => (
                    <span key={s} className={styles.tag}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {country.economy?.constraints && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Contraintes économiques</span>
                <ul className={styles.list}>
                  {country.economy.constraints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CountrySection>

        <CountrySection id="infrastructures" title="Infrastructures stratégiques">
          <InfrastructureTable items={country.infrastructures ?? []} />
        </CountrySection>

        <CountrySection id="societe" title="Société &amp; démographie">
          {country.society?.overview && <p className={styles.bodyText}>{country.society.overview}</p>}
          <div className={styles.cardGrid}>
            {country.society?.urbanization && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Urbanisation</span>
                <p className={styles.bodyText}>{country.society.urbanization}</p>
              </div>
            )}
            {country.society?.displacement && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Déplacements</span>
                <p className={styles.bodyText}>{country.society.displacement}</p>
              </div>
            )}
            {country.society?.languages && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Langues</span>
                <div className={styles.tagList}>
                  {country.society.languages.map((l) => (
                    <span key={l} className={styles.tag}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {country.society?.religions && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Religions</span>
                <div className={styles.tagList}>
                  {country.society.religions.map((r) => (
                    <span key={r} className={styles.tag}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {country.society?.communities && (
              <div className={styles.infoCard}>
                <span className={styles.infoCardTitle}>Groupes communautaires</span>
                <div className={styles.tagList}>
                  {country.society.communities.map((c) => (
                    <span key={c} className={styles.tag}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CountrySection>

        <CountrySection id="environnement" title="Environnement">
          {country.environment?.overview && <p className={styles.bodyText}>{country.environment.overview}</p>}
          {country.environment?.risks && (
            <div className={styles.tagList}>
              {country.environment.risks.map((r) => (
                <span key={r} className={styles.tag}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </CountrySection>

        <CountrySection id="acteurs" title="Acteurs clés">
          {country.keyActors && country.keyActors.length > 0 ? (
            <div className={styles.entityGrid}>
              {country.keyActors.map((a) => (
                <EntityCard key={a.name} entity={a} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>Aucun acteur clé référencé pour l&apos;instant.</div>
          )}
        </CountrySection>

        <CountrySection id="evenements" title="Événements récents liés">
          {country.relatedEvents && country.relatedEvents.length > 0 ? (
            <div className={styles.entityGrid}>
              {country.relatedEvents.map((e) => (
                <CountryEventCard key={e.id} event={e} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              Aucun événement connecté pour l&apos;instant — cette section se branchera plus tard sur une vraie
              source d&apos;événements.
            </div>
          )}
        </CountrySection>

        <CountrySection id="sources" title="Sources">
          <CountrySourcesList sources={country.sources} />
        </CountrySection>
      </div>
    </main>
  );
}
