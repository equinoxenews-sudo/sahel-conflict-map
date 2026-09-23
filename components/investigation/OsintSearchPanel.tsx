"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import SearchBar from "@/components/investigation/SearchBar";
import {
  buildConnectorUrl,
  CATEGORY_LABELS,
  CONNECTOR_MODE_LABELS,
  connectorsForInputType,
  type Connector,
  type InputType,
} from "@/lib/investigation/connectors";
import { useDossiers, useInvestigationStorage } from "@/lib/investigation/InvestigationContext";
import styles from "./OsintSearchPanel.module.css";

function badgeClass(mode: Connector["mode"]): string {
  if (mode === "external_link") return styles.badgeExternal;
  if (mode === "manual_import") return styles.badgeManual;
  return styles.badgeIntegration;
}

export default function OsintSearchPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dossiers = useDossiers();
  const storage = useInvestigationStorage();
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const type = (searchParams.get("type") as InputType) || "keyword";
  const query = searchParams.get("q") ?? "";
  const activeDossierId = selectedDossierId ?? dossiers[0]?.id ?? "";

  function handleSearch(newType: InputType, newQuery: string) {
    router.push(`/investigation/recherche?type=${newType}&q=${encodeURIComponent(newQuery)}`);
  }

  function handleSave(connector: Connector) {
    if (!activeDossierId) return;
    storage.addSource({
      dossierId: activeDossierId,
      title: `${connector.name} — ${query}`,
      url: buildConnectorUrl(connector, query),
      platform: CATEGORY_LABELS[connector.category],
      publishedAt: null,
      collectedAt: new Date().toISOString(),
      summary: "",
      tags: [],
      reliability: 3,
      notes: "",
      claimType: "observed",
    });
    const dossierName = dossiers.find((d) => d.id === activeDossierId)?.name ?? "";
    setToast(`Source enregistrée dans « ${dossierName} ».`);
    setTimeout(() => setToast(null), 2500);
  }

  const results = query.trim() ? connectorsForInputType(type) : [];

  return (
    <div className={styles.wrap}>
      <div className={styles.searchWrap}>
        <SearchBar initialType={type} initialQuery={query} onSearch={handleSearch} />
      </div>

      {query.trim() && (
        <div className={styles.controls}>
          <span className={styles.controlsLabel}>Enregistrer les sources dans :</span>
          {dossiers.length === 0 ? (
            <Link href="/investigation/dossiers" className={styles.controlsLabel} style={{ color: "var(--accent-gold-bright)" }}>
              Créer un dossier d&apos;abord →
            </Link>
          ) : (
            <select
              className={styles.dossierSelect}
              value={activeDossierId}
              onChange={(e) => setSelectedDossierId(e.target.value)}
            >
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {query.trim() ? (
        <>
          <div className={styles.count}>
            {results.length} outil{results.length > 1 ? "s" : ""} pertinent{results.length > 1 ? "s" : ""} pour «{" "}
            {query} »
          </div>
          <div className={styles.grid}>
            {results.map((connector) => (
              <div key={connector.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <div className={styles.cardName}>{connector.name}</div>
                    <div className={styles.cardCategory}>{CATEGORY_LABELS[connector.category]}</div>
                  </div>
                  <span className={`${styles.badge} ${badgeClass(connector.mode)}`}>
                    {CONNECTOR_MODE_LABELS[connector.mode]}
                  </span>
                </div>
                {connector.limits && <div className={styles.limits}>{connector.limits}</div>}
                <div className={styles.actions}>
                  <a
                    href={buildConnectorUrl(connector, query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.openBtn}
                  >
                    Ouvrir
                  </a>
                  <button
                    type="button"
                    className={styles.saveBtn}
                    disabled={!activeDossierId}
                    onClick={() => handleSave(connector)}
                  >
                    Enregistrer comme source
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          Choisissez un type d&apos;entrée et lancez une recherche pour voir les outils OSINT pertinents.
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
