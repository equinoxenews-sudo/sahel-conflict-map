import { SOCIAL_PLATFORMS } from "@/lib/investigation/attributes";
import type { AttributeKind, SocialPlatform } from "@/lib/investigation/types";
import styles from "./AttributeIcon.module.css";

// Pastilles simplifiées, dessinées ici : monogramme ou pictogramme géométrique
// aux couleurs du réseau. Ce ne sont pas les logos officiels (marques déposées) ;
// ils pourront être remplacés plus tard par des logos fournis.
const TEXT_BADGE: Partial<Record<SocialPlatform, { text: string; size: number }>> = {
  facebook: { text: "f", size: 19 },
  linkedin: { text: "in", size: 13 },
  x: { text: "X", size: 15 },
  vk: { text: "VK", size: 11 },
  ok: { text: "OK", size: 11 },
  whatsapp: { text: "WA", size: 11 },
  bluesky: { text: "Bs", size: 12 },
  reddit: { text: "r/", size: 13 },
  github: { text: "GH", size: 11 },
  signal: { text: "S", size: 16 },
  other: { text: "•", size: 16 },
};

const SVG_COMMON = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true, focusable: false } as const;

function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  if (platform === "instagram") {
    return (
      <svg {...SVG_COMMON} fill="none" stroke="#fff" strokeWidth="2">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="0.9" fill="#fff" stroke="none" />
      </svg>
    );
  }
  if (platform === "telegram") {
    return (
      <svg {...SVG_COMMON} fill="#fff">
        <path d="M20.6 4 3.4 10.7l5.2 2 1.9 5.9 2.7-3.4 4.4 3.2z" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg {...SVG_COMMON} fill="none" stroke="#fff" strokeWidth="2">
        <rect x="3.5" y="6.5" width="17" height="11" rx="3.2" />
        <path d="M10.4 9.6v4.8l4.1-2.4z" fill="#fff" stroke="none" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg {...SVG_COMMON} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
        <path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2" />
        <path d="M14 4c.4 2.4 1.9 3.8 4.2 4" />
      </svg>
    );
  }
  const badge = TEXT_BADGE[platform] ?? TEXT_BADGE.other!;
  return (
    <span className={styles.glyph} style={{ fontSize: badge.size }}>
      {badge.text}
    </span>
  );
}

function PlainGlyph({ kind }: { kind: Exclude<AttributeKind, "social"> }) {
  switch (kind) {
    case "email":
      return <span className={styles.plainGlyph}>@</span>;
    case "identifier":
      return <span className={styles.plainGlyph}>#</span>;
    case "phone":
      return (
        <svg {...SVG_COMMON} fill="#111">
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
        </svg>
      );
    case "location":
      return (
        <svg {...SVG_COMMON} fill="#111">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      );
    case "website":
      return (
        <svg {...SVG_COMMON} fill="none" stroke="#111" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c3 3.2 3 13.8 0 17M12 3.5c-3 3.2-3 13.8 0 17" />
        </svg>
      );
  }
}

interface AttributeIconProps {
  kind: AttributeKind;
  platform?: SocialPlatform;
}

/** Pastille d'une coordonnée : blanche pour e-mail, téléphone et lieu, aux couleurs du réseau pour un compte. */
export default function AttributeIcon({ kind, platform }: AttributeIconProps) {
  if (kind === "social") {
    const key = platform ?? "other";
    return (
      <span className={styles.badge} style={{ background: SOCIAL_PLATFORMS[key].color }} title={SOCIAL_PLATFORMS[key].label}>
        <SocialGlyph platform={key} />
      </span>
    );
  }
  return (
    <span className={`${styles.badge} ${styles.plain}`}>
      <PlainGlyph kind={kind} />
    </span>
  );
}
