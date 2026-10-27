"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/formatDate";
import { describeZone } from "@/lib/supervision/describe";
import type { Supervision, SupervisionInput } from "@/lib/supervision/model";
import { createSupervision, deleteSupervision, listSupervisions, setStatus, updateSupervision, type Overview } from "./api";
import SupervisionDetail from "./SupervisionDetail";
import SupervisionForm from "./SupervisionForm";
import styles from "./Supervision.module.css";

type View = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: string } | { kind: "detail"; id: string };

const TIER_LABELS: Record<string, string> = { owner: "Fondateur", intelligence: "Intelligence", pro: "Pro", enterprise: "Enterprise" };

// Supervision : les veilles du compte (une seule active pour l'offre Intelligence, trois pour Pro). Création guidée,
// activation, collecte, carte, flux et retours. Les données viennent des routes /api/supervision, filtrées par compte.
export default function SupervisionApp() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Supervision | null>(null);

  const reload = useCallback(async () => {
    try {
      setOverview(await listSupervisions());
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Supervision indisponible.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listSupervisions()
      .then((body) => {
        if (!cancelled) setOverview(body);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Supervision indisponible.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const supervisions = overview?.supervisions ?? [];
  const activeCount = supervisions.filter((item) => item.status === "active").length;
  const limit = overview?.activeLimit ?? 0;
  const find = (id: string) => supervisions.find((item) => item.id === id) ?? null;

  async function save(input: SupervisionInput, id?: string) {
    setBusy(true);
    setError(null);
    try {
      const { supervision } = id ? await updateSupervision(id, input) : await createSupervision(input);
      await reload();
      setView({ kind: "detail", id: supervision.id });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: Supervision, status: "active" | "paused") {
    setBusy(true);
    setError(null);
    try {
      await setStatus(item.id, status);
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Changement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Supervision) {
    setBusy(true);
    try {
      await deleteSupervision(item.id);
      setConfirmDelete(null);
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (view.kind === "new") {
    return (
      <div className={styles.wrap}>
        <SupervisionForm submitLabel="Créer la veille" busy={busy} error={error} onSubmit={(input) => void save(input)} onCancel={() => setView({ kind: "list" })} />
      </div>
    );
  }

  const editing = view.kind === "edit" ? find(view.id) : null;
  if (view.kind === "edit" && editing) {
    const { name, userRequest, zone, criteria, sources, schedule } = editing;
    return (
      <div className={styles.wrap}>
        <SupervisionForm
          initial={{ name, userRequest, zone, criteria, sources, schedule }}
          submitLabel="Enregistrer"
          busy={busy}
          error={error}
          onSubmit={(input) => void save(input, editing.id)}
          onCancel={() => setView({ kind: "detail", id: editing.id })}
        />
      </div>
    );
  }

  const current = view.kind === "detail" ? find(view.id) : null;
  if (view.kind === "detail" && current) {
    return <SupervisionDetail supervision={current} onBack={() => setView({ kind: "list" })} onEdit={() => setView({ kind: "edit", id: current.id })} />;
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        Une veille sur mesure : vous décrivez ce que vous voulez suivre, vous choisissez la zone, et le site ne garde que les publications qui la concernent, avec la raison pour chacune. Rien n&apos;est inventé : une publication sans lieu connu reste dans le flux, sans point sur la carte.
      </p>
      <div className={styles.bar}>
        <button type="button" className={styles.primary} onClick={() => setView({ kind: "new" })} disabled={!overview || limit === 0}>
          Nouvelle veille
        </button>
        {overview ? (
          <span className={styles.note}>
            Offre {TIER_LABELS[overview.tier] ?? overview.tier} : {activeCount} veille{activeCount > 1 ? "s" : ""} active{activeCount > 1 ? "s" : ""} sur {limit} possible{limit > 1 ? "s" : ""}.
          </span>
        ) : null}
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      {!overview && !error ? <div className={styles.empty}>Chargement…</div> : null}
      {overview && supervisions.length === 0 ? <div className={styles.empty}>Aucune veille pour l&apos;instant. Créez la première : un nom, une zone, quelques mots-clés.</div> : null}

      <div className={styles.cards}>
        {supervisions.map((item) => (
          <div key={item.id} className={styles.card}>
            <h3 className={styles.cardTitle}>{item.name}</h3>
            <span className={`${styles.badge} ${item.status === "active" ? styles.badgeActive : styles.badgePaused}`}>
              {item.status === "active" ? "Active" : item.status === "paused" ? "Suspendue" : "Brouillon"}
            </span>
            <p className={styles.meta}>{describeZone(item.zone)}</p>
            <p className={styles.meta}>
              {[...item.criteria.entities, ...item.criteria.keywords].slice(0, 6).join(", ") || "Thèmes seulement"}
              {item.lastRunAt ? ` · dernière collecte ${formatDate(item.lastRunAt)}` : ""}
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={() => setView({ kind: "detail", id: item.id })}>
                Ouvrir
              </button>
              {item.status === "active" ? (
                <button type="button" className={styles.button} disabled={busy} onClick={() => void changeStatus(item, "paused")}>
                  Suspendre
                </button>
              ) : (
                <button type="button" className={styles.button} disabled={busy} onClick={() => void changeStatus(item, "active")}>
                  Activer
                </button>
              )}
              <button type="button" className={styles.danger} disabled={busy} onClick={() => setConfirmDelete(item)}>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmDelete ? (
        <div className={styles.error} role="alertdialog">
          <p style={{ margin: "0 0 8px" }}>
            Supprimer la veille « {confirmDelete.name} » et ses résultats ? La place est libérée, mais le budget IA du mois n&apos;est pas remis à zéro.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => setConfirmDelete(null)}>
              Annuler
            </button>
            <button type="button" className={styles.danger} disabled={busy} onClick={() => void remove(confirmDelete)}>
              Supprimer définitivement
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
