import Link from "next/link";
import styles from "./ZoneSubNav.module.css";

interface ZoneSubNavProps {
  zoneSlug: string;
  active: "overview" | "approche" | "actualite" | "analyse" | "cartographie";
}

export default function ZoneSubNav({ zoneSlug, active }: ZoneSubNavProps) {
  const items = [
    { key: "overview", label: "Vue d'ensemble", href: `/zones/${zoneSlug}`, icon: <IconHome /> },
    { key: "approche", label: "Approche", href: `/zones/${zoneSlug}/approche`, icon: <IconLayers /> },
    { key: "actualite", label: "Actualités", href: `/zones/${zoneSlug}/actualite`, icon: <IconNewspaper /> },
    { key: "analyse", label: "Analyses", href: `/zones/${zoneSlug}/analyse`, icon: <IconChart /> },
    // No dedicated map route exists yet — the real map is embedded in the
    // Actualités tab (components/MapView.tsx inside [tab]/page.tsx), so
    // "Cartographie" points there rather than inventing a new route.
    { key: "cartographie", label: "Cartographie", href: `/zones/${zoneSlug}/actualite`, icon: <IconMap /> },
  ] as const;

  return (
    <nav className={styles.nav}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={item.key === active ? `${styles.item} ${styles.itemActive}` : styles.item}
        >
          <span className={styles.icon}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  width: 15,
  height: 15,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconHome() {
  return (
    <svg {...iconProps}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg {...iconProps}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

function IconNewspaper() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M7 8.5h6M7 12h10M7 15.5h10" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg {...iconProps}>
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
