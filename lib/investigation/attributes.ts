import type { AttributeKind, EntityAttribute, InvestigationEntity, SocialPlatform } from "./types";

export const SOCIAL_PLATFORMS: Record<SocialPlatform, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877f2" },
  instagram: { label: "Instagram", color: "#c13584" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  x: { label: "X (Twitter)", color: "#111111" },
  tiktok: { label: "TikTok", color: "#111111" },
  vk: { label: "VKontakte", color: "#0077ff" },
  ok: { label: "Odnoklassniki", color: "#ee8208" },
  telegram: { label: "Telegram", color: "#27a7e7" },
  youtube: { label: "YouTube", color: "#e62117" },
  whatsapp: { label: "WhatsApp", color: "#25d366" },
  bluesky: { label: "Bluesky", color: "#1185fe" },
  reddit: { label: "Reddit", color: "#ff4500" },
  github: { label: "GitHub", color: "#24292f" },
  signal: { label: "Signal", color: "#3a76f0" },
  other: { label: "Autre réseau", color: "#6b7785" },
};

const PROFILE_URL: Partial<Record<SocialPlatform, (handle: string) => string>> = {
  facebook: (h) => `https://www.facebook.com/${h}`,
  instagram: (h) => `https://www.instagram.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/in/${h}`,
  x: (h) => `https://x.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  vk: (h) => `https://vk.com/${h}`,
  ok: (h) => `https://ok.ru/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  bluesky: (h) => `https://bsky.app/profile/${h}`,
  reddit: (h) => `https://www.reddit.com/user/${h}`,
  github: (h) => `https://github.com/${h}`,
};

/** Adresse web http(s) valide, ou null : rien d'autre n'est jamais proposé comme lien. */
export function safeHttpUrl(text: string | undefined): string | null {
  if (!text?.trim()) return null;
  try {
    const url = new URL(text.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanHandle(value: string): string {
  return value.trim().replace(/^@+/, "");
}

/** Lien à ouvrir pour une coordonnée : l'adresse saisie, sinon celle déduite du pseudo. */
export function attributeLink(attribute: EntityAttribute): string | null {
  if (attribute.kind === "email") return attribute.value.includes("@") ? `mailto:${attribute.value.trim()}` : null;
  if (attribute.kind === "phone") {
    const digits = attribute.value.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : null;
  }
  const explicit = safeHttpUrl(attribute.url);
  if (explicit) return explicit;
  if (attribute.kind === "website") return safeHttpUrl(attribute.value);
  if (attribute.kind === "social" && attribute.platform) {
    const handle = cleanHandle(attribute.value);
    const build = PROFILE_URL[attribute.platform];
    if (handle && build) return safeHttpUrl(build(encodeURIComponent(handle)));
  }
  return null;
}

/** Clé de comparaison d'une coordonnée : deux fiches qui partagent la même clé
 * ont un point commun à examiner (même e-mail, même numéro, même compte). Null
 * pour ce qui ne se compare pas (un lieu n'est pas un pivot). */
export function pivotKey(attribute: EntityAttribute): string | null {
  const value = attribute.value.trim();
  if (!value) return null;
  switch (attribute.kind) {
    case "email":
      return `email:${value.toLowerCase()}`;
    case "phone": {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 6 ? `phone:${digits}` : null;
    }
    case "social": {
      const platform = attribute.platform ?? "other";
      const id = attribute.secondary?.trim();
      return id ? `social:${platform}:id:${id.toLowerCase()}` : `social:${platform}:${cleanHandle(value).toLowerCase()}`;
    }
    case "website": {
      const url = safeHttpUrl(value);
      return url ? `website:${new URL(url).host.replace(/^www\./, "")}${new URL(url).pathname.replace(/\/$/, "")}`.toLowerCase() : null;
    }
    case "identifier":
      return `identifier:${(attribute.label ?? "").trim().toLowerCase()}:${value.toLowerCase()}`;
    case "location":
      return null;
  }
}

export interface SharedValue {
  key: string;
  kind: AttributeKind;
  /** Valeur telle que saisie sur la première fiche, pour l'affichage. */
  value: string;
  entityIds: string[];
}

/** Valeurs présentes sur au moins deux fiches du dossier. */
export function findSharedValues(entities: Pick<InvestigationEntity, "id" | "attributes">[]): SharedValue[] {
  const byKey = new Map<string, SharedValue>();
  for (const entity of entities) {
    for (const attribute of entity.attributes ?? []) {
      const key = pivotKey(attribute);
      if (!key) continue;
      const known = byKey.get(key);
      if (!known) byKey.set(key, { key, kind: attribute.kind, value: attribute.value.trim(), entityIds: [entity.id] });
      else if (!known.entityIds.includes(entity.id)) known.entityIds.push(entity.id);
    }
  }
  return [...byKey.values()].filter((shared) => shared.entityIds.length >= 2);
}

export interface AttributeGroup {
  key: string;
  kind: AttributeKind;
  platform?: SocialPlatform;
  title: string;
  items: EntityAttribute[];
}

const KIND_ORDER: AttributeKind[] = ["email", "social", "phone", "website", "identifier", "location"];

/** Regroupe les coordonnées pour la fiche : un bloc par type, et un bloc par réseau social. */
export function groupAttributes(attributes: EntityAttribute[]): AttributeGroup[] {
  const groups = new Map<string, AttributeGroup>();
  for (const attribute of attributes) {
    if (!attribute.value.trim()) continue;
    const platform = attribute.kind === "social" ? (attribute.platform ?? "other") : undefined;
    const key = platform ? `social:${platform}` : attribute.kind;
    const existing = groups.get(key);
    if (existing) existing.items.push(attribute);
    else {
      const title =
        attribute.kind === "social"
          ? SOCIAL_PLATFORMS[platform ?? "other"].label
          : attribute.kind === "email"
            ? "E-mail"
            : attribute.kind === "phone"
              ? "Téléphone"
              : attribute.kind === "website"
                ? "Site web"
                : attribute.kind === "identifier"
                  ? "Identifiant"
                  : "Localisation";
      groups.set(key, { key, kind: attribute.kind, platform, title, items: [attribute] });
    }
  }
  return [...groups.values()].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/** Libellé court du type de partage, pour le trait entre deux fiches. */
export function sharedValueLabel(shared: SharedValue): string {
  switch (shared.kind) {
    case "email":
      return "Même e-mail";
    case "phone":
      return "Même téléphone";
    case "social":
      return "Même compte";
    case "website":
      return "Même site";
    default:
      return "Même identifiant";
  }
}
