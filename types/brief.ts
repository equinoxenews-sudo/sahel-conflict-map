export interface BriefSection {
  heading: string | null;
  body: string;
}

export interface ZoneBrief {
  id: number;
  zone_slug: string;
  title: string;
  /** Ancienne catégorie ACLED-like, conservée pour les synthèses antérieures. */
  category: string | null;
  primary_theme: string | null;
  secondary_themes: string[] | null;
  event_type: string | null;
  importance: string | null;
  veracity: string | null;
  summary: string;
  /** Only fetched on the brief detail page — list views only need `summary`. */
  sections?: BriefSection[] | null;
  source_urls: string[];
  source_domains: string[];
  image_url: string | null;
  published_at: string | null;
  updated_at?: string | null;
}
