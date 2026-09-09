export interface ZoneBrief {
  id: number;
  zone_slug: string;
  title: string;
  summary: string;
  source_urls: string[];
  source_domains: string[];
  image_url: string | null;
  published_at: string | null;
}
