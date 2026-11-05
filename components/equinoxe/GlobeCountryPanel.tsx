"use client";

import { useEffect, useMemo, useState } from "react";
import HexFlag from "@/components/investigation/HexFlag";
import { RISK_COLORS, RISK_LABELS, type RiskTier } from "@/lib/countryRisk";
import { itemsInPeriod, periodLabel, type PeriodRange } from "@/lib/globeCountry";
import { POWER_COMPONENTS } from "@/lib/powerMethod";
import type { CountryPanelData } from "@/lib/countryPanel";
import styles from "./GlobeCountryPanel.module.css";

export interface PanelArticle {
  id: number;
  title: string;
  publishedAt: string;
}

interface GlobeCountryPanelProps {
  iso3: string;
  /** Nom français (fiche de la zone) ou, à défaut, nom du fond de carte. */
  name: string;
  flagIso2: string | null;
  tier: RiskTier | null;
  /** Fiche pays Approche, quand le pays en a une. */
  href: string | null;
  /** Articles analysés rattachés à ce pays (60 derniers jours), du plus récent au plus ancien. */
  articles: PanelArticle[];
  /** Période choisie sur le globe (curseur) ; null tant qu'il n'a rien choisi. */
  range: PeriodRange | null;
  onClose: () => void;
}

const RELATION_LABELS: Record<string, string> = { treaty: "Traité", cooperation: "Coopération", tension: "Tension" };
const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

type View = "profil" | "actualites";

/** Panneau pays du globe : remplace la petite bulle. À gauche sur ordinateur, tiroir en bas sur téléphone. */
export default function GlobeCountryPanel({ iso3, name, flagIso2, tier, href, articles, range, onClose }: GlobeCountryPanelProps) {
  const [data, setData] = useState<CountryPanelData | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("profil");
  const [expanded, setExpanded] = useState(false);

  // Nouveau pays : on repart de l'onglet « profil » (le composant est recréé via `key={iso3}` par le parent).
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/pays/${iso3}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<CountryPanelData>) : Promise.reject(new Error(String(response.status)))))
      .then((payload) => setData(payload))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [iso3]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  const inPeriod = useMemo(() => itemsInPeriod(articles, range), [articles, range]);
  const label = periodLabel(range);
  const title = data?.name ?? name;

  return (
    <aside className={expanded ? `${styles.panel} ${styles.panelExpanded}` : styles.panel} lang="fr" aria-label={`Fiche rapide : ${title}`}>
      <button type="button" className={styles.handle} onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Réduire le panneau" : "Agrandir le panneau"} aria-expanded={expanded}>
        <span aria-hidden="true" />
      </button>
      <header className={styles.head}>
        {flagIso2 ? (
          <span className={styles.flag}>
            <HexFlag iso2={flagIso2} name={title} />
          </span>
        ) : null}
        <div className={styles.names}>
          <h2 className={styles.name}>{title}</h2>
          {tier ? (
            <span className={styles.tierPill} style={{ color: RISK_COLORS[tier], borderColor: RISK_COLORS[tier] }}>
              <span className={styles.tierDot} style={{ background: RISK_COLORS[tier] }} aria-hidden="true" />
              {RISK_LABELS[tier]}
            </span>
          ) : (
            <span className={styles.tierNone}>Pas d’alerte en cours</span>
          )}
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer le panneau">
          ✕
        </button>
      </header>

      <div className={styles.actions}>
        {href ? (
          <a className={styles.action} href={href}>
            Fiche pays
          </a>
        ) : (
          <span className={`${styles.action} ${styles.actionOff}`} title="Fiche Approche en préparation">
            Fiche pays
          </span>
        )}
        <button type="button" className={view === "actualites" ? `${styles.action} ${styles.actionOn}` : styles.action} onClick={() => setView(view === "actualites" ? "profil" : "actualites")} aria-pressed={view === "actualites"}>
          Actualités · {inPeriod.length}
        </button>
      </div>

      <div className={styles.body}>
        {view === "actualites" ? (
          <ArticleList articles={inPeriod} period={label} />
        ) : failed ? (
          <p className={styles.note}>Données du pays indisponibles pour le moment.</p>
        ) : !data ? (
          <p className={styles.note}>Chargement…</p>
        ) : (
          <Profile data={data} articles={inPeriod} period={label} onMore={() => setView("actualites")} />
        )}
      </div>
    </aside>
  );
}

