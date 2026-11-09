"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import { OBJECTIVES, NAME_MAX, NAME_MIN } from "@/lib/supervision/core/scope";
import styles from "./Supervision.module.css";

export const STATE_LABELS: Record<string, string> = {
  draft: "Brouillon",
  initializing: "Initialisation",
  active: "Active",
  paused: "En pause",
  error: "Erreur",
  read_only_grace: "Lecture seule",
  pending_deletion: "Suppression en cours",
  deleted: "Supprimée",
};

interface Item {
  id: string;
  name: string;
  state: string;
  createdAt: string;
}

interface ListResponse {
  supervisions: Item[];
  access: { plan: string; mode: string; activeLimit: number; pausedLimit: number; creditLimit: number | null };
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function SupervisionList() {
  const router = useRouter();
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("BEN");
  const [objective, setObjective] = useState<string>("securite");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/supervision", { cache: "no-store" });
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) setError(body.error ?? "Chargement impossible.");
        else setData(body as ListResponse);
      } catch {
        if (!cancelled) setError("Chargement impossible : réseau indisponible.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const response = await fetch("/api/supervision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, country, objective }) });
      const body = await response.json();
      if (!response.ok) {
        setFormError(body.code === "draft_limit_reached" ? "Trop de brouillons : ouvre-en un ou supprime-en un avant d'en créer un autre." : (body.errors?.join(" ") ?? body.error ?? "Création impossible."));
        return;
      }
      router.push(`/mon-espace/supervision/${body.id}`);
    } catch {
      setFormError("Création impossible : réseau indisponible.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>Supervision</h1>
        {data ? (
          <span className={styles.muted}>
            Offre « {data.access.plan} » · {data.access.activeLimit} active{data.access.activeLimit > 1 ? "s" : ""} et {data.access.pausedLimit} en pause maximum
          </span>
        ) : null}
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!data && !error ? <p className={styles.muted}>Chargement…</p> : null}

      {data ? (
        data.supervisions.length === 0 ? (
          <p className={styles.muted}>Aucune Supervision pour l&apos;instant : crée la première ci-dessous.</p>
        ) : (
          <div className={styles.grid}>
            {data.supervisions.map((item) => (
              <Link key={item.id} href={`/mon-espace/supervision/${item.id}`} className={styles.card}>
                <strong>{item.name}</strong>
                <span className={styles.badge} data-state={item.state}>{STATE_LABELS[item.state] ?? item.state}</span>
                <span className={styles.muted}>Créée le {dateFormat.format(new Date(item.createdAt))}</span>
              </Link>
            ))}
          </div>
        )
      ) : null}

      <form className={styles.form} onSubmit={create}>
        <h2>Nouvelle Supervision</h2>
        <p className={styles.muted}>Créée en brouillon : elle ne consomme aucun crédit. Tu construis son tableau de bord tout de suite ; l&apos;activation (collecte dédiée) viendra avec le moteur de veille.</p>
        <label className={styles.field}>
          <span>Nom</span>
          <input value={name} onChange={(event) => setName(event.target.value)} minLength={NAME_MIN} maxLength={NAME_MAX} required placeholder="Ex. Nord Bénin" />
        </label>
        <label className={styles.field}>
          <span>Pays principal</span>
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            {COUNTRY_CODES.map((entry) => (
              <option key={entry.iso3} value={entry.iso3}>{entry.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Objectif de la veille</span>
          <select value={objective} onChange={(event) => setObjective(event.target.value)}>
            {OBJECTIVES.map((entry) => (
              <option key={entry.key} value={entry.key}>{entry.label}</option>
            ))}
          </select>
        </label>
        {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
        <button type="submit" className={styles.primary} disabled={creating || name.trim().length < NAME_MIN}>
          {creating ? "Création…" : "Créer et ouvrir le tableau de bord"}
        </button>
      </form>
    </div>
  );
}
