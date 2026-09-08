export interface Article {
  title: string;
  url: string;
  domain: string | null;
  published_at: string | null;
  zone_slug?: string;
}
