import type { Metadata } from "next";
import Header from "@/components/equinoxe/Header";
import { CONFIDENCE_LEVELS } from "@/lib/confidence";
import { CONTACT_EMAIL } from "@/lib/siteInfo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "À propos — Équinoxe News",
  description:
    "Équinoxe News : plateforme indépendante de veille géopolitique, d'analyse stratégique et d'exploitation des sources ouvertes. Mission, méthodologie, sources, engagements.",
};

type IconName = "mission" | "method" | "sources" | "independence" | "contact";

function Icon({ name }: { name: IconName }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "mission":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5z" />
        </svg>
      );
    case "method":
      return (
        <svg {...common} aria-hidden>
          <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
          <rect x="14.5" y="14.5" width="6" height="6" rx="1" />
          <path d="M9.5 6.5h3a2 2 0 0 1 2 2v6" />
        </svg>
      );
    case "sources":
      return (
        <svg {...common} aria-hidden>
          <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
          <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
        </svg>
      );
    case "independence":
      return (
        <svg {...common} aria-hidden>
          <path d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "contact":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
  }
}

const SECTIONS: { id: string; icon: IconName; title: string; summary: string }[] = [
  {
    id: "mission",
    icon: "mission",
    title: "Notre mission",
    summary: "Permettre de suivre, comprendre et contextualiser les évolutions géopolitiques et sécuritaires internationales.",
  },
  {
    id: "methodologie",
    icon: "method",
    title: "Notre méthodologie",
    summary: "Le cheminement de l'information : collecte, recoupement, qualification, analyse et publication. Le rôle de l'IA et la validation humaine.",
  },
  {
    id: "sources",
    icon: "sources",
    title: "Nos sources et nos outils",
    summary: "Les grandes familles de sources (médias, institutions, données ouvertes, événements géolocalisés), leurs limites et les règles de citation.",
  },
  {
    id: "independance",
    icon: "independence",
    title: "Notre indépendance et nos engagements",
    summary: "Transparence, distinction entre faits et hypothèses, gestion des incertitudes, corrections et respect des données personnelles.",
  },
  {
    id: "contact",
    icon: "contact",
    title: "Contact et collaborations",
    summary: "Proposer une source, signaler une erreur, demander une collaboration ou solliciter des informations professionnelles.",
  },
];

const ZONE_NAMES = ["Afrique", "Europe", "Moyen-Orient", "Indopacifique", "Amérique du Sud"];

const STEPS: { title: string; text: string }[] = [
  {
    title: "Collecte",
    text: "Chaque jour, le site rassemble les publications de médias internationaux et régionaux, des événements géolocalisés issus de bases ouvertes et des messages de canaux publics.",
  },
  {
    title: "Recoupement",
    text: "Les informations qui portent sur un même fait sont rapprochées. Un fait relayé par une seule source n'a pas le même poids qu'un fait confirmé par plusieurs sources indépendantes.",
  },
  {
    title: "Qualification",
    text: "Chaque synthèse reçoit une importance et un indice de confiance, de 0 à 100 %, avec son étiquette. Lorsqu'un acteur revendique un événement sans confirmation indépendante, la revendication est signalée comme telle.",
  },
  {
    title: "Analyse",
    text: "Un analyste par zone rédige des synthèses sourcées. Deux fois par semaine, le lundi et le jeudi, un point de situation reprend l'idée maîtresse de la période, la carte des événements et les perspectives.",
  },
  {
    title: "Publication",
    text: "Les contenus sont publiés avec leurs sources et leur date. Les analyses de fond et les points de situation sont relus avant publication ; une information jugée douteuse est mise en attente d'une décision humaine.",
  },
];

const SOURCE_FAMILIES: { title: string; text: string }[] = [
  {
    title: "Médias",
    text: "Presse et médias internationaux et régionaux (BBC, France 24, RFI, DW, Al Jazeera, Jeune Afrique, ONU Info, The Diplomat…), lus par leurs flux publics. Chaque synthèse renvoie vers les articles d'origine.",
  },
  {
    title: "Événements géolocalisés",
    text: "La base ouverte d'événements GDELT pour situer les faits sur la carte. Elle est en grande partie automatique : un lieu ou une victime peut être mal attribué.",
  },
  {
    title: "Institutions et données ouvertes",
    text: "Indicateurs de la Banque mondiale pour les fiches pays, couches ouvertes du globe (câbles sous-marins, séismes, événements naturels, satellites).",
  },
  {
    title: "Canaux publics en ligne",
    text: "Certains canaux Telegram publics servent à repérer tôt une information ou une revendication. Beaucoup sont des canaux d'acteurs : leur ligne éditoriale est connue de l'analyste, et ils ne suffisent jamais seuls à conclure qu'un fait est confirmé.",
  },
];

