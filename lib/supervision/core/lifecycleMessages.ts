// Supervision V1, Lot 6a : messages affichés quand une action de cycle de vie (activer, pause, reprise, suppression) est refusée.
// Module PUR et testé : chaque code d'échec du serveur a une phrase claire, jamais un code brut.

const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function lifecycleMessage(code: string | undefined, detail: Record<string, unknown> = {}): string {
  const limit = typeof detail.limit === "number" ? detail.limit : null;
  const plural = (count: number | null) => (count !== null && count > 1 ? "s" : "");
  switch (code) {
    case "active_limit_reached":
      return limit !== null ? `Tu as déjà ${limit} Supervision${plural(limit)} active${plural(limit)} : mets-en une en pause avant d'en activer une autre.` : "Le nombre de Supervisions actives autorisé est atteint : mets-en une en pause d'abord.";
    case "paused_limit_reached":
      return limit !== null ? `Tu as déjà ${limit} Supervision${plural(limit)} en pause : reprends-en une avant d'en mettre une autre en pause.` : "Le nombre de Supervisions en pause autorisé est atteint : reprends-en une d'abord.";
    case "credit_exhausted": {
      const next = typeof detail.next_eligible_at === "string" ? new Date(detail.next_eligible_at) : null;
      return next && !Number.isNaN(next.getTime()) ? `Plus de crédit de création disponible : prochaine activation possible à partir du ${date.format(next)}.` : "Plus de crédit de création disponible pour l'instant.";
    }
    case "access_denied":
      return "Ton offre ne permet pas cette action.";
    case "read_only":
      return "Cette Supervision est en lecture seule.";
    case "invalid_state":
      return "L'état de cette Supervision a changé entre-temps : recharge la page.";
    case "activation_failed": {
      const reason = typeof detail.reason === "string" && detail.reason.length > 0 ? ` (${detail.reason})` : "";
      return `La première collecte a échoué${reason}. Rien n'a été consommé et la Supervision est restée un brouillon : réessaie dans un instant.`;
    }
    case "already_running":
      return "Une collecte est déjà en cours : réessaie dans un instant.";
    case "cancelled":
      return "Cette tentative d'activation avait été annulée : recommence.";
    case "idempotency_conflict":
      return "Cette opération a déjà été utilisée pour une autre Supervision : recharge la page.";
    case "not_found":
      return "Cette Supervision est introuvable.";
    case "locked":
      return "Connexion requise.";
    case "forbidden":
      return "Cette rubrique n'est pas ouverte à ton offre.";
    default:
      return "L'opération a échoué. Réessaie dans un instant.";
  }
}
