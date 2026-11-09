// Supervision V1, Lot 1 : états d'une Supervision, transitions autorisées et ce que chaque état permet. Module pur, testé.
// (Le cahier propose de séparer l'état métier de l'état de traitement ; à ce stade un seul champ suffit, le traitement ayant son
// propre journal d'exécutions au Lot 4.)

export const STATES = ["draft", "initializing", "active", "paused", "error", "read_only_grace", "pending_deletion", "deleted"] as const;
export type SupervisionState = (typeof STATES)[number];

export function isState(value: unknown): value is SupervisionState {
  return typeof value === "string" && (STATES as readonly string[]).includes(value);
}

/** Transitions autorisées. L'activation passe par « initializing » : le crédit n'est définitivement consommé qu'à la confirmation. */
const TRANSITIONS: Record<SupervisionState, readonly SupervisionState[]> = {
  draft: ["initializing", "pending_deletion", "deleted"],
  initializing: ["active", "draft", "error"],
  active: ["paused", "error", "read_only_grace", "pending_deletion"],
  paused: ["active", "read_only_grace", "pending_deletion"],
  error: ["draft", "initializing", "paused", "pending_deletion"],
  read_only_grace: ["active", "paused", "pending_deletion"],
  pending_deletion: ["deleted", "paused"],
  deleted: [],
};

export function canTransition(from: SupervisionState, to: SupervisionState): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface StateCapabilities {
  /** Collectes propres à la Supervision (cahier : une veille en pause ne collecte plus). */
  collect: boolean;
  /** Analyses et synthèses IA automatiques. */
  ai: boolean;
  /** Alertes et e-mails (cahier : jamais pour une veille en pause, résiliée ou en lecture seule). */
  notify: boolean;
  /** Questions à l'assistant (les conversations existantes restent lisibles dans tous les cas). */
  assistant: boolean;
  /** Consulter le tableau de bord, l'historique, les analyses. */
  read: boolean;
  /** Exporter (PDF d'une analyse existante, données). */
  export: boolean;
  /** Modifier le tableau de bord (modules, disposition, filtres d'affichage). */
  editDashboard: boolean;
}

const NONE: StateCapabilities = { collect: false, ai: false, notify: false, assistant: false, read: false, export: false, editDashboard: false };
const READ_ONLY: StateCapabilities = { ...NONE, read: true, export: true };

const CAPABILITIES: Record<SupervisionState, StateCapabilities> = {
  draft: { ...NONE, read: true, editDashboard: true },
  // L'initialisation collecte (premier remplissage) mais n'envoie rien tant que la veille n'est pas active.
  initializing: { ...NONE, collect: true, read: true, export: true, editDashboard: true },
  active: { collect: true, ai: true, notify: true, assistant: true, read: true, export: true, editDashboard: true },
  // Pause : tout s'arrête, données et tableau restent consultables et modifiables (la disposition n'a aucun coût).
  paused: { ...NONE, read: true, export: true, editDashboard: true },
  error: { ...NONE, read: true, export: true, editDashboard: true },
  read_only_grace: READ_ONLY,
  pending_deletion: { ...NONE, read: true, export: true },
  deleted: NONE,
};

export function capabilities(state: SupervisionState): StateCapabilities {
  return CAPABILITIES[state];
}

/** États qui occupent un emplacement « actif » de l'offre. */
export function occupiesActiveSlot(state: SupervisionState): boolean {
  return state === "active" || state === "initializing";
}

/** États qui occupent un emplacement « en pause conservée ». */
export function occupiesPausedSlot(state: SupervisionState): boolean {
  return state === "paused";
}