export default function AProposPage() {
  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Équinoxe News / À propos</p>
          <h1 className={styles.title}>Comprendre le monde. Anticiper ses évolutions.</h1>
          <p className={styles.lead}>Plateforme indépendante de veille géopolitique, d&apos;analyse stratégique et d&apos;exploitation des sources ouvertes.</p>
          <ul className={styles.tags}>
            <li>OSINT</li>
            <li>Géopolitique</li>
            <li>Analyse</li>
          </ul>
        </section>

        <nav aria-label="Rubriques de la page">
          <h2 className={styles.kicker}>Les rubriques de la page</h2>
          <ul className={styles.toc}>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={styles.tocItem}>
                  <span className={styles.tocIcon}>
                    <Icon name={section.icon} />
                  </span>
                  <span>
                    <span className={styles.tocTitle}>{section.title}</span>
                    <span className={styles.tocText}>{section.summary}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section id="mission" className={styles.block}>
          <h2 className={styles.blockTitle}>Notre mission</h2>
          <p>
            Équinoxe News aide à suivre, comprendre et contextualiser les évolutions géopolitiques et sécuritaires internationales. Le site réunit en un
            même endroit l&apos;actualité, sa localisation sur le globe, des fiches pays et des analyses, pour passer du fait au contexte, puis du
            contexte à l&apos;anticipation.
          </p>
          <p>Cinq zones sont suivies :</p>
          <ul className={styles.pills}>
            {ZONE_NAMES.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <section id="methodologie" className={styles.block}>
          <h2 className={styles.blockTitle}>Notre méthodologie</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className={styles.subTitle}>L&apos;indice de confiance</h3>
          <p>Chaque synthèse porte un indice de 0 à 100 % : la probabilité, jugée par l&apos;analyste à partir des sources citées, que l&apos;événement soit réel.</p>
          <ul className={styles.scale}>
            {CONFIDENCE_LEVELS.map((level) => (
              <li key={level.label}>
                <span className={styles.scaleDot} style={{ background: level.color }} aria-hidden />
                <span className={styles.scaleLabel}>{level.label}</span>
                <span className={styles.scaleRange}>
                  {level.min}–{level.max} %
                </span>
              </li>
            ))}
          </ul>

          <h3 className={styles.subTitle}>Le rôle de l&apos;IA et la validation humaine</h3>
          <p>
            Des modèles d&apos;intelligence artificielle (Claude, d&apos;Anthropic) lisent les sources, rédigent les synthèses et proposent un jugement de
            fiabilité. Ils n&apos;ont pas le dernier mot : les points de situation et les analyses de fond sont relus avant publication, et une information
            douteuse n&apos;est publiée qu&apos;après décision humaine. L&apos;IA est un outil de tri et de rédaction, pas une source.
          </p>
        </section>

        <section id="sources" className={styles.block}>
          <h2 className={styles.blockTitle}>Nos sources et nos outils</h2>
          <div className={styles.cards}>
            {SOURCE_FAMILIES.map((family) => (
              <article key={family.title} className={styles.card}>
                <h3 className={styles.cardTitle}>{family.title}</h3>
                <p>{family.text}</p>
              </article>
            ))}
          </div>

          <h3 className={styles.subTitle}>Limites</h3>
          <ul className={styles.list}>
            <li>La presse ne couvre pas tout, ni partout, ni au même rythme : une zone peu couverte l&apos;est aussi par le site.</li>
            <li>Les bases automatiques se trompent parfois de lieu, de date ou de bilan ; les chiffres de victimes sont des ordres de grandeur.</li>
            <li>Les sources d&apos;un acteur du conflit sont précieuses pour connaître sa version, jamais pour établir les faits.</li>
            <li>Plusieurs fiches pays contiennent encore des éléments de démonstration, signalés comme tels, en attendant d&apos;être vérifiés et sourcés.</li>
          </ul>

          <h3 className={styles.subTitle}>Règles de citation</h3>
          <ul className={styles.list}>
            <li>Toute synthèse indique ses sources et renvoie vers les articles d&apos;origine ; le texte des médias n&apos;est pas republié.</li>
            <li>Les sources sont datées ; les canaux d&apos;acteurs sont identifiés comme tels.</li>
          </ul>
        </section>

        <section id="independance" className={styles.block}>
          <h2 className={styles.blockTitle}>Notre indépendance et nos engagements</h2>
          <p>Équinoxe News est un projet éditorial indépendant. Il s&apos;engage à :</p>
          <ul className={styles.list}>
            <li>
              <strong>Distinguer les faits des hypothèses :</strong> chaque synthèse affiche son niveau de confiance, et une revendication n&apos;est jamais présentée comme un fait établi.
            </li>
            <li>
              <strong>Dire l&apos;incertitude :</strong> quand les sources se contredisent ou manquent, le texte le dit au lieu de trancher.
            </li>
            <li>
              <strong>Citer ses sources</strong> pour que chacun puisse vérifier.
            </li>
            <li>
              <strong>Corriger :</strong> une erreur signalée est vérifiée, puis corrigée dans les meilleurs délais.
            </li>
            <li>
              <strong>Respecter les données personnelles :</strong> la consultation du site ne demande ni inscription ni information personnelle, et les espaces de travail privés sont réservés à la rédaction.
            </li>
          </ul>
        </section>

        <section id="contact" className={styles.block}>
          <h2 className={styles.blockTitle}>Contact et collaborations</h2>
          <p>Pour proposer une source, signaler une erreur, demander une collaboration ou solliciter des informations professionnelles :</p>
          {CONTACT_EMAIL ? (
            <p>
              <a className={styles.mail} href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </p>
          ) : (
            <p className={styles.muted}>L&apos;adresse de contact sera publiée prochainement.</p>
          )}
          <p className={styles.muted}>Pour signaler une erreur, indiquez le lien de la page concernée et la source qui, selon vous, la contredit.</p>
        </section>
      </div>
    </main>
  );
}
