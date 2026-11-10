"use client";

import { createContext, useContext } from "react";
import { GEONAMES_ATTRIBUTION } from "@/lib/supervision/geo/gazetteer";
import { PRIORITY_LABELS, VERIFICATION_LABELS, type BoardEvent } from "@/lib/supervision/dashboard/fixtures";
import NotesPanel, { useNotesScope } from "./NotesPanel";
import styles from "./Lab.module.css";

// « Sources et preuves » d'un événement (cahier des charges, Lot 3) : tout ce que l'on sait de lui, d'où ça vient, et ce que ça ne prouve pas.
// Le tableau fournit une fonction d'ouverture STABLE par contexte : un module qui l'appelle ne se redessine pas pour autant.

export const OpenEventContext = createContext<(event: BoardEvent) => void>(() => {});
export const useOpenEvent = () => useContext(OpenEventContext);

const THEME_LABEL: Record<BoardEvent["theme"], string> = { conflits: "Conflits", securite: "Sécurité", politique: "Politique", humanitaire: "Humanitaire" };

const KIND_LABEL = { article: "Article analysé", signal: "Signalement médiatique", publication: "Publication de presse" } as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function verificationNote(event: BoardEvent): string {
  if (event.kind === "publication") return "Publication de presse repérée par la recherche de cette Supervision. Elle n'est pas vérifiée : son contenu est celui de l'éditeur, pas un fait établi.";
  if (event.kind === "signal") {
    return "Un signalement médiatique est un signal repéré dans la presse, pas un fait établi. Le nombre de publications n'est pas un indice de véracité : il ne fait jamais passer un signalement à « confirmé ».";
  }
  if (event.kind === "article") {
    return "Seul « Confirmé » dans l'analyse de l'article donne le statut confirmé. Tout autre qualificatif (très probable, revendiqué, possible, peu probable, non confirmé) reste un signalement et s'affiche tel quel : c'est un jugement de probabilité, pas une recoupe de sources indépendantes. « Corroboré » et « contesté » ne sont pas déduits.";
  }
  return "Donnée de démonstration.";
}

function priorityNote(event: BoardEvent): string {
  if (event.kind === "publication") return "Pas de classement de priorité : le tri par IA n'est pas activé, toutes les publications sont au niveau information.";
  if (event.kind === "signal") return "Violent et très repris : critique à partir de 20 mentions, importante à partir de 6 ; sinon information.";
  if (event.kind === "article") return "Importance « haute » de l'analyse ; critique seulement si l'événement est violent (affrontement, frappe, attentat). Règle provisoire.";
  return "";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function EventDetailPanel({ event, onClose }: { event: BoardEvent | null; onClose: () => void }) {
  const notesScope = useNotesScope();
  return (
    <aside className={styles.panel} aria-label="Sources et preuves" data-open={event ? "" : undefined} inert={!event}>
      {event ? (
        <>
          <div className={styles.panelHead}>
            <h2>{event.kind ? KIND_LABEL[event.kind] : "Événement"}</h2>
            <button type="button" className={styles.iconBtn} aria-label="Fermer" onClick={onClose}>✕</button>
          </div>
          <h3 className={styles.detailTitle}>{event.title}</h3>
          <dl className={styles.detailList}>
            <dt>Date</dt>
            <dd>{dateFormat.format(new Date(event.at))}</dd>
            <dt>Thème</dt>
            <dd>{THEME_LABEL[event.theme]}</dd>
            <dt>Priorité</dt>
            <dd>
              {PRIORITY_LABELS[event.priority]}
              {priorityNote(event) ? <span className={styles.muted}> — {priorityNote(event)}</span> : null}
            </dd>
            <dt>Vérification</dt>
            <dd>
              {VERIFICATION_LABELS[event.verification]}
              {event.qualifier ? <span> · {event.qualifier}</span> : null}
              <span className={styles.muted}> — {verificationNote(event)}</span>
            </dd>
            <dt>Lieu</dt>
            <dd>
              {event.place}
              {event.lat !== undefined && event.lon !== undefined ? <span className={styles.muted}> — {event.lat.toFixed(2)}, {event.lon.toFixed(2)} ({event.geo ? `déduite du nom « ${event.geo.name} » cité dans le texte, précision ${event.geo.precision === "ville" ? "localité" : "région"}` : "position approximative"})</span> : <span className={styles.muted}> — pas de position retrouvée</span>}
            </dd>
            <dt>Publications</dt>
            <dd>
              {event.publications}
              {event.merged ? <span className={styles.muted}> — regroupe {event.merged + 1} entrées qui citent la même publication</span> : null}
            </dd>
          </dl>
          {event.summary ? (
            <>
              <h4 className={styles.h4}>Résumé</h4>
              <p>{event.summary}</p>
            </>
          ) : null}
          {event.reason ? (
            <>
              <h4 className={styles.h4}>Pourquoi cette publication est ici</h4>
              <p>{event.reason}</p>
            </>
          ) : null}
          <h4 className={styles.h4}>Source</h4>
          {event.url ? (
            <p>
              <a href={event.url} target="_blank" rel="noopener noreferrer" className={styles.detailLink}>{hostOf(event.url)} ↗</a>
              <span className={styles.muted}> — s&apos;ouvre dans un nouvel onglet</span>
            </p>
          ) : (
            <p className={styles.muted}>Aucune adresse de source enregistrée pour cet élément.</p>
          )}
          {event.geo ? <p className={styles.muted}>{GEONAMES_ATTRIBUTION}. La position est déduite automatiquement d&apos;un nom de lieu du texte, sans IA : elle peut être imprécise.</p> : null}
          {notesScope ? (
            <>
              <h4 className={styles.h4}>Mes notes</h4>
              <NotesPanel key={event.id} eventRef={event.id} eventTitle={event.title} compact />
            </>
          ) : null}
          {event.domains && event.domains.length > 0 ? <p className={styles.muted}>Domaines : {event.domains.join(", ")}</p> : null}
          <p className={styles.muted}>Équinoxe affiche ce qui a été retrouvé ; il ne garantit ni l&apos;exhaustivité ni l&apos;exactitude de la source citée.</p>
        </>
      ) : null}
    </aside>
  );
}
