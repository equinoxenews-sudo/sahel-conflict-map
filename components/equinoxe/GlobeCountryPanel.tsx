"use client";

import { useEffect, useMemo, useState } from "react";
import HexFlag from "@/components/investigation/HexFlag";
import { RISK_COLORS, RISK_LABELS, type RiskTier } from "@/lib/countryRisk";
import { itemsInPeriod, periodLabel, type PeriodRange } from "@/lib/globeCountry";
import { briefImageSrc } from "@/lib/imageUrls";
import { POWER_COMPONENTS } from "@/lib/powerMethod";
import type { CountryPanelData, PanelMembership, PanelRelation } from "@/lib/countryPanel";
import styles from "./GlobeCountryPanel.module.css";

export interface PanelArticle {
  id: number;
  title: string;
  publishedAt: string;
  imageUrl: string | null;
}

export type PanelView = "profil" | "actualites";

interface GlobeCountryPanelProps {
  iso3: string;
  /** Nom français (fiche de la zone) ou, à défaut, nom du fond de carte. */
  name: string;
  flagIso2: string | null;
  tier: RiskTier | null;
  /** Fiche pays Approche, quand le pays en a une. */
  href: string | null;
  /** Période choisie sur le globe (curseur) ; null tant qu'il n'a rien choisi. */
  range: PeriodRange | null;
  /** Vue affichée (profil ou liste d'articles) : tenue par le parent pour la retrouver au retour d'une page. */
  view: PanelView;
  onViewChange: (view: PanelView) => void;
  onClose: () => void;
}

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** Panneau pays du globe : remplace la petite bulle. À gauche sur ordinateur, tiroir en bas sur téléphone. */
export default function GlobeCountryPanel({ iso3, name, flagIso2, tier, href, range, view, onViewChange, onClose }: GlobeCountryPanelProps) {
  const [data, setData] = useState<CountryPanelData | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Articles du pays : étiquetés avec lui ou le nommant (60 derniers jours), placés sur la carte ou non.
  const [articles, setArticles] = useState<PanelArticle[]>([]);

  // Le parent recrée le composant à chaque pays (`key={iso3}`) : l'état repart donc à zéro.
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/pays/${iso3}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<CountryPanelData>) : Promise.reject(new Error(String(response.status)))))
      .then((payload) => setData(payload))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setFailed(true);
      });
    fetch(`/api/pays/${iso3}/articles`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<{ articles: PanelArticle[] }>) : Promise.reject(new Error(String(response.status)))))
      .then((payload) => setArticles(payload.articles))
      .catch(() => {
        /* liste vide : le panneau le dit */
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
        <button type="button" className={view === "actualites" ? `${styles.action} ${styles.actionOn}` : styles.action} onClick={() => onViewChange(view === "actualites" ? "profil" : "actualites")} aria-pressed={view === "actualites"}>
          Actualités · {inPeriod.length}
        </button>
      </div>

      <div className={styles.body}>
        {view === "actualites" ? (
          <>
            <button type="button" className={styles.back} onClick={() => onViewChange("profil")}>
              ← Retour au profil
            </button>
            <ArticleList articles={inPeriod} period={label} />
          </>
        ) : failed ? (
          <p className={styles.note}>Données du pays indisponibles pour le moment.</p>
        ) : !data ? (
          <p className={styles.note}>Chargement…</p>
        ) : (
          <Profile data={data} articles={inPeriod} period={label} onMore={() => onViewChange("actualites")} />
        )}
      </div>
    </aside>
  );
}

function ArticleRow({ article }: { article: PanelArticle }) {
  return (
    <li>
      <a className={styles.article} href={`/briefs/${article.id}`}>
        {article.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.thumb} src={briefImageSrc(article.imageUrl)} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <span className={styles.thumb} aria-hidden="true" />
        )}
        <span className={styles.articleText}>
          <span className={styles.articleTitle}>{article.title}</span>
          <span className={styles.articleDate}>{DATE.format(new Date(article.publishedAt))}</span>
        </span>
      </a>
    </li>
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
          <ArticleRow key={article.id} article={article} />
        ))}
      </ul>
    </section>
  );
}

/** Hexagone doré du site, avec un logo d'organisation ou, à défaut, son sigle. */
function OrgHex({ logo, acronym, name }: { logo: string | null; acronym: string; name: string }) {
  return (
    <span className={styles.orgHex} title={name}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={`Logo ${name}`} className={styles.orgHexLogo} loading="lazy" />
      ) : (
        <span className={styles.orgHexText} aria-hidden="true">
          {acronym}
        </span>
      )}
    </span>
  );
}

function RelationChip({ relation }: { relation: PanelRelation }) {
  return (
    <li className={styles.chip} title={relation.titles.join(" · ")}>
      {relation.iso2 ? (
        <span className={styles.chipFlag}>
          <HexFlag iso2={relation.iso2} name={relation.name} />
        </span>
      ) : (
        <OrgHex logo={relation.org?.logo ?? null} acronym={relation.org?.acronym ?? ""} name={relation.name} />
      )}
      <span className={styles.chipName}>{relation.name}</span>
    </li>
  );
}

function MembershipChip({ membership }: { membership: PanelMembership }) {
  return (
    <li className={styles.chip} title={membership.note ? `${membership.name} — ${membership.note}` : membership.name}>
      <OrgHex logo={membership.logo} acronym={membership.acronym} name={membership.name} />
      <span className={styles.chipName}>
        {membership.name}
        {membership.note ? <small>{membership.note}</small> : null}
      </span>
    </li>
  );
}

function Profile({ data, articles, period, onMore }: { data: CountryPanelData; articles: PanelArticle[]; period: string; onMore: () => void }) {
  const partners = data.relations.filter((relation) => relation.type !== "tension");
  const tensions = data.relations.filter((relation) => relation.type === "tension");
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
          {partners.length > 0 ? (
            <section>
              <h3 className={styles.sectionTitle}>Relations clés</h3>
              <ul className={styles.chips}>
                {partners.map((relation) => (
                  <RelationChip key={relation.id} relation={relation} />
                ))}
              </ul>
            </section>
          ) : null}
          {tensions.length > 0 ? (
            <section>
              <h3 className={styles.sectionTitle}>Tensions et différends</h3>
              <ul className={styles.chips}>
                {tensions.map((relation) => (
                  <RelationChip key={relation.id} relation={relation} />
                ))}
              </ul>
            </section>
          ) : null}
          {data.memberships.length > 0 ? (
            <section>
              <h3 className={styles.sectionTitle}>Organisations et alliances</h3>
              <ul className={styles.chips}>
                {data.memberships.map((membership) => (
                  <MembershipChip key={membership.id} membership={membership} />
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
                <ArticleRow key={article.id} article={article} />
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
