"use client";

import { useState } from "react";
import styles from "./ToolCard.module.css";

interface DomainLink {
  label: string;
  build: (domain: string) => string;
  note: string;
}

// A browser page can't fetch an arbitrary third-party domain's robots.txt/
// certificates/etc. directly (CORS) — these are navigation links to the
// target or to a dedicated public tool, not in-app requests.
const LINKS: DomainLink[] = [
  { label: "robots.txt", build: (d) => `https://${d}/robots.txt`, note: "Ouvre directement le fichier du domaine." },
  { label: "sitemap.xml", build: (d) => `https://${d}/sitemap.xml`, note: "Ouvre directement le fichier du domaine." },
  {
    label: "RDAP (ICANN Lookup)",
    build: (d) => `https://lookup.icann.org/en/lookup?q=${encodeURIComponent(d)}`,
    note: "Registre officiel du nom de domaine.",
  },
  {
    label: "Certificats TLS (crt.sh)",
    build: (d) => `https://crt.sh/?q=${encodeURIComponent(d)}`,
    note: "Journaux de transparence des certificats — révèle souvent des sous-domaines.",
  },
  {
    label: "Archives (Wayback Machine)",
    build: (d) => `https://web.archive.org/web/*/${d}`,
    note: "Versions archivées dans le temps.",
  },
  {
    label: "Blacklight (traceurs et vie privée)",
    build: (d) => `https://themarkup.org/blacklight?url=${encodeURIComponent(`https://${d}`)}`,
    note: "Scan public de traceurs publicitaires/analytics sur la page.",
  },
];

export default function DomainLinksPanel() {
  const [domain, setDomain] = useState("");
  const cleaned = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <div className={styles.card}>
      <span className={styles.title}>Analyse de domaine — liens rapides</span>
      <p className={styles.desc}>
        Le navigateur ne peut pas inspecter directement un domaine tiers (CORS) — ces liens ouvrent le domaine ou un
        outil public dédié dans un nouvel onglet.
      </p>

      <input
        className={styles.dropZone}
        style={{ cursor: "text", textAlign: "left" }}
        placeholder="exemple.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />

      {cleaned && (
        <table className={styles.metaTable}>
          <tbody>
            {LINKS.map((l) => (
              <tr key={l.label}>
                <td>
                  <a
                    href={l.build(cleaned)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--status-info)" }}
                  >
                    {l.label}
                  </a>
                </td>
                <td>{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className={styles.desc}>
        <strong style={{ color: "var(--accent-gold-bright)" }}>PageXray</strong> (analyse technique de page — temps
        de chargement, ressources tierces) est un outil en ligne de commande, sans recherche par domaine hébergée
        publiquement — voir{" "}
        <a href="https://github.com/sitespeedio/pagexray" target="_blank" rel="noopener noreferrer" style={{ color: "var(--status-info)" }}>
          sitespeedio/pagexray
        </a>
        .
      </p>

      <p className={styles.desc} style={{ opacity: 0.6 }}>
        Emplacement réservé : capture/OCR de page via une future extension de navigateur Équinoxe — pas encore
        disponible.
      </p>
    </div>
  );
}