function ArticleList({ articles, period }: { articles: PanelArticle[]; period: string }) {
  if (articles.length === 0) return <p className={styles.note}>Aucun article analysé sur ce pays sur la période ({period}). Élargissez la période avec le curseur.</p>;
  return (
    <section>
      <h3 className={styles.sectionTitle}>
        {articles.length} {articles.length > 1 ? "articles" : "article"} · {period}
      </h3>
      <ul className={styles.articles}>
        {articles.map((article) => (
          <li key={article.id}>
            <a className={styles.article} href={`/briefs/${article.id}`}>
              <span className={styles.articleTitle}>{article.title}</span>
              <span className={styles.articleDate}>{DATE.format(new Date(article.publishedAt))}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Profile({ data, articles, period, onMore }: { data: CountryPanelData; articles: PanelArticle[]; period: string; onMore: () => void }) {
  return (
    <>
      {data.figures.length > 0 ? (
        <section>
          <h3 className={styles.sectionTitle}>Chiffres clés</h3>
          <dl className={styles.facts}>
            {data.figures.map((figure) => (
              <div key={figure.label} className={styles.fact}>
                <dt>{figure.label}</dt>
                <dd>
                  {figure.value}
                  <span className={styles.year}>{figure.year}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <PowerBlock power={data.power} />

      {data.identity.length > 0 ? (
        <section>
          <h3 className={styles.sectionTitle}>Fiche d’identité</h3>
          <dl className={styles.facts}>
            {data.identity.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {data.approche ? (
        <>
          {data.relations.length > 0 ? (
            <section>
              <h3 className={styles.sectionTitle}>Relations clés</h3>
              <ul className={styles.relations}>
                {data.relations.map((relation) => (
                  <li key={relation.id} className={styles.relation}>
                    <span className={styles.relationName}>{relation.name}</span>
                    <span className={`${styles.chip} ${relation.type === "tension" ? styles.chipTension : ""}`}>{RELATION_LABELS[relation.type]}</span>
                    <span className={styles.relationTitle}>{relation.title}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {data.memberships.length > 0 ? (
            <section>
              <h3 className={styles.sectionTitle}>Organisations et alliances</h3>
              <ul className={styles.memberships}>
                {data.memberships.map((membership) => (
                  <li key={membership}>{membership}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <section className={styles.mockup}>
          <span className={styles.mockupBadge}>Maquette</span>
          <h3 className={styles.sectionTitle}>Relations clés, organisations et alliances</h3>
          <p className={styles.note}>Ces rubriques arriveront avec la fiche Approche de ce pays, sourcée et vérifiée. Aucune donnée n’est affichée d’ici là.</p>
        </section>
      )}

      <section>
        <h3 className={styles.sectionTitle}>Derniers articles</h3>
        {articles.length === 0 ? (
          <p className={styles.note}>Aucun article analysé sur la période ({period}).</p>
        ) : (
          <>
            <ul className={styles.articles}>
              {articles.slice(0, 3).map((article) => (
                <li key={article.id}>
                  <a className={styles.article} href={`/briefs/${article.id}`}>
                    <span className={styles.articleTitle}>{article.title}</span>
                    <span className={styles.articleDate}>{DATE.format(new Date(article.publishedAt))}</span>
                  </a>
                </li>
              ))}
            </ul>
            {articles.length > 3 ? (
              <button type="button" className={styles.more} onClick={onMore}>
                Voir les {articles.length} articles →
              </button>
            ) : null}
          </>
        )}
      </section>

      <p className={styles.source}>Chiffres : {data.source}.</p>
    </>
  );
}

function PowerBlock({ power }: { power: CountryPanelData["power"] }) {
  if (!power) {
    return (
      <section>
        <h3 className={styles.sectionTitle}>Indice de puissance</h3>
        <p className={styles.note}>Pas assez de données publiques pour calculer l’indice de ce pays.</p>
      </section>
    );
  }
  return (
    <section>
      <h3 className={styles.sectionTitle}>
        Indice de puissance <span className={styles.experimental}>expérimental</span>
      </h3>
      <div className={styles.power}>
        <span className={styles.powerRank}>#{power.rank}</span>
        <span className={styles.powerOf}>sur {power.of} pays et territoires</span>
        <span className={styles.powerScore}>{power.score.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 100</span>
      </div>
      <div className={styles.bar} role="img" aria-label={`Indice ${power.score} sur 100`}>
        <span style={{ width: `${power.score}%` }} />
      </div>
      <details className={styles.method}>
        <summary>Méthode et composantes</summary>
        <p>
          Indice calculé par Équinoxe sur des données publiques : pour chaque composante, le pays est classé parmi tous les pays qui ont une valeur (de 0 à 100), puis les composantes sont pondérées. Une
          donnée absente ou ancienne de plus de huit ans est notée « n/c » et le poids est reporté sur les autres. Ce n’est ni un classement officiel, ni celui d’un tiers ; les pondérations sont un choix éditorial.
        </p>
        <ul>
          {power.components.map((component) => {
            const definition = POWER_COMPONENTS.find((item) => item.id === component.id);
            return (
              <li key={component.id}>
                <span>
                  {component.label} <em>({component.weight} %)</em>
                </span>
                <strong>{component.score === null ? "n/c" : Math.round(component.score)}</strong>
                <small>{definition?.source}</small>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
