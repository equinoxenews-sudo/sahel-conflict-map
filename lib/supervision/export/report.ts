// Supervision V1 : modèle du rapport PDF d'une Supervision. Module PUR et testé : aucune base, aucun réseau, AUCUNE IA.
//
// Le rapport exporte ce que le tableau de bord sait DÉJÀ (périmètre, événements, alertes, notes) avec leurs sources, leur date et leurs
// limites (cahier des charges, section 6.5 : « PDF professionnel exportant une analyse déjà existante, avec périmètre, date, sources et
// limites ; pas de nouvelle génération IA »). Rien n'est inventé : ce qui n'est pas connu est écrit comme tel.
// Ce module produit un modèle neutre (sections et blocs) ; pdf.ts le dessine.

import { buildAlerts, effectiveStatus, LEVEL_LABELS, type StoredDecision } from "../alerts/rules";
import { PRIORITY_LABELS, VERIFICATION_LABELS, type BoardEvent } from "../dashboard/fixtures";
import { normalizeUrl } from "../data/dedupe";
import { STORY_MIN_SHARED, STORY_THRESHOLD, STORY_WINDOW_HOURS } from "../data/stories";
import { SIGNAL_CRITICAL_MENTIONS, SIGNAL_IMPORTANT_MENTIONS } from "../data/thresholds";
import type { Note } from "../core/notes";

export const EXPORT_PERIODS = [7, 30, 90] as const;
export type ExportPeriod = (typeof EXPORT_PERIODS)[number];

/** Plafonds : un rapport reste lisible ; ce qui dépasse est annoncé, jamais passé sous silence. */
export const LIMITS = { alerts: 40, articles: 25, publications: 40, signalTop: 10, notes: 200, storyMembers: 6 } as const;

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][]; widths: number[] }
  | { type: "entry"; title: string; tag?: { text: string; tone: "critical" | "important" | "info" | "muted" }; lines: string[]; refs: number[] }
  | { type: "note"; text: string };

export interface Section {
  heading: string;
  blocks: Block[];
}

export interface SourceRef {
  n: number;
  host: string;
  title: string;
  url: string;
  at: string;
}

export interface Report {
  title: string;
  subtitle: string;
  meta: [string, string][];
  sections: Section[];
  sources: SourceRef[];
  /** Pied de page : ce que le lecteur doit savoir en un coup d'œil. */
  footerNote: string;
}

export interface ReportInput {
  supervision: { name: string; state: string };
  scope: { countries: string[]; objective: string; keywords: string[]; entities: string[]; exclusions: string[] };
  events: readonly BoardEvent[];
  coverage: { articles: number; signals: number; publications: number; merged: number; grouped: number; latest: string | null; truncated: boolean };
  period: ExportPeriod;
  decisions: ReadonlyMap<string, StoredDecision>;
  /** null = les notes ne sont pas incluses (choix de l'utilisateur) ; un tableau vide = incluses mais il n'y en a pas. */
  notes: readonly Note[] | null;
  pausedAt?: string | null;
  generatedAt: Date;
}

const STATE_LABELS: Record<string, string> = {
  draft: "Brouillon",
  initializing: "Initialisation",
  active: "Active",
  paused: "En pause",
  error: "En erreur",
  read_only_grace: "Lecture seule",
  pending_deletion: "Suppression en cours",
};

const TZ = "Europe/Paris";
const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const longFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
export const formatDay = (iso: string) => dayFormat.format(new Date(iso));
export const formatLong = (date: Date) => `${longFormat.format(date)} (heure de Paris)`;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Numérote les adresses citées : une même adresse (normalisée) garde le même numéro dans tout le rapport. */
class SourceBook {
  readonly list: SourceRef[] = [];
  private readonly byKey = new Map<string, number>();

  cite(url: string | undefined, title: string, at: string): number[] {
    if (!url) return [];
    const key = normalizeUrl(url) ?? url;
    const known = this.byKey.get(key);
    if (known !== undefined) return [known];
    const n = this.list.length + 1;
    this.byKey.set(key, n);
    this.list.push({ n, host: hostOf(url), title, url, at });
    return [n];
  }
}

const THEME_LABEL: Record<BoardEvent["theme"], string> = { conflits: "Conflits", securite: "Sécurité", politique: "Politique", humanitaire: "Humanitaire" };
const KIND_LABEL = { article: "Article analysé", signal: "Signalement médiatique", publication: "Publication de presse" } as const;

function verificationText(event: BoardEvent): string {
  return `${VERIFICATION_LABELS[event.verification]}${event.qualifier ? ` · ${event.qualifier}` : ""}`;
}

