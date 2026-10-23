// Index statique de la recherche : les pays (une fiche chacun) et les acteurs cités dans les fiches pays.
// Réservé au serveur (les fiches pèsent plusieurs centaines de Ko) ; construit une seule fois par instance.
import { COUNTRY_PROFILES_LIST } from "./countries";
import { getResolvedCountryProfile } from "./countryOverlays";
import { indexEntry, normalizeQuery, searchIndex, type EntityTypeLabelKey, type IndexEntry, type SearchResult } from "./search";
import { getZone } from "./zones";

const ACTOR_LABELS: Record<EntityTypeLabelKey, string> = {
  Government: "Institution",
  Military: "Forces armées",
  Organization: "Organisation",
  "Armed group": "Groupe armé",
  "Foreign actor": "Acteur étranger",
};

function countryHref(zoneSlug: string, slug: string): string {
  return `/zones/${zoneSlug}/approche/pays/${slug}`;
}

function buildIndex(): { countries: IndexEntry[]; entities: IndexEntry[] } {
  const countries: IndexEntry[] = [];
  const entities: IndexEntry[] = [];
  const seenActors = new Set<string>();
  const countryNames = new Set(COUNTRY_PROFILES_LIST.map((profile) => normalizeQuery(profile.name)));

  for (const base of COUNTRY_PROFILES_LIST) {
    const profile = getResolvedCountryProfile(base.slug) ?? base;
    const zone = getZone(profile.zoneSlug);
    const href = countryHref(profile.zoneSlug, profile.slug);
    countries.push(
      indexEntry(
        {
          kind: "pays",
          label: "Pays",
          title: profile.name,
          detail: `Fiche pays${zone ? ` · ${zone.name}` : ""}`,
          href,
          iso2: profile.iso2,
        },
        [profile.officialName, profile.capital].filter(Boolean).join(" ")
      )
    );

    const actors = [profile.keyActors, profile.politics?.actors, profile.security?.armedActors, profile.security?.foreignPresence];
    for (const list of actors) {
      for (const actor of list ?? []) {
        const key = normalizeQuery(actor.name);
        // « Gouvernement de Mali » (modèle générique) et les États (déjà dans « Pays ») n'apportent rien ici.
        if (!key || seenActors.has(key) || /^gouvernement de /.test(key) || countryNames.has(key)) continue;
        seenActors.add(key);
        entities.push(
          indexEntry(
            {
              kind: "entites",
              label: ACTOR_LABELS[actor.type] ?? "Entité",
              title: actor.name,
              detail: [actor.role, profile.name].filter(Boolean).join(" · "),
              href,
              iso2: profile.iso2,
            },
            profile.name
          )
        );
      }
    }
  }
  return { countries, entities };
}

let cache: ReturnType<typeof buildIndex> | null = null;

function index() {
  cache ??= buildIndex();
  return cache;
}

export function searchCountries(query: string, limit = 8): SearchResult[] {
  return searchIndex(index().countries, query, limit);
}

export function searchEntities(query: string, limit = 8): SearchResult[] {
  return searchIndex(index().entities, query, limit);
}
