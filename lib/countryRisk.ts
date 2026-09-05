export type RiskTier = "critical" | "danger" | "watch";

export interface CountryRisk {
  tier: RiskTier;
  label: string;
}

export const RISK_COLORS: Record<RiskTier, string> = {
  critical: "#e53935", // rouge
  danger: "#fb8c00", // orange
  watch: "#fdd835", // jaune
};

export const RISK_LABELS: Record<RiskTier, string> = {
  critical: "Critique",
  danger: "Danger",
  watch: "À surveiller",
};

/**
 * Première version illustrative, établie manuellement à partir de l'actualité
 * générale (pas encore calculée depuis des données GDELT agrégées). À
 * remplacer par un score réel (nombre d'événements + gravité moyenne sur 30
 * jours) une fois le pipeline GDELT branché.
 *
 * Clés = code ISO 3166-1 alpha-3 (correspond à l'id des features du GeoJSON).
 */
export const COUNTRY_RISK: Record<string, CountryRisk> = {
  SDN: { tier: "critical", label: "Guerre civile (FSR / armée soudanaise)" },
  MLI: { tier: "critical", label: "Insurrection jihadiste, blocus de Bamako" },
  UKR: { tier: "critical", label: "Invasion russe en cours" },
  PSE: { tier: "critical", label: "Conflit Israël-Gaza" },
  YEM: { tier: "critical", label: "Guerre civile, conflit houthi" },
  MMR: { tier: "critical", label: "Guerre civile" },
  HTI: { tier: "critical", label: "Effondrement sécuritaire, violence des gangs" },
  COD: { tier: "critical", label: "Conflit M23 dans l'est du pays" },
  SOM: { tier: "critical", label: "Insurrection Al-Shabaab" },
  SYR: { tier: "critical", label: "Instabilité post-transition, violences sectaires" },

  BFA: { tier: "danger", label: "Insurrection jihadiste" },
  NER: { tier: "danger", label: "Insurrection jihadiste, instabilité post-coup" },
  TCD: { tier: "danger", label: "Instabilité régionale" },
  NGA: { tier: "danger", label: "Boko Haram / ISWAP, banditisme" },
  ETH: { tier: "danger", label: "Tensions Amhara / Tigré" },
  LBY: { tier: "danger", label: "Instabilité factionnelle" },
  CAF: { tier: "danger", label: "Groupes armés actifs" },
  COL: { tier: "danger", label: "Dissidences FARC, ELN" },
  MEX: { tier: "danger", label: "Violence des cartels" },
  PAK: { tier: "danger", label: "Insurrection TTP, tensions au Baloutchistan" },
  LBN: { tier: "danger", label: "Tensions Hezbollah / Israël" },

  KEN: { tier: "watch", label: "Tensions liées aux manifestations" },
  TUN: { tier: "watch", label: "Tensions politiques" },
  SEN: { tier: "watch", label: "Tensions post-électorales" },
  GTM: { tier: "watch", label: "Violence des gangs" },
  HND: { tier: "watch", label: "Violence des gangs" },
  IRQ: { tier: "watch", label: "Instabilité résiduelle" },
  IRN: { tier: "watch", label: "Tensions internes et régionales" },
  VEN: { tier: "watch", label: "Crise politique" },
  PHL: { tier: "watch", label: "Insurrection résiduelle à Mindanao" },
  IND: { tier: "watch", label: "Tensions au Manipur / Cachemire" },
  MOZ: { tier: "watch", label: "Insurrection à Cabo Delgado" },
  CMR: { tier: "watch", label: "Crise anglophone" },
};
