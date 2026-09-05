export const SAHEL_COUNTRIES = ["Mali", "Burkina Faso", "Niger", "Chad"] as const;
export type SahelCountry = (typeof SAHEL_COUNTRIES)[number];

export const EVENT_CATEGORIES = [
  "Battles",
  "Explosions/Remote violence",
  "Violence against civilians",
  "Protests",
  "Riots",
  "Strategic developments",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  Battles: "#e53935",
  "Explosions/Remote violence": "#fb8c00",
  "Violence against civilians": "#8e24aa",
  Protests: "#1e88e5",
  Riots: "#fdd835",
  "Strategic developments": "#43a047",
};

export interface ConflictEvent {
  id: number;
  external_id: string;
  event_date: string;
  country: SahelCountry | string;
  latitude: number;
  longitude: number;
  category: EventCategory | string;
  fatalities: number;
  source: string | null;
  notes?: string | null;
}