function placeText(event: BoardEvent): string {
  const base = event.place || "Lieu non précisé";
  if (event.lat === undefined || event.lon === undefined) return `${base} (pas de position retrouvée)`;
  return `${base} (${event.lat.toFixed(2)}, ${event.lon.toFixed(2)}${event.geo ? `, déduite du texte, précision ${event.geo.precision === "ville" ? "localité" : "région"}` : ""}${event.storyGeo ? ", reprise d'une autre publication du même récit" : ""})`;
}

function entryLines(event: BoardEvent, extra: string[] = []): string[] {
  const lines = [`${KIND_LABEL[event.kind ?? "article"]} · ${THEME_LABEL[event.theme]} · ${formatDay(event.at)} · ${placeText(event)}`, `Vérification : ${verificationText(event)}`];
  if (event.domains?.length) lines.push(`Sources : ${[...new Set(event.domains)].filter((d) => d !== "news.google.com").join(", ") || "voir la liste des sources"}`);
  return [...lines, ...extra];
}

export function buildReport(input: ReportInput): Report {
  const { supervision, scope, coverage, period, decisions, notes, generatedAt } = input;
  const since = generatedAt.getTime() - period * 86_400_000;
  const events = input.events.filter((event) => Date.parse(event.at) >= since);
  const book = new SourceBook();

  const articles = events.filter((e) => e.kind === "article");
  const signals = events.filter((e) => e.kind === "signal");
  const publications = events.filter((e) => e.kind === "publication");
  const alerts = buildAlerts(events, { state: supervision.state, pausedAt: input.pausedAt ?? null });
  const status = (id: string, level: (typeof alerts)[number]["level"]) => effectiveStatus({ level }, decisions.get(id));
  const newAlerts = alerts.filter((a) => status(a.id, a.level) === "new");

  const sections: Section[] = [];

  // 1. Synthèse chiffrée -----------------------------------------------------------------------------------------------
  const themeRows = (Object.keys(THEME_LABEL) as BoardEvent["theme"][])
    .map((theme) => [THEME_LABEL[theme], String(events.filter((e) => e.theme === theme).length)])
    .filter((row) => row[1] !== "0");
  sections.push({
    heading: "Synthèse",
    blocks: [
      {
        type: "table",
        head: ["Élément", "Nombre"],
        widths: [0.75, 0.25],
        rows: [
          [`Événements sur ${period} jours`, String(events.length)],
          ["Articles analysés", String(articles.length)],
          ["Signalements médiatiques", String(signals.length)],
          ["Publications de presse collectées", String(publications.length)],
          ["Alertes (critiques et importantes)", `${alerts.length} dont ${newAlerts.length} à traiter`],
        ],
      },
      ...(themeRows.length > 0 ? [{ type: "table" as const, head: ["Thème", "Événements"], widths: [0.75, 0.25], rows: themeRows }] : []),
      ...(events.length === 0 ? [{ type: "paragraph" as const, text: "Aucun événement retrouvé pour ce périmètre sur la période. Ce n'est pas une preuve qu'il ne s'y passe rien : la couverture des sources est partielle." }] : []),
    ],
  });

  // 2. Alertes ---------------------------------------------------------------------------------------------------------
  const shownAlerts = alerts.slice(0, LIMITS.alerts);
  const alertBlocks: Block[] = [
    { type: "paragraph", text: "Une alerte naît d'un événement de priorité critique ou importante ; « information » n'en déclenche jamais. La priorité et la vérification sont indépendantes : une alerte n'est pas une preuve." },
  ];
  if (alerts.length === 0) alertBlocks.push({ type: "paragraph", text: "Aucune alerte sur la période." });
  for (const alert of shownAlerts) {
    const decision = status(alert.id, alert.level);
    const event = alert.event;
    const refs = [...book.cite(event.url, event.title, event.at), ...(event.story?.members ?? []).flatMap((m) => book.cite(m.url, m.title, m.at))];
    alertBlocks.push({
      type: "entry",
      title: event.title,
      tag: { text: LEVEL_LABELS[alert.level].toUpperCase(), tone: alert.level === "critique" ? "critical" : "important" },
      lines: entryLines(event, [`Origine du classement : ${alert.why}`, ...(decision !== "new" ? [`Décision enregistrée : ${decision === "read" ? "lue" : decision === "kept" ? "conservée" : "masquée"}`] : [])]),
      refs,
    });
  }
  if (alerts.length > shownAlerts.length) alertBlocks.push({ type: "note", text: `${alerts.length - shownAlerts.length} alerte(s) de plus ne sont pas listées ici (plafond de ${LIMITS.alerts} par rapport).` });
  sections.push({ heading: "Alertes", blocks: alertBlocks });

  // 3. Articles analysés -----------------------------------------------------------------------------------------------
  const alertIds = new Set(shownAlerts.map((a) => a.id));
  const otherArticles = articles.filter((e) => !alertIds.has(e.id));
  if (articles.length > 0) {
    const shown = otherArticles.slice(0, LIMITS.articles);
    const blocks: Block[] = [{ type: "paragraph", text: "Articles rédigés par le site à partir de plusieurs sources. Le statut de vérification reprend le qualificatif de l'analyse ; seul « Confirmé » donne le statut confirmé." }];
    if (shown.length === 0) blocks.push({ type: "paragraph", text: "Tous les articles de la période figurent déjà dans les alertes ci-dessus." });
    for (const event of shown) {
      const refs = [...book.cite(event.url, event.title, event.at)];
      blocks.push({ type: "entry", title: event.title, tag: { text: PRIORITY_LABELS[event.priority].toUpperCase(), tone: "muted" }, lines: [...entryLines(event), ...(event.summary ? [event.summary.length > 320 ? `${event.summary.slice(0, 317)}…` : event.summary] : [])], refs });
    }
    if (otherArticles.length > shown.length) blocks.push({ type: "note", text: `${otherArticles.length - shown.length} article(s) de plus ne sont pas listés (plafond de ${LIMITS.articles}).` });
    sections.push({ heading: "Articles analysés", blocks });
  }

  // 4. Publications de presse ------------------------------------------------------------------------------------------
  if (publications.length > 0) {
    const shown = publications.slice(0, LIMITS.publications);
    const blocks: Block[] = [
      { type: "paragraph", text: "Publications de presse repérées par la recherche de cette Supervision (sans IA). Elles ne sont ni vérifiées ni classées par priorité : leur contenu est celui de l'éditeur. Plusieurs médias qui racontent la même histoire sont regroupés ; ce regroupement n'est pas une preuve indépendante." },
    ];
    for (const event of shown) {
      const members = event.story?.members ?? [];
      const refs = [...book.cite(event.url, event.title, event.at), ...members.slice(0, LIMITS.storyMembers).flatMap((m) => book.cite(m.url, m.title, m.at))];
      const extra = members.length > 0 ? [`Même histoire reprise par ${members.length} autre${members.length > 1 ? "s" : ""} publication${members.length > 1 ? "s" : ""} : ${members.slice(0, LIMITS.storyMembers).map((m) => m.source ?? hostOf(m.url ?? "")).join(", ")}${members.length > LIMITS.storyMembers ? " …" : ""}`] : [];
      blocks.push({ type: "entry", title: event.title, lines: entryLines(event, [...extra, ...(event.reason ? [`Pourquoi cette publication est ici : ${event.reason}`] : [])]), refs });
    }
    if (publications.length > shown.length) blocks.push({ type: "note", text: `${publications.length - shown.length} publication(s) de plus ne sont pas listées (plafond de ${LIMITS.publications}).` });
    sections.push({ heading: "Publications de presse", blocks });
  }

  // 5. Signalements médiatiques (agrégés) ------------------------------------------------------------------------------
  if (signals.length > 0) {
    const byTitleKind = new Map<string, number>();
    for (const signal of signals) {
      const key = `${signal.title.replace(/ ·.*$/, "").replace(/ \(.*$/, "")}`;
      byTitleKind.set(key, (byTitleKind.get(key) ?? 0) + 1);
    }
    const top = signals.filter((s) => s.priority !== "information" && !alertIds.has(s.id)).sort((a, b) => b.publications - a.publications).slice(0, LIMITS.signalTop);
    const blocks: Block[] = [
      { type: "paragraph", text: `Signalements issus de l'observation de la presse mondiale (GDELT). Ils sont donnés ici en volume : un signalement n'est pas un fait établi, et le nombre de mentions mesure l'attention des médias, pas la véracité. Importante à partir de ${SIGNAL_IMPORTANT_MENTIONS} mentions, critique à partir de ${SIGNAL_CRITICAL_MENTIONS}, pour les violences seulement.` },
      { type: "table", head: ["Type de signalement", "Nombre"], widths: [0.75, 0.25], rows: [...byTitleKind.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => [label, String(count)]) },
    ];
    if (top.length > 0) {
      blocks.push({ type: "paragraph", text: "Signalements les plus repris non repris ci-dessus :" });
      for (const event of top) blocks.push({ type: "entry", title: event.title, tag: { text: PRIORITY_LABELS[event.priority].toUpperCase(), tone: "muted" }, lines: [`${formatDay(event.at)} · ${event.publications} mention${event.publications > 1 ? "s" : ""} · ${event.place}`], refs: book.cite(event.url, event.title, event.at) });
    }
    sections.push({ heading: "Signalements médiatiques", blocks });
  }

  // 6. Notes (au choix de l'utilisateur) -------------------------------------------------------------------------------
  if (notes !== null) {
    const shown = notes.slice(0, LIMITS.notes);
    const blocks: Block[] = [{ type: "paragraph", text: "Notes personnelles de cette Supervision, incluses à la demande de l'utilisateur. Elles ne sont jamais visibles d'un autre compte." }];
    if (shown.length === 0) blocks.push({ type: "paragraph", text: "Aucune note." });
    for (const note of shown) {
      blocks.push({ type: "entry", title: note.body, lines: [`${formatDay(note.createdAt)}${note.revision > 1 ? ` · modifiée le ${formatDay(note.updatedAt)}` : ""}${note.eventTitle ? ` · sur « ${note.eventTitle} »` : " · note générale"}`], refs: [] });
    }
    if (notes.length > shown.length) blocks.push({ type: "note", text: `${notes.length - shown.length} note(s) de plus ne sont pas listées (plafond de ${LIMITS.notes}).` });
    sections.push({ heading: "Notes", blocks });
  }

  // 7. Limites et méthode ----------------------------------------------------------------------------------------------
  const anyGeo = events.some((event) => event.geo);
  sections.push({
    heading: "Limites et méthode",
    blocks: [
      {
        type: "bullets",
        items: [
          "Ce document ne contient aucune analyse générée par une intelligence artificielle : il reprend les données déjà présentes dans le tableau de bord, sans nouveau traitement.",
          "La couverture des sources est partielle : l'absence d'un événement n'est pas la preuve qu'il n'a pas eu lieu, et un événement présent n'est pas forcément exact.",
          "Vérification : seul « Confirmé » dans l'analyse d'un article donne le statut confirmé ; tout le reste est un signalement. Les statuts « corroboré » et « contesté » ne sont pas déduits automatiquement.",
          `Priorité : pour un article, importance haute (critique si l'événement est violent) ; pour un signalement violent, importante à partir de ${SIGNAL_IMPORTANT_MENTIONS} mentions et critique à partir de ${SIGNAL_CRITICAL_MENTIONS} ; une publication de presse est toujours au niveau information.`,
          `Regroupement : deux publications de presse sont regroupées si leurs titres partagent au moins ${Math.round(STORY_THRESHOLD * 100)} % de leurs mots significatifs (au moins ${STORY_MIN_SHARED} mots) et sont publiées à moins de ${STORY_WINDOW_HOURS} h d'écart. Plusieurs médias qui reprennent une même information ne forment pas autant de sources indépendantes.`,
          "Chaque numéro entre crochets renvoie à la liste des sources en fin de document. Les adresses sont celles retrouvées par la collecte ; Équinoxe ne garantit ni leur exhaustivité ni l'exactitude de leur contenu.",
          ...(anyGeo ? ["Positions géographiques déduites automatiquement d'un nom de lieu du texte (sans IA) : elles peuvent être imprécises. Données géographiques © GeoNames (CC BY 4.0)."] : []),
          ...(coverage.truncated ? ["La lecture des données a été limitée : tout n'est pas forcément affiché."] : []),
          ...(coverage.merged > 0 || coverage.grouped > 0 ? [`Doublons : ${coverage.merged} entrée(s) citant la même publication et ${coverage.grouped} publication(s) de presse regroupée(s) sous une même histoire ont été fusionnées avant ce rapport.`] : []),
        ],
      },
    ],
  });

  // Périmètre et métadonnées -------------------------------------------------------------------------------------------
  const list = (items: string[]) => (items.length > 0 ? items.join(", ") : "aucun");
  const meta: [string, string][] = [
    ["Supervision", supervision.name],
    ["État", STATE_LABELS[supervision.state] ?? supervision.state],
    ["Pays", list(scope.countries)],
    ["Objectif", scope.objective],
    ["Mots-clés", list(scope.keywords)],
    ["Entités", list(scope.entities)],
    ["Exclusions", list(scope.exclusions)],
    ["Période du rapport", `${period} derniers jours, du ${formatDay(new Date(since).toISOString())} au ${formatDay(generatedAt.toISOString())}`],
    ["Données les plus récentes", coverage.latest ? formatDay(coverage.latest) : "aucune donnée"],
    ["Généré le", formatLong(generatedAt)],
  ];

  return {
    title: supervision.name,
    subtitle: "Rapport de Supervision",
    meta,
    sections,
    sources: book.list,
    footerNote: "Sans IA · signalements et alertes ne sont pas des preuves",
  };
}

/** Nom de fichier sûr : « supervision-test-nigeria-2026-11-10.pdf ». */
export function reportFilename(name: string, date: Date): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(date);
  return `supervision-${slug || "rapport"}-${day}.pdf`;
}

export function isExportPeriod(value: unknown): value is ExportPeriod {
  return typeof value === "number" && (EXPORT_PERIODS as readonly number[]).includes(value);
}
