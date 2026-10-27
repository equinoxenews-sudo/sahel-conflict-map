"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { FLAG_COUNTRIES } from "@/lib/countryFlagIndex";
import { DEFAULT_SCHEDULE, DEFAULT_SOURCES, LIMITS, type Criteria, type Schedule, type SourceSpec, type SupervisionInput, type Zone } from "@/lib/supervision/model";
import { THEMES } from "@/lib/themes";
import styles from "./Supervision.module.css";

const SupervisionMap = dynamic(() => import("./SupervisionMap"), { ssr: false });

const LANGUAGES = [
  ["fr", "Français"],
  ["en", "Anglais"],
  ["ar", "Arabe"],
  ["es", "Espagnol"],
  ["pt", "Portugais"],
  ["ru", "Russe"],
  ["zh", "Chinois"],
] as const;

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const EMPTY_CRITERIA: Criteria = { themes: [], entities: [], keywords: [], exclusions: [], languages: ["fr", "en"] };

function TagInput({ label, hint, values, onChange }: { label: string; hint: string; values: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function commit() {
    const additions = draft
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (additions.length === 0) return;
    const known = new Set(values.map((value) => value.toLocaleLowerCase("fr-FR")));
    const merged = [...values];
    for (const addition of additions) {
      if (!known.has(addition.toLocaleLowerCase("fr-FR"))) {
        known.add(addition.toLocaleLowerCase("fr-FR"));
        merged.push(addition);
      }
    }
    onChange(merged.slice(0, LIMITS.maxTerms));
    setDraft("");
  }
  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    }
  }
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <div className={styles.chips}>
        {values.map((value) => (
          <span key={value} className={styles.tag}>
            {value}
            <button type="button" aria-label={`Retirer ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input className={styles.input} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKey} onBlur={commit} placeholder={hint} />
    </div>
  );
}

interface Props {
  initial?: SupervisionInput;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (input: SupervisionInput) => void;
  onCancel: () => void;
}

// Création ou modification d'une veille : on décrit le besoin, on choisit la zone, on règle les critères, les sources et le
// calendrier. Rien n'est caché : ce qui est enregistré est exactement ce qui est affiché ici.
export default function SupervisionForm({ initial, submitLabel, busy, error, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [userRequest, setUserRequest] = useState(initial?.userRequest ?? "");
  const [zoneKind, setZoneKind] = useState<"circle" | "countries">(initial?.zone.kind ?? "circle");
  const [circle, setCircle] = useState<{ lat: number | null; lon: number | null; radiusKm: number }>(
    initial?.zone.kind === "circle" ? { lat: initial.zone.lat, lon: initial.zone.lon, radiusKm: initial.zone.radiusKm } : { lat: null, lon: null, radiusKm: 150 },
  );
  const [codes, setCodes] = useState<string[]>(initial?.zone.kind === "countries" ? initial.zone.codes : []);
  const [countryFilter, setCountryFilter] = useState("");
  const [criteria, setCriteria] = useState<Criteria>(initial?.criteria ?? EMPTY_CRITERIA);
  const [sources, setSources] = useState<SourceSpec[]>(initial?.sources ?? DEFAULT_SOURCES);
  const [schedule, setSchedule] = useState<Schedule>(initial?.schedule ?? DEFAULT_SCHEDULE);
  const [feedDraft, setFeedDraft] = useState("");
  const [channelDraft, setChannelDraft] = useState("");

  const zone: Zone | null = useMemo(() => {
    if (zoneKind === "circle") return circle.lat !== null && circle.lon !== null ? { kind: "circle", lat: circle.lat, lon: circle.lon, radiusKm: circle.radiusKm } : null;
    return codes.length > 0 ? { kind: "countries", codes } : null;
  }, [zoneKind, circle, codes]);

  const visibleCountries = useMemo(() => {
    const needle = countryFilter.trim().toLocaleLowerCase("fr-FR");
    return FLAG_COUNTRIES.filter((country) => !needle || country.name.toLocaleLowerCase("fr-FR").includes(needle));
  }, [countryFilter]);

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  const sourceOn = (type: SourceSpec["type"]) => sources.some((source) => source.type === type && source.ref === "" && source.enabled);
  const setOwnSource = (type: SourceSpec["type"], on: boolean) => {
    const others = sources.filter((source) => !(source.type === type && source.ref === ""));
    setSources(on ? [...others, { type, ref: "", enabled: true }] : others);
  };
  const custom = (type: SourceSpec["type"]) => sources.filter((source) => source.type === type && source.ref !== "");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!zone) return;
    onSubmit({ name, userRequest, zone, criteria, sources, schedule });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>1 · Votre besoin</h3>
        <label className={styles.field}>
          <span>Nom de la veille</span>
          <input className={styles.input} value={name} maxLength={LIMITS.nameMax} onChange={(event) => setName(event.target.value)} placeholder="ex. El Fasher" required />
        </label>
        <label className={styles.field}>
          <span>Que voulez-vous surveiller ? (texte libre, à titre de mémo)</span>
          <textarea
            className={styles.textarea}
            value={userRequest}
            maxLength={LIMITS.requestMax}
            onChange={(event) => setUserRequest(event.target.value)}
            placeholder="ex. Événements sécuritaires et humanitaires autour d'El Fasher, au Soudan."
          />
        </label>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>2 · Périmètre</h3>
        <div className={styles.chips}>
          <button type="button" className={zoneKind === "circle" ? `${styles.chip} ${styles.chipOn}` : styles.chip} onClick={() => setZoneKind("circle")}>
            Cercle sur la carte
          </button>
          <button type="button" className={zoneKind === "countries" ? `${styles.chip} ${styles.chipOn}` : styles.chip} onClick={() => setZoneKind("countries")}>
            Pays
          </button>
        </div>
        {zoneKind === "circle" ? (
          <>
            <span className={styles.note}>Cliquez sur la carte pour placer le centre, puis réglez le rayon.</span>
            <div className={styles.pickMap}>
              <SupervisionMap zone={zone} onPick={(lat, lon) => setCircle((current) => ({ ...current, lat, lon }))} />
            </div>
            <label className={styles.field}>
              <span>
                Rayon : {circle.radiusKm} km{circle.lat !== null && circle.lon !== null ? ` · centre ${circle.lat}, ${circle.lon}` : " · centre non choisi"}
              </span>
              <input
                type="range"
                min={LIMITS.radiusMinKm}
                max={LIMITS.radiusMaxKm}
                step={5}
                value={circle.radiusKm}
                onChange={(event) => setCircle((current) => ({ ...current, radiusKm: Number(event.target.value) }))}
              />
            </label>
          </>
        ) : (
          <>
            <input className={styles.input} value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} placeholder="Rechercher un pays…" />
            <div className={styles.countries}>
              {visibleCountries.map((country) => (
                <label key={country.iso2}>
                  <input type="checkbox" checked={codes.includes(country.iso2)} onChange={() => setCodes((current) => toggle(current, country.iso2).slice(0, LIMITS.maxCountries))} />
                  {country.name}
                </label>
              ))}
            </div>
            <span className={styles.note}>{codes.length} pays choisi(s) (maximum {LIMITS.maxCountries}).</span>
          </>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>3 · Recherche</h3>
        <div className={styles.field}>
          <span>Thèmes (facultatif)</span>
          <div className={styles.chips}>
            {THEMES.map((theme) => (
              <button
                key={theme.key}
                type="button"
                className={criteria.themes.includes(theme.key) ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                onClick={() => setCriteria((current) => ({ ...current, themes: toggle(current.themes, theme.key) }))}
                title={theme.label}
              >
                {theme.short}
              </button>
            ))}
          </div>
        </div>
        <TagInput label="Entités (personnes, groupes, organisations)" hint="ex. RSF, JNIM — Entrée pour ajouter" values={criteria.entities} onChange={(entities) => setCriteria((current) => ({ ...current, entities }))} />
        <TagInput
          label="Mots-clés, expressions, variantes (toutes langues, translittérations)"
          hint="ex. El Fasher, الفاشر — Entrée pour ajouter"
          values={criteria.keywords}
          onChange={(keywords) => setCriteria((current) => ({ ...current, keywords }))}
        />
        <TagInput label="Exclusions" hint="ex. football, sport" values={criteria.exclusions} onChange={(exclusions) => setCriteria((current) => ({ ...current, exclusions }))} />
        <div className={styles.field}>
          <span>Langues de lecture</span>
          <div className={styles.chips}>
            {LANGUAGES.map(([code, label]) => (
              <button
                key={code}
                type="button"
                className={criteria.languages.includes(code) ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                onClick={() => setCriteria((current) => ({ ...current, languages: toggle(current.languages, code) }))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <span className={styles.note}>Il faut au moins un thème, une entité ou un mot-clé. Les mots sont comparés entiers, sans tenir compte des accents ni de la casse.</span>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>4 · Sources</h3>
        <label>
          <input type="checkbox" checked={sourceOn("gdelt")} onChange={(event) => setOwnSource("gdelt", event.target.checked)} /> Événements GDELT (collectés par Équinoxe)
        </label>
        <label>
          <input type="checkbox" checked={sourceOn("rss")} onChange={(event) => setOwnSource("rss", event.target.checked)} /> Flux de presse d&apos;Équinoxe
        </label>
        <label>
          <input type="checkbox" checked={sourceOn("telegram")} onChange={(event) => setOwnSource("telegram", event.target.checked)} /> Canaux Telegram d&apos;Équinoxe
        </label>
        <div className={styles.field}>
          <span>Ajouter un flux RSS (adresse)</span>
          <div className={styles.row}>
            <input className={styles.input} style={{ flex: 1 }} value={feedDraft} onChange={(event) => setFeedDraft(event.target.value)} placeholder="https://…/flux.xml" />
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                if (/^https?:\/\//i.test(feedDraft.trim())) {
                  setSources((current) => [...current, { type: "rss", ref: feedDraft.trim(), enabled: true }]);
                  setFeedDraft("");
                }
              }}
            >
              Ajouter
            </button>
          </div>
          <div className={styles.chips}>
            {custom("rss").map((source) => (
              <span key={source.ref} className={styles.tag}>
                {source.ref}
                <button type="button" aria-label="Retirer" onClick={() => setSources((current) => current.filter((item) => item !== source))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <span>Ajouter un canal Telegram public (identifiant, sans @)</span>
          <div className={styles.row}>
            <input className={styles.input} style={{ flex: 1 }} value={channelDraft} onChange={(event) => setChannelDraft(event.target.value)} placeholder="ex. nom_du_canal" />
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                if (/^[A-Za-z0-9_]{4,64}$/.test(channelDraft.trim())) {
                  setSources((current) => [...current, { type: "telegram", ref: channelDraft.trim(), enabled: true }]);
                  setChannelDraft("");
                }
              }}
            >
              Ajouter
            </button>
          </div>
          <div className={styles.chips}>
            {custom("telegram").map((source) => (
              <span key={source.ref} className={styles.tag}>
                {source.ref}
                <button type="button" aria-label="Retirer" onClick={() => setSources((current) => current.filter((item) => item !== source))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <span className={styles.note}>X, TikTok et Instagram ne sont pas collectés pour l&apos;instant : aucune source n&apos;est promise sans connecteur actif.</span>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>5 · Restitution</h3>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Heure souhaitée de la synthèse quotidienne</span>
            <select className={styles.select} value={schedule.dailyHour} onChange={(event) => setSchedule((current) => ({ ...current, dailyHour: Number(event.target.value) }))}>
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")} h
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Jour du récapitulatif hebdomadaire</span>
            <select className={styles.select} value={schedule.weeklyDay} onChange={(event) => setSchedule((current) => ({ ...current, weeklyDay: Number(event.target.value) }))}>
              {DAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span className={styles.note}>L&apos;heure est indicative : les traitements automatiques peuvent être décalés d&apos;une heure environ.</span>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy || !zone || name.trim().length < LIMITS.nameMin}>
          {busy ? "Enregistrement…" : submitLabel}
        </button>
        <button type="button" className={styles.ghost} onClick={onCancel}>
          Annuler
        </button>
        {!zone ? <span className={styles.note}>Choisissez d&apos;abord la zone à surveiller.</span> : null}
      </div>
    </form>
  );
}
